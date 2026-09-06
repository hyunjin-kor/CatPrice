"""Applied monthly quotes must not inherit the catalog's old price evidence."""

from datetime import UTC, datetime
from urllib.parse import parse_qs, urlsplit

from backend.core.comtrade_snapshot import load_support_history
from backend.models.metal_price import MetalPrice
from backend.services.price_scheduler import save_reference_series


def payload(basis="reference"):
    return {
        "components": [
            {"role": "active_metal", "name": "Ni", "wt_pct": 20, "price_per_lb": 7.5},
            {"role": "support", "material_key": "lit:comtrade-calcined-alumina-2024", "wt_pct": 80},
        ],
        "price_basis": basis,
    }


def test_support_override_uses_observed_month_and_verified_response_url(client, session):
    series = load_support_history()
    point = series["HS281820"]["points"][-1]
    before = client.post("/api/calculate", json=payload("live")).json()
    save_reference_series(session, series)
    result = client.post("/api/calculate", json=payload()).json()
    material = result["resolved_materials"][0]
    assert material["price"] == point["price"]
    assert material["quote_year"] == int(point["date"][:4])
    assert material["pricing_basis"] == "reference_monthly:HS281820:" + point["date"][:7]
    url = urlsplit(material["reference_url"])
    assert url.path == "/public/v1/preview/C/M/HS"
    assert parse_qs(url.query)["period"] == [point["date"][:7].replace("-", "")]
    assert parse_qs(url.query)["cmdCode"] == ["281820"]
    assert material["live_override"]["fallback_quote_year"] == 2024
    assert "/C/A/HS?" in material["live_override"]["fallback_reference_url"]
    after = client.post("/api/calculate", json=payload("live")).json()
    assert before == after


def test_reference_quote_without_matching_retained_response_does_not_reuse_catalog_url(client, session):
    session.add(MetalPrice(
        symbol="HS281820", name="Calcined alumina", price=0.64, unit="$/kg",
        source="UN Comtrade (monthly unit value)", basis="reference",
        fetched_at=datetime(2026, 6, 30, tzinfo=UTC),
    ))
    session.commit()
    material = client.post("/api/calculate", json=payload()).json()["resolved_materials"][0]
    assert material["price"] == 0.64
    assert material["quote_year"] == 2026
    assert material["reference_url"] == ""
    assert material["live_override"]["fallback_reference_url"]
