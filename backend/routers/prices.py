"""Metal prices API endpoints — live via yfinance + DB cache."""

from __future__ import annotations

import asyncio
import re
import time
from datetime import date, timedelta
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from backend.core.decision_engine import list_benchmark_catalogs
from backend.core.price_evidence import describe_price_evidence, price_needs_review
from backend.core.price_fetcher import (
    JM_HISTORY_SYMBOLS,
    WESTMETALL_FIELDS,
    fetch_history,
    fetch_johnson_matthey_history,
    fetch_westmetall_history,
    get_reference_prices,
    load_support_series,
)
from backend.database import get_session
from backend.models.metal_price import MetalPrice

router = APIRouter(prefix="/api/prices", tags=["prices"])

TRACKED_SYMBOLS = [
    "Pt", "Pd", "Rh", "Ru", "Ir", "Au", "Ag", "Ni", "Co", "Cu", "Al", "Mo", "W", "Fe",
    "Zn", "Sn", "V", "Re",
]

_PERIOD_DAYS = {"1mo": 31, "3mo": 92, "6mo": 183, "1y": 366, "2y": 731, "5y": 1827}
_BASIS_PATTERN = "^(live|reference)$"

# Trend payloads are cached per period so reopening the page (or switching
# the change basis back and forth) does not re-hit the Yahoo chart API.
_TRENDS_TTL_SECONDS = 600.0
_trends_cache: dict[str, tuple[float, dict]] = {}


def _normalize(symbol: str) -> str:
    return symbol.capitalize() if len(symbol) <= 2 else symbol


def _is_live_source(source: str | None) -> bool:
    if "monthly average" in (source or ""):
        return False
    return any(
        label in (source or "")
        for label in (
            "Yahoo Finance",
            "Metals.Dev",
            "Kitco",
            "Johnson Matthey",
            "Markets Insider",
            "MetalpriceAPI",
            "Westmetall",
        )
    )


def _source_type_from_source(source: str | None) -> str:
    return "live" if _is_live_source(source) else "indexed"


def _filter_history_range(
    history: list[dict],
    from_date: date | None,
    to_date: date | None,
) -> list[dict]:
    """Apply an inclusive date filter to price-history rows."""

    if from_date is None and to_date is None:
        return history

    filtered: list[dict] = []
    for row in history:
        row_date = date.fromisoformat(row["date"])
        if from_date is not None and row_date < from_date:
            continue
        if to_date is not None and row_date > to_date:
            continue
        filtered.append(row)
    return filtered


def _serialize_price_row(
    *,
    symbol: str,
    name: str,
    price: float,
    unit: str,
    source: str,
    fetched_at: str | None,
    basis: str = "live",
    latest_reference_month: str | None = None,
) -> dict:
    source_type = _source_type_from_source(source)
    evidence = describe_price_evidence(
        source=source, fetched_at=fetched_at, basis=basis,
        latest_reference_month=latest_reference_month,
    )
    return {
        "symbol": symbol,
        "name": name,
        "price": price,
        "unit": unit,
        "source": source,
        "source_type": source_type,
        "is_live": source_type == "live",
        "fetched_at": fetched_at,
        "basis": basis,
        "basis_month": fetched_at[:7] if basis == "reference" and fetched_at else None,
        "evidence": evidence,
        "needs_review": price_needs_review(basis=basis, evidence=evidence, fetched_at=fetched_at),
    }


def _latest_reference_month(session: Session) -> str | None:
    latest = session.exec(
        select(MetalPrice.fetched_at)
        .where(MetalPrice.basis == "reference", MetalPrice.symbol.in_(TRACKED_SYMBOLS))
        .order_by(MetalPrice.fetched_at.desc()).limit(1)
    ).first()
    return latest.strftime("%Y-%m") if latest else None


def _reference_rows(session: Session, symbol: str, cutoff: date | None = None) -> list[MetalPrice]:
    """Stored monthly-average rows for ``symbol``, oldest first."""
    stmt = (
        select(MetalPrice)
        .where(MetalPrice.symbol == symbol, MetalPrice.basis == "reference")
        .order_by(MetalPrice.fetched_at.desc())
        .limit(500)
    )
    rows = list(reversed(session.exec(stmt).all()))
    if cutoff is not None:
        rows = [row for row in rows if row.fetched_at.date() >= cutoff]
    return rows


@router.get("")
def get_all_prices(
    basis: str = Query(default="live", pattern=_BASIS_PATTERN),
    session: Session = Depends(get_session),
):
    """Latest price for every metal in one basis (stored rows first, anchors for the rest)."""
    stmt = (
        select(MetalPrice)
        .where(MetalPrice.basis == basis, MetalPrice.symbol.in_(TRACKED_SYMBOLS))
        .order_by(MetalPrice.fetched_at.desc())
    )
    db_prices = session.exec(stmt).all()
    latest_reference_month = _latest_reference_month(session) if basis == "reference" else None

    seen: set[str] = set()
    result = []
    for p in db_prices:
        if p.symbol not in seen:
            seen.add(p.symbol)
            result.append(_serialize_price_row(
                symbol=p.symbol,
                name=p.name,
                price=p.price,
                unit=p.unit,
                source=p.source,
                fetched_at=p.fetched_at.isoformat(),
                basis=basis,
                latest_reference_month=latest_reference_month,
            ))

    # Fill missing symbols from the USGS / CatCost anchors
    for sym, info in get_reference_prices().items():
        if sym not in seen:
            result.append(_serialize_price_row(
                symbol=sym,
                name=info["name"],
                price=info["price"],
                unit=info["unit"],
                source=info["source"],
                fetched_at=info["fetched_at"],
                basis=basis,
                latest_reference_month=latest_reference_month,
            ))

    # Sort: live prices first, then alphabetical
    result.sort(key=lambda x: (0 if x["source_type"] == "live" else 1, x["symbol"]))
    return result


def _downsample(points: list[dict], limit: int = 60) -> list[dict]:
    """Thin a daily series to at most `limit` points, always keeping the last one."""

    if len(points) <= limit:
        return points
    stride = (len(points) - 1) / (limit - 1)
    picked = [points[round(i * stride)] for i in range(limit - 1)]
    picked.append(points[-1])
    return picked


def _dedupe_by_date(points: list[dict]) -> list[dict]:
    by_date: dict[str, dict] = {}
    for point in points:
        by_date[point["date"]] = point
    return [by_date[key] for key in sorted(by_date)]


async def _symbol_trend(
    symbol: str,
    period: str,
    session: Session,
    jm_history: dict[str, list[dict]] | None = None,
) -> dict:
    history = await fetch_history(symbol, period)
    source = "Yahoo Finance"
    cutoff = date.today() - timedelta(days=_PERIOD_DAYS.get(period, 366))
    if not history and jm_history and jm_history.get(symbol):
        history = jm_history[symbol]
        source = "Johnson Matthey"
    if not history and symbol in WESTMETALL_FIELDS:
        history = [
            row
            for row in await fetch_westmetall_history(symbol)
            if date.fromisoformat(row["date"]) >= cutoff
        ]
        if history:
            source = "Westmetall (LME)"
    if not history:
        source = "DB cache"
        stmt = (
            select(MetalPrice)
            .where(MetalPrice.symbol == symbol)
            .order_by(MetalPrice.fetched_at.desc())
            .limit(500)
        )
        history = [
            {"date": p.fetched_at.strftime("%Y-%m-%d"), "price": p.price}
            for p in reversed(session.exec(stmt).all())
            if p.fetched_at.date() >= cutoff
        ]

    points = _dedupe_by_date([{"date": row["date"], "price": row["price"]} for row in history])
    prices = [point["price"] for point in points]
    first = prices[0] if prices else None
    last = prices[-1] if prices else None
    change_pct = ((last - first) / first * 100) if first and last is not None and first != 0 else None
    return {
        "symbol": symbol,
        "source": source,
        "count": len(points),
        "first": first,
        "last": last,
        "high": max(prices) if prices else None,
        "low": min(prices) if prices else None,
        "change_pct": change_pct,
        "points": _downsample(points),
    }


def _reference_trend(symbol: str, period: str, session: Session) -> dict:
    """Trend built from stored monthly averages; no network call."""
    cutoff = date.today() - timedelta(days=_PERIOD_DAYS.get(period, 366))
    rows = _reference_rows(session, symbol, cutoff)
    points = [{"date": row.fetched_at.strftime("%Y-%m-%d"), "price": row.price} for row in rows]
    prices = [point["price"] for point in points]
    first = prices[0] if prices else None
    last = prices[-1] if prices else None
    change_pct = ((last - first) / first * 100) if first and last is not None and first != 0 else None
    return {
        "symbol": symbol,
        "source": rows[-1].source if rows else "reference",
        "count": len(points),
        "first": first,
        "last": last,
        "high": max(prices) if prices else None,
        "low": min(prices) if prices else None,
        "change_pct": change_pct,
        "points": _downsample(points),
    }


@router.get("/trends")
async def get_price_trends(
    period: str = Query(default="3mo", pattern="^(1mo|3mo|6mo|1y|2y|5y)$"),
    basis: str = Query(default="live", pattern=_BASIS_PATTERN),
    session: Session = Depends(get_session),
):
    """Compact per-symbol trend series and change stats for every tracked metal.

    On the live basis, Yahoo-backed symbols come from the chart API and the
    rest fall back to the per-refresh snapshots accumulated in the local DB
    (deduplicated by day). On the reference basis every series is the stored
    monthly averages, so no network call is made.
    """

    if basis == "reference":
        trends = [_reference_trend(symbol, period, session) for symbol in TRACKED_SYMBOLS]
        return {"period": period, "basis": basis, "trends": {trend["symbol"]: trend for trend in trends}}

    cached = _trends_cache.get(period)
    if cached and time.monotonic() - cached[0] < _TRENDS_TTL_SECONDS:
        return cached[1]

    # One JM request covers every PGM, so fetch it before fanning out.
    jm_history = await fetch_johnson_matthey_history(
        date.today() - timedelta(days=_PERIOD_DAYS.get(period, 366)), date.today()
    )
    trends = await asyncio.gather(
        *[_symbol_trend(symbol, period, session, jm_history) for symbol in TRACKED_SYMBOLS]
    )
    payload = {"period": period, "basis": basis, "trends": {trend["symbol"]: trend for trend in trends}}
    _trends_cache[period] = (time.monotonic(), payload)
    return payload


# Tokens that look like element symbols but are route/reaction acronyms in
# benchmark candidate names (WGS, USY w/ RE, PEM, ...). Skipped during the scan.
_USAGE_STOPWORDS = {
    "AEM", "CCM", "FCC", "FTS", "GDE", "GDL", "HDO", "HER", "LDH", "MEA", "MTH",
    "MTO", "NRR", "OER", "ORR", "PDH", "PEM", "PGM", "PROX", "RE", "SCR", "SMR",
    "USY", "WGS", "RWGS",
}
_SYMBOL_PATTERNS = {
    symbol: re.compile(rf"(?<![A-Za-z]){symbol}(?![a-z])") for symbol in TRACKED_SYMBOLS
}
_ELEMENT_NAMES = {
    "Pt": "platinum", "Pd": "palladium", "Rh": "rhodium", "Ru": "ruthenium",
    "Ir": "iridium", "Au": "gold", "Ag": "silver", "Ni": "nickel",
    "Co": "cobalt", "Cu": "copper", "Al": "aluminum", "Mo": "molybdenum",
    "W": "tungsten", "Fe": "iron", "Zn": "zinc", "Sn": "tin",
    "V": "vanadium", "Re": "rhenium",
}


@lru_cache(maxsize=1)
def _usage_map() -> dict[str, list[dict]]:
    usage: dict[str, list[dict]] = {symbol: [] for symbol in TRACKED_SYMBOLS}
    for catalog in list_benchmark_catalogs():
        texts: list[str] = []
        for candidate in catalog.get("candidates", []):
            texts.append(str(candidate.get("title", "")))
            for component in candidate.get("components", []):
                texts.append(str(component.get("name", "")))
        matched: set[str] = set()
        for text in texts:
            lowered = text.lower()
            tokens = [token for token in re.split(r"[^A-Za-z0-9]+", text) if token]
            for symbol in TRACKED_SYMBOLS:
                if symbol in matched:
                    continue
                if any(
                    token not in _USAGE_STOPWORDS and _SYMBOL_PATTERNS[symbol].search(token)
                    for token in tokens
                ) or _ELEMENT_NAMES[symbol] in lowered:
                    matched.add(symbol)
        entry = {
            "family": catalog["family"],
            "title": catalog["title"],
            "reaction": catalog.get("reaction", ""),
        }
        for symbol in matched:
            usage[symbol].append(entry)
    return usage


@router.get("/supports")
def get_support_prices(
    basis: str = Query(default="reference", pattern=_BASIS_PATTERN),
    session: Session = Depends(get_session),
):
    """Support-material unit-value series with their latest stored month.

    Only the reference basis carries these; on the live basis every series
    reports no value, since supports have no daily quote.
    """
    catalog = load_support_series()
    out = []
    for entry in catalog["series"]:
        latest = None
        if basis == "reference":
            rows = _reference_rows(session, entry["id"])
            latest = rows[-1] if rows else None
        out.append({
            "id": entry["id"],
            "hs": entry["hs"],
            "name": entry["name"],
            "material": entry["material"],
            "library_keys": entry.get("library_keys", []),
            "note": entry.get("note", ""),
            "unit": catalog["unit"],
            "price": latest.price if latest else None,
            "basis_month": latest.fetched_at.strftime("%Y-%m") if latest else None,
            "source": latest.source if latest else None,
            "months": len(_reference_rows(session, entry["id"])) if basis == "reference" else 0,
        })
    return {"basis": basis, "source": catalog["source"], "series": out}


@router.get("/usage")
def get_price_usage():
    """Map each tracked metal to the reaction families whose benchmark
    candidates name it in a composition or candidate title."""

    return {"usage": _usage_map()}


@router.get("/{symbol}")
def get_price(
    symbol: str,
    basis: str = Query(default="live", pattern=_BASIS_PATTERN),
    session: Session = Depends(get_session),
):
    """Get latest price for a specific metal in one basis."""
    symbol = _normalize(symbol)
    stmt = (
        select(MetalPrice)
        .where(MetalPrice.symbol == symbol, MetalPrice.basis == basis)
        .order_by(MetalPrice.fetched_at.desc())
        .limit(1)
    )
    p = session.exec(stmt).first()
    latest_reference_month = _latest_reference_month(session) if basis == "reference" else None
    if p:
        return _serialize_price_row(
            symbol=p.symbol,
            name=p.name,
            price=p.price,
            unit=p.unit,
            source=p.source,
            fetched_at=p.fetched_at.isoformat(),
            basis=basis,
            latest_reference_month=latest_reference_month,
        )
    refs = get_reference_prices()
    if symbol not in refs:
        raise HTTPException(status_code=404, detail=f"Metal '{symbol}' not found")
    info = refs[symbol]
    return _serialize_price_row(
        symbol=symbol,
        name=info["name"],
        price=info["price"],
        unit=info["unit"],
        source=info["source"],
        fetched_at=info["fetched_at"],
        basis=basis,
        latest_reference_month=latest_reference_month,
    )


@router.get("/{symbol}/history")
async def get_price_history(
    symbol: str,
    period: str = Query(default="1y", pattern="^(1mo|3mo|6mo|1y|2y|5y)$"),
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    basis: str = Query(default="live", pattern=_BASIS_PATTERN),
    session: Session = Depends(get_session),
):
    """Return price history: live feeds or DB records, or stored monthly averages on the reference basis."""
    symbol = _normalize(symbol)
    if from_date is not None and to_date is not None and from_date > to_date:
        raise HTTPException(status_code=422, detail="'from' must be on or before 'to'")

    if basis == "reference":
        rows = _reference_rows(session, symbol, date.today() - timedelta(days=_PERIOD_DAYS.get(period, 366)))
        history = _filter_history_range(
            [
                {
                    "date": row.fetched_at.strftime("%Y-%m-%d"),
                    "price": row.price,
                    "open": row.price,
                    "high": row.price,
                    "low": row.price,
                }
                for row in rows
            ],
            from_date,
            to_date,
        )
        if not history:
            raise HTTPException(status_code=404, detail=f"No reference history for '{symbol}'")
        return {
            "symbol": symbol,
            "period": period,
            "source": rows[-1].source,
            "count": len(history),
            "history": history,
        }

    # Try yfinance live history first (covers Pt, Pd, Au, Ag, Cu, Al)
    live_history = await fetch_history(symbol, period)
    if live_history:
        filtered_history = _filter_history_range(live_history, from_date, to_date)
        return {
            "symbol": symbol,
            "period": period,
            "source": "Yahoo Finance",
            "count": len(filtered_history),
            "history": filtered_history,
        }

    # Same market-series fallbacks the trends endpoint uses, so the detail
    # chart and the sparkline never disagree about a metal's history.
    cutoff = date.today() - timedelta(days=_PERIOD_DAYS.get(period, 366))
    market_history: list[dict] = []
    market_source = ""
    if symbol in JM_HISTORY_SYMBOLS:
        jm_series = await fetch_johnson_matthey_history(cutoff, date.today())
        market_history = jm_series.get(symbol, [])
        market_source = "Johnson Matthey"
    elif symbol in WESTMETALL_FIELDS:
        market_history = [
            row
            for row in await fetch_westmetall_history(symbol)
            if date.fromisoformat(row["date"]) >= cutoff
        ]
        market_source = "Westmetall (LME)"
    if market_history:
        rows = [
            {"date": row["date"], "price": row["price"], "open": row["price"],
             "high": row["price"], "low": row["price"]}
            for row in market_history
        ]
        filtered_history = _filter_history_range(rows, from_date, to_date)
        # A from/to window predating the market series falls through to the
        # DB snapshots instead of returning an empty chart.
        if filtered_history:
            return {
                "symbol": symbol,
                "period": period,
                "source": market_source,
                "count": len(filtered_history),
                "history": filtered_history,
            }

    # Fall back to DB collected history
    stmt = (
        select(MetalPrice)
        .where(MetalPrice.symbol == symbol)
        .order_by(MetalPrice.fetched_at.desc())
        .limit(500)
    )
    db_rows = list(reversed(session.exec(stmt).all()))
    if db_rows:
        history = _filter_history_range(
            [
                {
                    "date": p.fetched_at.strftime("%Y-%m-%d"),
                    "price": p.price,
                    "open": p.price,
                    "high": p.price,
                    "low": p.price,
                }
                for p in db_rows
            ],
            from_date,
            to_date,
        )
        return {
            "symbol": symbol,
            "period": period,
            "source": "DB cache",
            "count": len(history),
            "history": history,
        }

    raise HTTPException(status_code=404, detail=f"No history for '{symbol}'")
