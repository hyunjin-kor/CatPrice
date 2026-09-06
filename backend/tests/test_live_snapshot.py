"""A paper live comparison requires observed quotes in its selected price map."""

import json
from datetime import UTC, datetime

import pytest

from backend.models.metal_price import MetalPrice
from scripts.reproduce_paper import classify_live_snapshot, snapshot_live


@pytest.mark.parametrize("include_current_quote", [False, True])
def test_snapshot_ignores_superseded_live_quotes(session, monkeypatch, tmp_path, include_current_quote):
    import backend.database as database

    monkeypatch.setattr(database, "engine", session.get_bind())
    session.add_all([
        MetalPrice(symbol="Pt", name="Platinum", price=1000, unit="$/troy_oz",
                   source="Yahoo Finance (live)", fetched_at=datetime(2026, 8, 1, tzinfo=UTC)),
        MetalPrice(symbol="Pt", name="Platinum", price=1100, unit="$/troy_oz",
                   source="USGS MCS 2026 (2025 avg)", fetched_at=datetime(2026, 9, 1, tzinfo=UTC)),
        MetalPrice(symbol="Ni", name="Nickel", price=8, unit="$/lb", basis="reference",
                   source="IMF PCPS (monthly average)", fetched_at=datetime(2026, 7, 31, tzinfo=UTC)),
    ])
    if include_current_quote:
        session.add(MetalPrice(symbol="Cu", name="Copper", price=4, unit="$/lb",
                              source="Westmetall (LME settlement)", fetched_at=datetime(2026, 9, 4, tzinfo=UTC)))
    session.commit()

    path = tmp_path / "live.json"
    result = snapshot_live(path)
    assert result["observed_symbols"] == (["Cu"] if include_current_quote else [])
    assert result["status"] == ("available" if include_current_quote else "unavailable")
    assert result["price_basis"]["Pt"]["price"] == 1100
    assert result["price_basis"]["Pt"]["source"].startswith("USGS")
    assert json.loads(path.read_text(encoding="utf-8")) == result


@pytest.mark.parametrize("source", [
    "USGS MCS 2026 (2025 avg)",
    "CatCost 2018 + ChemPPI escalation",
    "Johnson Matthey (monthly average)",
    "Yahoo Finance (live) (frozen observations averaged by month)",
    "Unknown provider (live)",
])
def test_provided_snapshot_metadata_cannot_claim_reference_quotes_are_live(source):
    payload = {"status": "available", "observed_symbols": ["Pt"],
               "price_basis": {"Pt": {"price": 1000, "unit": "$/troy_oz", "source": source}}}
    result = classify_live_snapshot(payload)
    assert result["status"] == "unavailable"
    assert result["observed_symbols"] == []
    assert payload["status"] == "available"
    assert result["price_basis"] == payload["price_basis"]


@pytest.mark.parametrize("metadata", [{"basis": "reference"}, {"basis_type": "reference"}, {"cadence": "monthly_average"}])
def test_explicit_reference_snapshot_cannot_be_used_as_live(metadata):
    result = classify_live_snapshot({**metadata, "status": "available", "price_basis": {
        "Pt": {"price": 1000, "source": "Johnson Matthey (live)"}}})
    assert result["status"] == "unavailable"


def test_selected_market_quotes_determine_observations_even_with_stale_metadata():
    result = classify_live_snapshot({"status": "unavailable", "observed_symbols": ["Mo"], "price_basis": {
        "Pt": {"price": 1000, "source": "Johnson Matthey (live)"},
        "Cu": {"price": 4, "source": "Westmetall (LME settlement)"},
        "Au": {"price": 2000, "source": "Metals.Dev"},
        "Mo": {"price": 23.13, "source": "USGS MCS 2026 (2025 avg)"}}})
    assert result["status"] == "available"
    assert result["observed_symbols"] == ["Au", "Cu", "Pt"]
