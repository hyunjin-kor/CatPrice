"""Compare support-price effects at a fixed shared month, holding metal prices fixed."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.core.comtrade_snapshot import validate_support_snapshot  # noqa: E402
from backend.core.price_fetcher import get_reference_prices  # noqa: E402
from backend.core.reference_basis import build_price_basis  # noqa: E402
from scripts.reproduce_paper import normalize_history, read_json, sha256, write_json  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--history", type=Path, required=True)
    parser.add_argument("--support-history", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    history = read_json(args.history)
    supports = validate_support_snapshot(read_json(args.support_history))
    if not supports or set(supports) & set(history["series"]):
        raise ValueError("expected nonempty, distinct support series")
    normalized, month = normalize_history({**history, "series": {**history["series"], **supports}}, None, date.today())
    basis_after = build_price_basis(normalized["series"], month, get_reference_prices())
    basis_before = {k: v for k, v in basis_after.items() if k not in supports}
    runs = {}
    with tempfile.TemporaryDirectory(prefix="comet-support-impact-") as folder:
        temp = Path(folder)
        env = {**os.environ, "DATABASE_URL": "sqlite:///" + (temp / "analysis.db").as_posix(), "PYTHONHASHSEED": "20260906"}
        for label, basis in (("before", basis_before), ("after", basis_after)):
            basis_file, output_file = temp / f"{label}-basis.json", temp / f"{label}-results.json"
            write_json(basis_file, {"price_basis": basis})
            subprocess.run([sys.executable, str(ROOT / "scripts/run_all_families.py"), "--price-basis", str(basis_file), "--basis-type", "reference", "--out", str(output_file)], cwd=ROOT, env=env, check=True, capture_output=True)
            runs[label] = read_json(output_file)
    before = {f["family"]: f for f in runs["before"]["families"]}
    cost_changes, rank_changes = [], []
    lca_same = True
    for family in runs["after"]["families"]:
        old = before[family["family"]]
        candidates = {c["slug"]: c for c in old["candidates"]}
        for current in family["candidates"]:
            previous = candidates[current["slug"]]
            lca_same &= previous["lca"] == current["lca"]
            a, b = previous["landed_cost_per_lb"], current["landed_cost_per_lb"]
            if a != b:
                cost_changes.append({"family": family["family"], "candidate": current["slug"], "before_usd_per_lb": a, "after_usd_per_lb": b, "change_pct": round(100 * (b / a - 1), 4), "price_evidence_before": previous["scores"]["evidence"], "price_evidence_after": current["scores"]["evidence"]})
        for profile in (*family["profiles"], "performance_zero"):
            previous = old[profile] if profile == "performance_zero" else old["profiles"][profile]
            current = family[profile] if profile == "performance_zero" else family["profiles"][profile]
            if previous["ranking"][0] != current["ranking"][0]:
                rank_changes.append({"family": family["family"], "profile": profile, "before": previous["ranking"][0], "after": current["ranking"][0]})
    output = {"basis_month": month, "comparison": "Same code, metal prices, compositions, score weights and LCA factors; only accepted support observations added. Price-evidence scores can change with the source and cost shares.", "inputs": [{"file": p.as_posix(), "sha256": sha256(p)} for p in (args.history, args.support_history)], "support_symbols": sorted(supports), "price_basis_before": basis_before, "price_basis_after": basis_after, "families": len(before), "candidates": sum(len(f["candidates"]) for f in before.values()), "candidate_cost_changes": cost_changes, "winner_changes": rank_changes, "all_lca_values_unchanged": lca_same}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_json(args.out, output)
    print(f"{month}: {len(cost_changes)} candidate costs, {len(rank_changes)} profile winners changed; LCA unchanged={lca_same}")


if __name__ == "__main__":
    main()
