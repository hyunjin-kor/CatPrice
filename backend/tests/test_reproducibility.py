"""Explicit Monte Carlo seeds and benchmark tie breaks are reproducible."""

import json
import os
import subprocess
import sys
from copy import deepcopy
from pathlib import Path

import pytest

from backend.core import decision_engine
from backend.routers.uncertainty import UncertaintyRequest
from scripts.run_all_families import DIMS, rank

LEGACY_INPUT = {
    "metal_symbol": "Ni", "metal_price": 7.5, "metal_price_unit": "$/lb",
    "metal_loading_wt_pct": 15, "support_name": "Al2O3",
    "support_price_per_lb": 0.5, "order_size_tons": 20,
}


@pytest.mark.parametrize("structured", [False, True])
def test_uncertainty_seed_reproduces_both_request_shapes(client, structured):
    payload = {"calculation_input": LEGACY_INPUT} if structured else dict(LEGACY_INPUT)
    payload.update(n_simulations=100, seed=20260906)
    first = client.post("/api/uncertainty", json=payload)
    second = client.post("/api/uncertainty", json=payload)
    other_seed = client.post("/api/uncertainty", json={**payload, "seed": 20260907})
    assert first.status_code == second.status_code == other_seed.status_code == 200
    assert first.json() == second.json()
    assert first.json()["mean"] != other_seed.json()["mean"]
    assert UncertaintyRequest(**LEGACY_INPUT).seed is None


def test_uncertainty_rejects_negative_seed(client):
    response = client.post("/api/uncertainty", json={**LEGACY_INPUT, "seed": -1})
    assert response.status_code == 422


def test_benchmark_equal_scores_and_costs_use_slug_not_catalog_order(session, monkeypatch):
    catalog = deepcopy(decision_engine._load_catalogs()["ammonia-cracking"])
    first = catalog["candidates"][0]
    catalog["candidates"] = [{**deepcopy(first), "slug": slug} for slug in ("zeta", "alpha")]
    monkeypatch.setattr(decision_engine, "_load_catalogs", lambda: {"ammonia-cracking": catalog})
    evaluated = decision_engine.evaluate_benchmark_family(session=session, family="ammonia-cracking")
    candidates = evaluated["candidates"]
    assert candidates[0]["scores"] == candidates[1]["scores"]
    assert [item["slug"] for item in candidates] == ["alpha", "zeta"]
    assert rank(list(reversed(candidates)), dict.fromkeys(DIMS, 0.25)) == ["alpha", "zeta"]


def test_frozen_family_runs_write_identical_json(tmp_path):
    root = Path(__file__).resolve().parents[2]
    environment = {**os.environ, "DATABASE_URL": "sqlite:///" + (tmp_path / "repro.db").as_posix()}
    environment.pop("SOURCE_DATE_EPOCH", None)
    outputs = [tmp_path / "first.json", tmp_path / "second.json"]
    for output in outputs:
        subprocess.run([
            sys.executable, str(root / "scripts/run_all_families.py"),
            "--price-basis", str(root / "docs/paper/all_families_2026-09-02.json"),
            "--basis-type", "reference", "--out", str(output),
        ], cwd=root, env=environment, check=True, capture_output=True)
    assert outputs[0].read_bytes() == outputs[1].read_bytes()
    payload = json.loads(outputs[0].read_text(encoding="utf-8"))
    assert payload["generated_at"] is None
    assert payload["basis_type"] == "reference"
    assert len(payload["families"]) == 30
