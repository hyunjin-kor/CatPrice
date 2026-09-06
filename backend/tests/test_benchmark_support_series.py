"""Reference support overrides are narrow, explicit and absent on the live basis."""

import pytest

from backend.core.constants import LB_PER_KG
from backend.core.decision_engine import (
    _load_catalogs,
    _resolve_component_pricing,
    evaluate_benchmark_family,
)
from backend.core.price_fetcher import get_reference_prices, load_support_series

MAPPING = {
    "Al2O3": "HS281820", "MgO": "HS251990", "TiO2": "HS282300",
    "SiO2": "HS281122", "Activated carbon": "HS380210", "Cr2O3": "HS281990",
}


def alumina_component():
    return next(component for component in _load_catalogs()["ammonia-cracking"]["candidates"][0]["components"]
                if component["name"] == "Al2O3")


def support_quote(unit="$/kg"):
    return {"price": 25.0, "unit": unit, "source": "UN Comtrade (synthetic test fixture)",
            "fetched_at": "2026-07-31"}


def test_only_unambiguous_pure_supports_have_reference_series():
    supported_ids = {row["id"] for row in load_support_series()["series"]}
    linked = 0
    for catalog in _load_catalogs().values():
        for candidate in catalog["candidates"]:
            for component in candidate["components"]:
                expected = MAPPING.get(component["name"]) if component["role"] == "support" else None
                assert component["pricing"].get("reference_series") == expected
                if expected:
                    assert expected in supported_ids
                    linked += 1
    assert linked == 38


@pytest.mark.parametrize("unit,expected", [("$/kg", 25 / LB_PER_KG), ("$/lb", 25)])
def test_reference_support_quote_converts_units_and_preserves_evidence(unit, expected):
    inputs, meta = _resolve_component_pricing(alumina_component(), {"HS281820": support_quote(unit)}, "reference")
    assert inputs["price_per_lb"] == pytest.approx(expected, abs=1e-6)
    assert meta["price_basis"] == "reference_series"
    assert meta["source_type"] == "indexed"
    assert meta["evidence"]["tier"] == "indexed_reference"
    assert "not a catalyst-grade quotation" in meta["pricing_note"]


@pytest.mark.parametrize("basis,quotes", [
    ("live", {"HS281820": support_quote()}),
    ("reference", {}),
    ("reference", {"HS281820": support_quote("$/troy_oz")}),
])
def test_missing_or_wrong_unit_series_preserves_fixed_price(basis, quotes):
    component = alumina_component()
    inputs, meta = _resolve_component_pricing(component, quotes, basis)
    assert inputs["price_per_lb"] == component["pricing"]["price_per_lb"]
    assert meta["price_basis"] == "fixed"


@pytest.mark.parametrize("profile,expected_after", [
    ("balanced", ["ni-ceo2-lowtemp", "ru-layered-titanate", "ru-mnox-photothermal", "ni-alumina-baseline"]),
    ("cost-first", ["ni-ceo2-lowtemp", "ru-layered-titanate", "ru-mnox-photothermal", "ni-alumina-baseline"]),
    ("evidence-first", ["ni-ceo2-lowtemp", "ru-mnox-photothermal", "ru-layered-titanate", "ni-alumina-baseline"]),
])
def test_frozen_support_stress_changes_rank_by_weight_profile(session, profile, expected_after):
    # Deliberately synthetic inputs test ranking behavior, not observed market prices.
    prices = {symbol: {**row, "price": 10, "unit": "$/lb", "source": "IMF PCPS (monthly average)",
                       "fetched_at": "2026-07-31"} for symbol, row in get_reference_prices().items()}
    before = evaluate_benchmark_family(session=session, family="co2-methanation", profile=profile,
                                      prices=prices, basis="reference")
    prices["HS281820"] = support_quote()
    after = evaluate_benchmark_family(session=session, family="co2-methanation", profile=profile,
                                     prices=prices, basis="reference")
    assert [candidate["slug"] for candidate in before["candidates"]] == [
        "ni-ceo2-lowtemp", "ru-layered-titanate", "ni-alumina-baseline", "ru-mnox-photothermal",
    ]
    assert [candidate["slug"] for candidate in after["candidates"]] == expected_after
    old = {candidate["slug"]: candidate for candidate in before["candidates"]}
    new = {candidate["slug"]: candidate for candidate in after["candidates"]}
    assert new["ni-alumina-baseline"]["summary"]["landed_cost_per_lb"] > old["ni-alumina-baseline"]["summary"]["landed_cost_per_lb"]
    assert new["ni-ceo2-lowtemp"]["summary"] == old["ni-ceo2-lowtemp"]["summary"]
