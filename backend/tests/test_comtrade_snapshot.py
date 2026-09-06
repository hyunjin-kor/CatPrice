"""Reject misleading public-preview responses before they can affect prices."""

import copy
from urllib.parse import urlencode

import pytest

from backend.core.comtrade_snapshot import (
    PREVIEW_API,
    parse_preview,
    preview_params,
    validate_support_snapshot,
)


def payload():
    row = {**preview_params("281820", "202606"), "typeCode": "C", "freqCode": "M",
           "netWgt": 20, "primaryValue": 10, "isNetWgtEstimated": False,
           "aggrLevel": None, "isLeaf": None}
    return {"error": "", "count": 1, "data": [row]}


def test_exact_world_import_row_dates_and_units():
    assert parse_preview(payload(), "281820", "202606") == {"date": "2026-06-30", "price": 0.5}
    assert parse_preview({"count": 0, "data": []}, "281820", "202606") is None
    with pytest.raises(ValueError, match="JSON object"):
        parse_preview([], "281820", "202606")


@pytest.mark.parametrize("field,value", [
    ("reporterCode", "156"), ("partnerCode", "156"), ("partner2Code", "156"),
    ("cmdCode", "2818"), ("flowCode", "X"), ("period", "202605"),
    ("customsCode", "C01"), ("motCode", "1"), ("freqCode", "A"), ("typeCode", "S"),
    ("aggrLevel", 4), ("isLeaf", False), ("isNetWgtEstimated", True),
    ("isNetWgtEstimated", None), ("netWgt", 0), ("primaryValue", -1),
    ("netWgt", "NaN"), ("primaryValue", "Infinity"), ("netWgt", None),
    ("netWgt", True), ("primaryValue", True),
])
def test_preview_rejects_incompatible_or_invalid_data(field, value):
    data = payload()
    data["data"][0][field] = value
    with pytest.raises(ValueError):
        parse_preview(data, "281820", "202606")


@pytest.mark.parametrize("change", ["duplicate", "count", "error"])
def test_preview_rejects_incomplete_or_ambiguous_response(change):
    data = payload()
    if change == "duplicate":
        data["data"] *= 2
        data["count"] = 2
    elif change == "count":
        data["count"] = 10
    else:
        data["error"] = "query failed"
    with pytest.raises(ValueError):
        parse_preview(data, "281820", "202606")


@pytest.mark.parametrize("hs,period", [("2818", "202606"), ("xxxxxx", "202606"), ("281820", "202613"), ("281820", "2026")])
def test_request_refuses_invalid_codes_and_periods(hs, period):
    with pytest.raises(ValueError):
        preview_params(hs, period)


def test_snapshot_must_match_raw_response_and_never_invents_missing_month():
    point = parse_preview(payload(), "281820", "202606")
    snapshot = {"endpoint": PREVIEW_API, "series": {"HS281820": {"unit": "$/kg", "points": [point]}},
                "requests": [{"symbol": "HS281820", "period": "202606", "status": "accepted", "http_status": 200,
                              "url": PREVIEW_API + "?" + urlencode(preview_params("281820", "202606")), "response": payload()}]}
    assert validate_support_snapshot(snapshot)["HS281820"]["points"] == [point]
    for field, value in (("http_status", 503), ("url", "https://example.test")):
        corrupted = copy.deepcopy(snapshot)
        corrupted["requests"][0][field] = value
        with pytest.raises(ValueError, match="unverified request"):
            validate_support_snapshot(corrupted)
    corrupted = copy.deepcopy(snapshot)
    corrupted["series"] = {}
    with pytest.raises(ValueError, match="declared series differ"):
        validate_support_snapshot(corrupted)
    corrupted = copy.deepcopy(snapshot)
    corrupted["series"]["HS281820"]["points"][0]["price"] = 100
    with pytest.raises(ValueError, match="do not match"):
        validate_support_snapshot(corrupted)
    snapshot["requests"] *= 2
    with pytest.raises(ValueError, match="do not match"):
        validate_support_snapshot(snapshot)


def test_shipped_free_snapshot_can_seed_reference_prices_without_network(session):
    from backend.core.comtrade_snapshot import load_support_history
    from backend.core.decision_engine import _latest_price_map
    from backend.services.price_scheduler import save_reference_series

    series = load_support_history()
    assert "HS281820" in series
    assert save_reference_series(session, series)["HS281820"] >= 1
    assert save_reference_series(session, series) == {}
    prices = _latest_price_map(session, "reference")
    assert prices["HS281820"]["price"] == series["HS281820"]["points"][-1]["price"]
    assert "HS281820" not in _latest_price_map(session, "live")
