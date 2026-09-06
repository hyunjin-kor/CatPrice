"""Caching and batched sampling preserve source updates and the scalar random stream."""

import json
from copy import deepcopy

import numpy as np

from backend.core import price_escalation, uncertainty
from backend.schemas.cost_input import CostCalculationRequest


def test_index_cache_observes_file_replacement_and_returns_independent_maps(tmp_path, monkeypatch):
    monkeypatch.setattr(price_escalation, "_DATA_DIR", tmp_path)
    path = tmp_path / "chemppi.json"
    path.write_text(json.dumps({"annual": {"2017": 100, "2026": 150}}), encoding="utf-8")
    before = price_escalation._read_index.cache_info()
    assert price_escalation.get_escalation_factor(2017, 2026) == 1.5
    altered = price_escalation._load_index("chemppi")
    altered["2026"] = 999
    assert price_escalation.get_escalation_factor(2017, 2026) == 1.5
    assert price_escalation._read_index.cache_info().hits >= before.hits + 2
    path.write_text(json.dumps({"annual": {"2017": 100, "2026": 200, "2027": 220}}), encoding="utf-8")
    assert price_escalation.get_escalation_factor(2017, 2026) == 2
    assert price_escalation.latest_index_year() == 2027


def test_batched_mc_preserves_every_scalar_draw_and_does_not_mutate_context(monkeypatch):
    request = CostCalculationRequest(metal_symbol="Ni", metal_price=7.5, metal_loading_wt_pct=15, support_name="Al2O3", order_size_tons=20)
    context = {
        "resolved_components": [{"role": role, "name": role, "wt_pct": 1, "price_per_lb": value} for role, value in (("active_metal", 10), ("promoter", 3), ("support", 2))],
        "electrode_payload": {"catalyst_price_per_lb": 10, "membrane_cost_per_cm2": 0.5, "metadata": {"source": "unchanged"}},
        "steps": [], "application_family": "general", "route_summary": None, "resolved_materials": [],
    }
    original = deepcopy(context)
    seen = []

    def estimate(**params):
        seen.append(params)
        return {"summary": {"estimated_price_per_lb": 1, "estimated_price_per_kg": 2.2046}, "input_summary": {"composition": "test"}}

    monkeypatch.setattr(uncertainty, "estimate_catalyst_cost", estimate)
    bounds = {"active_component_price": (0.7, 1.3), "support_price": (0.8, 1.2), "electrode_adjunct_price": (0.85, 1.15), "order_size_tons": (0.8, 1.2)}
    uncertainty.run_cost_request_monte_carlo(req=request, context=context, uncertainties=bounds, n_simulations=100, seed=20260906)
    rng = np.random.default_rng(20260906)
    for sample in seen[1:]:
        active, promoter, support, adjunct, order = [rng.uniform(*bounds.get(key, (1.0, 1.0))) for key in ("active_component_price", "promoter_price", "support_price", "electrode_adjunct_price", "order_size_tons")]
        assert [c["price_per_lb"] for c in sample["components"]] == [10 * active, 3 * promoter, 2 * support]
        assert sample["order_size_tons"] == 20 * order
        assert sample["electrode_input"]["catalyst_price_per_lb"] == 10 * active
        assert sample["electrode_input"]["membrane_cost_per_cm2"] == 0.5 * adjunct
    assert context == original
