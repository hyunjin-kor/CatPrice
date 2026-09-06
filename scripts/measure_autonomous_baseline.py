"""Measure offline API and paper-analysis latency against an isolated database."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import statistics
import subprocess
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=ROOT / "docs/audit/t02-performance-baseline.json")
    args = parser.parse_args()
    history = ROOT / "docs/paper/price_history_2026-09-02.json"

    with tempfile.TemporaryDirectory(prefix="comet-performance-") as temporary:
        task_dir = Path(temporary)
        os.environ["DATABASE_URL"] = "sqlite:///" + (task_dir / "measure.db").as_posix()

        from fastapi.testclient import TestClient
        from sqlmodel import Session

        import backend.main as main_module
        from backend.core.price_fetcher import get_reference_prices
        from backend.core.reference_basis import (
            build_price_basis,
            latest_common_month,
            monthly_average,
        )
        from backend.database import engine
        from backend.models.metal_price import MetalPrice

        series = json.loads(history.read_text(encoding="utf-8"))["series"]
        series = {
            symbol: {**entry, "points": monthly_average(entry["points"], exclude_month="2026-09")}
            for symbol, entry in series.items()
        }
        month = latest_common_month(series)
        basis = build_price_basis(series, month, get_reference_prices())
        basis_file = task_dir / "reference_basis.json"
        basis_file.write_text(json.dumps({"price_basis": basis}), encoding="utf-8")

        async def offline(source: str | None = None) -> dict:
            return {}

        main_module.collect_prices = offline
        calculation = {
            "catalyst_domain": "thermal",
            "price_basis": "reference",
            "order_size_tons": 20.0,
            "steps": ["mixer_slurry", "incipient_wetness", "dryer_rotary_100_300C"],
            "components": [
                {"role": "active_metal", "material_key": "lit:usgs-platinum-bullion-2025", "wt_pct": 2.0},
                {"role": "support", "material_key": "lit:usgs-alumina-2025", "wt_pct": 98.0},
            ],
        }
        measurements: dict = {}
        with TestClient(main_module.app) as client:
            with Session(engine) as session:
                for symbol, entry in basis.items():
                    if symbol in series:
                        session.add(MetalPrice(
                            symbol=symbol, name=entry.get("name", symbol), price=entry["price"],
                            unit=entry["unit"], source=entry["source"], basis="reference",
                            fetched_at=datetime.fromisoformat(entry["fetched_at"]),
                        ))
                session.commit()
            warmup = client.post("/api/calculate", json=calculation)
            warmup.raise_for_status()
            elapsed = []
            for _ in range(20):
                start = time.perf_counter()
                response = client.post("/api/calculate", json=calculation)
                elapsed.append(time.perf_counter() - start)
                response.raise_for_status()
            measurements["calculate"] = {
                "requests": 20, "warmup_requests": 1,
                "median_seconds": statistics.median(elapsed), "samples_seconds": elapsed,
                "result_price_per_lb": response.json()["summary"]["estimated_price_per_lb"],
            }
            for count in (1000, 10000):
                start = time.perf_counter()
                response = client.post("/api/uncertainty", json={
                    "calculation_input": calculation, "n_simulations": count, "seed": 42,
                })
                seconds = time.perf_counter() - start
                response.raise_for_status()
                measurements[f"uncertainty_{count}"] = {"seconds": seconds, "result": response.json()}

        start = time.perf_counter()
        completed = subprocess.run([
            sys.executable, str(ROOT / "scripts/run_all_families.py"),
            "--price-basis", str(basis_file), "--out", str(task_dir / "families.json"),
        ], cwd=ROOT, check=True, capture_output=True, text=True)
        elapsed = time.perf_counter() - start
        families = json.loads((task_dir / "families.json").read_text(encoding="utf-8"))
        measurements["all_families"] = {
            "seconds": elapsed, "families": len(families["families"]),
            "candidates": sum(item["n"] for item in families["summary"]),
            "stdout": completed.stdout,
        }
        engine.dispose()

    result = {
        "python": platform.python_version(), "platform": platform.platform(),
        "history_file": history.relative_to(ROOT).as_posix(),
        "history_sha256": hashlib.sha256(history.read_bytes()).hexdigest(),
        "basis_month": month, "seed": 42, "calculation_input": calculation,
        "basis_limitation": "No committed IMF reference snapshot was present. Archived 2026-09-02 live-feed history is averaged by completed calendar month for timing only; original source names are preserved. This is not the paper reference basis.",
        "measurement_scope": "In-process FastAPI TestClient; temporary SQLite; startup price collection disabled; no network latency; wall time includes response serialization.",
        "measurements": measurements,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps({key: {k: v for k, v in value.items() if k in {"seconds", "median_seconds", "families", "candidates"}} for key, value in measurements.items()}, indent=2))


if __name__ == "__main__":
    main()
