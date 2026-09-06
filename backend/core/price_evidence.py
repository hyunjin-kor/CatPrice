"""Price-source evidence metadata used across the desktop app."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

_SOURCE_RULES: list[dict[str, Any]] = [
    {
        # Checked first so "Johnson Matthey (monthly average)" lands here, not on the daily board.
        "match": "monthly average",
        "tier": "indexed_reference",
        "confidence_score": 88,
        "transparency": "public_index",
        "acquisition_mode": "api",
        "freshness_target_hours": None,
        "label": "Monthly average reference",
        "note": (
            "Institutional monthly average (IMF Primary Commodity Prices, or Johnson Matthey "
            "base prices averaged by month) used as the paper's reference price basis."
        ),
    },
    {
        "match": "UN Comtrade",
        "tier": "indexed_reference",
        "confidence_score": 72,
        "transparency": "public_index",
        "acquisition_mode": "api",
        "freshness_target_hours": None,
        "label": "Trade unit value",
        "note": (
            "Customs value divided by net weight for one HS code (UN Comtrade); all grades "
            "and partners combined, so it is a bulk market level rather than a catalyst-grade quote."
        ),
    },
    {
        "match": "Yahoo Finance",
        "tier": "exchange_screen",
        "confidence_score": 86,
        "transparency": "screen_quote",
        "acquisition_mode": "api",
        "freshness_target_hours": 24,
        "label": "Exchange-linked quote",
        "note": "Futures-backed quote retrieved through the Yahoo chart API.",
    },
    {
        "match": "Metals.Dev",
        "tier": "aggregated_market_api",
        "confidence_score": 84,
        "transparency": "aggregated_api",
        "acquisition_mode": "api",
        "freshness_target_hours": 24,
        "label": "Aggregated market API",
        "note": "Aggregated metals feed suitable for screening-grade live updates.",
    },
    {
        "match": "MetalpriceAPI",
        "tier": "aggregated_market_api",
        "confidence_score": 82,
        "transparency": "aggregated_api",
        "acquisition_mode": "api",
        "freshness_target_hours": 24,
        "label": "Aggregated precious-metals API",
        "note": "Aggregated precious-metals feed used as a live backup source.",
    },
    {
        "match": "Kitco",
        "tier": "screen_scrape",
        "confidence_score": 79,
        "transparency": "screen_quote",
        "acquisition_mode": "scrape",
        "freshness_target_hours": 24,
        "label": "Screen-scraped quote",
        "note": "Public price board scraped from a market-quote page.",
    },
    {
        "match": "Johnson Matthey",
        "tier": "supplier_board",
        "confidence_score": 90,
        "transparency": "supplier_quote",
        "acquisition_mode": "scrape",
        "freshness_target_hours": 48,
        "label": "Supplier board",
        "note": "Supplier-published precious-metals board used as a direct industry anchor.",
    },
    {
        "match": "Westmetall",
        "tier": "exchange_mirror",
        "confidence_score": 86,
        "transparency": "screen_quote",
        "acquisition_mode": "scrape",
        "freshness_target_hours": 48,
        "label": "Exchange settlement mirror",
        "note": "LME official settlement republished by Westmetall; daily on exchange trading days.",
    },
    {
        "match": "Markets Insider",
        "tier": "screen_scrape",
        "confidence_score": 77,
        "transparency": "screen_quote",
        "acquisition_mode": "scrape",
        "freshness_target_hours": 24,
        "label": "Screen-scraped market page",
        "note": "Public commodity screen scraped when direct API coverage is unavailable.",
    },
    {
        "match": "CatCost 2018 + ChemPPI escalation",
        "tier": "indexed_reference",
        "confidence_score": 46,
        "transparency": "derived_index",
        "acquisition_mode": "indexed",
        "freshness_target_hours": None,
        "label": "Indexed reference",
        "note": "Historical CatCost reference price escalated with ChemPPI rather than tracked live.",
    },
    {
        "match": "USGS MCS",
        "tier": "indexed_reference",
        "confidence_score": 55,
        "transparency": "public_index",
        "acquisition_mode": "indexed",
        "freshness_target_hours": None,
        "label": "Government bulk reference",
        "note": (
            "Annual-average bulk price from the USGS Mineral Commodity Summaries; "
            "no free quote at any frequency exists for this metal."
        ),
    },
]


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _freshness_status(age_hours: float | None, freshness_target_hours: int | None) -> str:
    if freshness_target_hours is None:
        return "reference"
    if age_hours is None:
        return "unknown"
    if age_hours <= freshness_target_hours:
        return "current"
    if age_hours <= freshness_target_hours * 3:
        return "aging"
    return "stale"


def describe_price_evidence(
    *,
    source: str | None,
    fetched_at: str | None = None,
    manual: bool = False,
    basis: str = "live",
    latest_reference_month: str | None = None,
) -> dict[str, Any]:
    """Return consistent price-evidence metadata for a source string."""

    if manual:
        rule = {
            "tier": "manual_input",
            "confidence_score": 35,
            "transparency": "manual_entry",
            "acquisition_mode": "manual",
            "freshness_target_hours": None,
            "label": "Manual input",
            "note": "User-entered value with no automated provenance or freshness tracking.",
        }
    else:
        rule = next(
            (candidate for candidate in _SOURCE_RULES if candidate["match"] in (source or "")),
            {
                "tier": "unknown",
                "confidence_score": 50,
                "transparency": "unknown",
                "acquisition_mode": "unknown",
                "freshness_target_hours": None,
                "label": "Unclassified source",
                "note": "Source is not mapped to a specific evidence policy yet.",
            },
        )

    parsed = _parse_iso_datetime(fetched_at)
    age_hours = None
    if parsed is not None and rule["freshness_target_hours"] is not None:
        age_hours = max(0.0, (datetime.now(UTC) - parsed).total_seconds() / 3600)

    freshness_target_hours = rule["freshness_target_hours"]
    freshness_status = _freshness_status(age_hours, freshness_target_hours)
    if basis == "reference" and "monthly average" in (source or ""):
        freshness_status = (
            "unknown" if parsed is None or latest_reference_month is None
            else "current" if parsed.strftime("%Y-%m") >= latest_reference_month
            else "stale"
        )

    return {
        "tier": rule["tier"],
        "confidence_score": rule["confidence_score"],
        "transparency": rule["transparency"],
        "acquisition_mode": rule["acquisition_mode"],
        "freshness_target_hours": freshness_target_hours,
        "freshness_status": freshness_status,
        "age_hours": round(age_hours, 2) if age_hours is not None else None,
        "label": rule["label"],
        "note": rule["note"],
    }


def price_needs_review(*, basis: str, evidence: dict, fetched_at: str | None) -> bool:
    """Monthly publications and fixed anchors do not age like daily quotes."""
    if basis == "reference":
        if evidence["label"] == "Monthly average reference":
            return evidence["freshness_status"] != "current"
        return evidence["tier"] != "indexed_reference"
    if evidence["confidence_score"] < 75:
        return True
    if evidence["freshness_target_hours"] is None:
        return False
    parsed = _parse_iso_datetime(fetched_at)
    return parsed is None or (datetime.now(UTC) - parsed).total_seconds() > 7 * 86400


def build_fixed_evidence(
    *,
    label: str,
    note: str,
    tier: str,
    confidence_score: int,
    transparency: str,
) -> dict[str, Any]:
    """Build evidence metadata for non-live fixed screening prices."""

    return {
        "tier": tier,
        "confidence_score": confidence_score,
        "transparency": transparency,
        "acquisition_mode": "static",
        "freshness_target_hours": None,
        "freshness_status": "reference",
        "age_hours": None,
        "label": label,
        "note": note,
    }
