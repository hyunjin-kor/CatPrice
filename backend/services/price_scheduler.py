"""Scheduled price collection — uses fetch_all_prices() (yfinance + optional APIs)."""

from __future__ import annotations

import logging
import math
from datetime import UTC, date, datetime, timedelta

from sqlmodel import Session, select

from backend.config import settings
from backend.core.price_fetcher import (
    fetch_all_prices,
    fetch_comtrade_unit_values,
    fetch_reference_series,
    fetch_yfinance,
    load_support_series,
    metal_name,
)
from backend.database import engine
from backend.models.metal_price import MetalPrice

# The reference basis starts where Johnson Matthey's public history does.
REFERENCE_START = date(2019, 1, 1)
# Monthly averages change once a month; the desktop client refreshes live
# quotes more often, so the reference feeds are polled once a day.
REFERENCE_REFRESH_INTERVAL = timedelta(hours=24)
_last_reference_fetch: datetime | None = None

logger = logging.getLogger(__name__)

# A feed that changes unit or fails to parse lands orders of magnitude away from
# the last good value; a real tick never does. Two such clusters reached the
# table before this check existed: aluminium quoted per metric ton instead of
# per pound (~2000x high) and a rhodium parse failure pinned at 1001.0 (~10x
# low). The bound is deliberately loose so no genuine move is ever refused.
MAX_TICK_RATIO = 5.0
YAHOO_PRIMARY_SOURCES = {
    "Pt": "Johnson Matthey",
    "Pd": "Johnson Matthey",
    "Cu": "Westmetall",
    "Al": "Westmetall",
}


async def collect_prices(source: str | None = None) -> dict[str, dict]:
    """Fetch metal prices and persist to DB.

    Args:
        source: ``"yahoo"`` skips the slower scrapers and only refreshes the
            Yahoo Finance-backed symbols without replacing a selected primary
            JM/Westmetall quote. The full daily refresh chooses fallbacks when
            a primary feed is unavailable.
            Default fetches every configured source.
    """
    if source == "yahoo":
        results = await fetch_yfinance()
        with Session(engine) as session:
            latest = _latest_by_symbol(session, list(results))
        results = {
            symbol: info for symbol, info in results.items()
            if not (
                symbol in YAHOO_PRIMARY_SOURCES
                and symbol in latest
                and latest[symbol].source.startswith(YAHOO_PRIMARY_SOURCES[symbol])
            )
        }
    else:
        results = await fetch_all_prices()
    if results:
        _save_prices(results)
    if source is None and _reference_due():
        try:
            await collect_reference_prices()
        except Exception as exc:  # a dead reference feed must not fail the live refresh
            logger.warning("Reference price collection failed: %s", exc)
        try:
            await collect_support_prices()
        except Exception as exc:
            logger.warning("Support price collection failed: %s", exc)
    return results


def _months_between(start: date, end: date) -> list[str]:
    """YYYYMM for every month from ``start`` up to and including ``end``'s month."""
    months: list[str] = []
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        months.append(f"{year:04d}{month:02d}")
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return months


async def collect_support_prices() -> dict[str, int]:
    """Store monthly support unit values from UN Comtrade for months not yet in the table.

    Needs COMTRADE_API_KEY; without it the academic basis keeps the library
    anchors for supports. Only missing months are requested, twelve per call.
    """
    api_key = settings.comtrade_api_key
    if not api_key:
        return {}
    catalog = load_support_series()
    today = date.today()
    last_complete = (today.replace(day=1) - timedelta(days=1))
    wanted = _months_between(REFERENCE_START, last_complete)

    inserted: dict[str, int] = {}
    with Session(engine) as session:
        for entry in catalog["series"]:
            stored = {
                row.fetched_at.strftime("%Y%m")
                for row in session.exec(
                    select(MetalPrice).where(MetalPrice.symbol == entry["id"], MetalPrice.basis == "reference")
                ).all()
            }
            missing = [m for m in wanted if m not in stored]
            points: list[dict] = []
            for i in range(0, len(missing), 12):
                points.extend(
                    await fetch_comtrade_unit_values(
                        entry["hs"], missing[i : i + 12], api_key, catalog["reporter_code"]
                    )
                )
            if not points:
                continue
            series = {
                entry["id"]: {
                    "name": entry["name"],
                    "unit": catalog["unit"],
                    "source": "UN Comtrade (monthly unit value)",
                    "points": points,
                }
            }
            inserted.update(save_reference_series(session, series))
    if inserted:
        logger.info("Support series: stored %s", inserted)
    return inserted


def _reference_due() -> bool:
    return (
        _last_reference_fetch is None
        or datetime.now(UTC) - _last_reference_fetch >= REFERENCE_REFRESH_INTERVAL
    )


async def collect_reference_prices() -> dict[str, int]:
    """Fetch the monthly-average series and store the months not yet in the table."""
    global _last_reference_fetch
    series, failures = await fetch_reference_series(REFERENCE_START, date.today())
    for key, message in failures.items():
        logger.warning("Reference feed %s: %s", key, message)
    if not series:
        return {}
    _last_reference_fetch = datetime.now(UTC)
    with Session(engine) as session:
        inserted = save_reference_series(session, series)
    if inserted:
        logger.info("Reference basis: stored %s", inserted)
    return inserted


def save_reference_series(session: Session, series: dict[str, dict]) -> dict[str, int]:
    """Insert one reference row per symbol and month for points not stored yet."""
    inserted: dict[str, int] = {}
    for symbol, entry in series.items():
        stored = {
            row.fetched_at.date()
            for row in session.exec(
                select(MetalPrice).where(MetalPrice.symbol == symbol, MetalPrice.basis == "reference")
            ).all()
        }
        count = 0
        for point in entry["points"]:
            day = date.fromisoformat(str(point["date"])[:10])
            if day in stored:
                continue
            session.add(
                MetalPrice(
                    symbol=symbol,
                    name=entry.get("name") or metal_name(symbol),
                    price=float(point["price"]),
                    unit=entry["unit"],
                    source=entry["source"],
                    basis="reference",
                    fetched_at=datetime(day.year, day.month, day.day, tzinfo=UTC),
                )
            )
            count += 1
        if count:
            inserted[symbol] = count
    session.commit()
    return inserted


def check_price(
    symbol: str,
    price: float,
    unit: str,
    previous: MetalPrice | None,
) -> str | None:
    """Return a rejection reason, or None when the quote may be stored.

    ``previous`` is the last stored quote for the symbol. Without one there is
    nothing to compare against, so only the value itself is checked.
    """
    if not math.isfinite(price) or price <= 0:
        return f"price is not a positive finite number ({price!r})"

    if previous is None:
        return None
    if previous.unit != unit:
        # A unit switch makes the magnitudes incomparable; let it through so a
        # deliberate unit change is not permanently blocked by its own history.
        logger.warning(
            "%s: unit changed %s -> %s; skipping magnitude check", symbol, previous.unit, unit
        )
        return None

    ratio = price / float(previous.price)
    if ratio > MAX_TICK_RATIO or ratio < 1 / MAX_TICK_RATIO:
        return (
            f"{price:g} {unit} is {ratio:.4g}x the last stored value "
            f"({previous.price:g} {unit} from {previous.source})"
        )
    return None


def _latest_by_symbol(session: Session, symbols: list[str]) -> dict[str, MetalPrice]:
    latest: dict[str, MetalPrice] = {}
    rows = session.exec(
        select(MetalPrice)
        .where(MetalPrice.symbol.in_(symbols), MetalPrice.basis == "live")
        .order_by(MetalPrice.fetched_at.desc())
    ).all()
    for row in rows:
        latest.setdefault(row.symbol, row)
    return latest


def _save_prices(prices: dict[str, dict]) -> None:
    now = datetime.now(UTC)
    with Session(engine) as session:
        latest = _latest_by_symbol(session, list(prices))
        saved = 0
        for symbol, info in prices.items():
            price = float(info.get("price", 0))
            unit = info.get("unit", "$/troy_oz")
            reason = check_price(symbol, price, unit, latest.get(symbol))
            if reason is not None:
                logger.warning("Rejected %s quote: %s", symbol, reason)
                continue
            session.add(
                MetalPrice(
                    symbol=symbol,
                    name=info.get("name", symbol),
                    price=price,
                    unit=unit,
                    source=info.get("source", "unknown"),
                    basis="live",
                    fetched_at=now,
                )
            )
            saved += 1
        session.commit()
    rejected = len(prices) - saved
    if rejected:
        logger.warning("Saved %d price records to DB, rejected %d", saved, rejected)
    else:
        logger.info("Saved %d price records to DB", saved)
