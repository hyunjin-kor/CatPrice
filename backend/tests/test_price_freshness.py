from datetime import UTC, datetime, timedelta

from backend.core.price_evidence import describe_price_evidence, price_needs_review
from backend.models.metal_price import MetalPrice


def test_reference_month_age_does_not_use_daily_clock():
    for month, expected in (("2026-07", False), ("2026-06", True)):
        stamp = f"{month}-28T00:00:00+00:00"
        evidence = describe_price_evidence(
            source="IMF PCPS (monthly average)", fetched_at=stamp,
            basis="reference", latest_reference_month="2026-07",
        )
        assert price_needs_review(basis="reference", evidence=evidence, fetched_at=stamp) is expected


def test_seven_day_review_rule_only_applies_to_live_quotes():
    for days, expected in ((6, False), (8, True)):
        stamp = (datetime.now(UTC) - timedelta(days=days)).isoformat()
        evidence = describe_price_evidence(source="Yahoo Finance (live)", fetched_at=stamp)
        assert price_needs_review(basis="live", evidence=evidence, fetched_at=stamp) is expected


def test_reference_anchors_keep_quality_visible_without_false_staleness():
    evidence = describe_price_evidence(source="USGS MCS 2026 (2025 avg)")
    assert evidence["confidence_score"] == 55
    assert not price_needs_review(basis="reference", evidence=evidence, fetched_at=None)
    assert price_needs_review(basis="live", evidence=evidence, fetched_at=None)


def test_reference_api_flags_only_months_behind_latest_publication(client, session):
    for symbol, month in (("Co", 7), ("Ni", 6)):
        session.add(MetalPrice(symbol=symbol, name=symbol, price=25, unit="$/lb",
                               source="IMF PCPS (monthly average)", basis="reference",
                               fetched_at=datetime(2026, month, 28, tzinfo=UTC)))
    session.commit()
    rows = {row["symbol"]: row for row in client.get("/api/prices?basis=reference").json()}
    assert rows["Co"]["needs_review"] is False
    assert rows["Ni"]["needs_review"] is True
    assert rows["W"]["needs_review"] is False
    assert client.get("/api/prices/Co?basis=reference").json()["needs_review"] is False
    assert client.get("/api/prices/Ni?basis=reference").json()["needs_review"] is True
