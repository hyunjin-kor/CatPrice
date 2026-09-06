"""Paper wrapper guards for incomplete months, source identity and failure evidence."""

import sys
from datetime import date
from pathlib import Path

import pytest

from scripts.reproduce_paper import normalize_history, run_command, sha256


def test_legacy_history_uses_monthly_means_and_preserves_source():
    payload = {"series": {"Cu": {"source": "Yahoo Finance (live)", "unit": "$/lb", "points": [{"date": "2026-07-01", "price": 4}, {"date": "2026-07-31", "price": 6}, {"date": "2026-08-31", "price": 8}, {"date": "2026-09-01", "price": 100}]}}}
    result, month = normalize_history(payload, None, date(2026, 9, 6))
    assert month == "2026-08"
    assert result["series"]["Cu"]["points"] == [{"date": "2026-07-31", "price": 5.0}, {"date": "2026-08-31", "price": 8.0}]
    assert result["series"]["Cu"]["source"].startswith("Yahoo Finance (live)")
    assert "IMF" not in result["series"]["Cu"]["source"]
    assert payload["series"]["Cu"]["points"][-1]["price"] == 100


def test_reference_history_uses_latest_common_completed_month():
    payload = {"cadence": "monthly_average", "series": {symbol: {"source": "IMF PCPS (monthly average)", "unit": "$/lb", "points": points} for symbol, points in {"Cu": [{"date": "2026-07-31", "price": 4}, {"date": "2026-08-31", "price": 5}], "Ni": [{"date": "2026-07-31", "price": 8}]}.items()}}
    result, month = normalize_history(payload, None, date(2026, 9, 6))
    assert month == "2026-07"
    assert result["series"]["Cu"]["source"] == "IMF PCPS (monthly average)"
    assert result["series"]["Cu"]["last"] == "2026-07-31"
    with pytest.raises(ValueError, match="latest_common_month"):
        normalize_history(payload, "2026-08", date(2026, 9, 6))
    with pytest.raises(ValueError, match="incomplete"):
        normalize_history(payload, "2026-09", date(2026, 9, 6))


def test_support_publication_month_limits_combined_basis_without_interpolation():
    payload = {"cadence": "monthly_average", "series": {
        "Cu": {"source": "IMF", "unit": "$/lb", "points": [{"date": "2026-06-30", "price": 4}, {"date": "2026-07-31", "price": 5}]},
        "HS281820": {"source": "UN Comtrade (monthly unit value)", "cadence": "monthly_unit_value", "unit": "$/kg", "points": [{"date": "2026-06-30", "price": 0.55}]},
    }}
    result, month = normalize_history(payload, None, date(2026, 9, 6))
    assert month == "2026-06"
    assert result["series"]["HS281820"]["cadence"] == "monthly_unit_value"
    assert result["series"]["HS281820"]["source"] == "UN Comtrade (monthly unit value)"
    with pytest.raises(ValueError, match="latest_common_month"):
        normalize_history(payload, "2026-07", date(2026, 9, 6))


def test_hash_tracks_exact_snapshot_bytes(tmp_path: Path):
    path = tmp_path / "snapshot.json"
    path.write_bytes(b'{"price": 1}\n')
    original = sha256(path)
    path.write_bytes(b'{"price": 1}\r\n')
    assert sha256(path) != original


def test_command_failure_is_not_reported_as_success():
    records = []
    result = run_command([sys.executable, "-c", "import sys; print('failure evidence'); sys.exit(7)"], {}, records)
    assert result["returncode"] == 7
    assert "failure evidence" in result["stdout"]
    assert records == [result]
    assert result["elapsed_seconds"] >= 0


def test_breakeven_propagates_reference_basis(monkeypatch):
    import backend.core.breakeven as module

    seen = []

    def evaluate(**kwargs):
        seen.append(kwargs["basis"])
        return {"candidates": [{"slug": slug, "summary": {"landed_cost_per_lb": cost}} for slug, cost in (("a", 1), ("b", 2))]}

    monkeypatch.setattr(module, "evaluate_benchmark_family", evaluate)
    result = module.breakeven_for_pair(None, "family", "a", "b", "Cu", {"Cu": {"price": 4, "unit": "$/lb", "source": "test"}}, basis="reference", scan=3)
    assert "error" not in result
    assert seen and set(seen) == {"reference"}
