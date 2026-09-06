"""Metal price fetcher with live market feeds and CatCost fallbacks."""

from __future__ import annotations

import asyncio
import calendar
import html as html_lib
import json
import logging
import re
from datetime import UTC, date, datetime
from functools import lru_cache

import httpx

from backend.config import settings
from backend.core.constants import LB_PER_METRIC_TON
from backend.core.reference_basis import latest_common_month, monthly_average, truncate_series
from backend.paths import data_dir

logger = logging.getLogger(__name__)
_DATA_DIR = data_dir()
_HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

# (symbol, ticker, name, unit, price_factor)
YAHOO_METALS: list[tuple[str, str, str, str, float]] = [
    ("Pt", "PL=F", "Platinum", "$/troy_oz", 1.0),
    ("Pd", "PA=F", "Palladium", "$/troy_oz", 1.0),
    ("Au", "GC=F", "Gold", "$/troy_oz", 1.0),
    ("Ag", "SI=F", "Silver", "$/troy_oz", 1.0),
    ("Cu", "HG=F", "Copper", "$/lb", 1.0),
    # ALI=F is quoted in USD per metric ton.
    ("Al", "ALI=F", "Aluminum", "$/lb", 1 / LB_PER_METRIC_TON),
]

_NAMES: dict[str, str] = {
    "Au": "Gold",
    "Ag": "Silver",
    "Pt": "Platinum",
    "Pd": "Palladium",
    "Rh": "Rhodium",
    "Ir": "Iridium",
    "Ru": "Ruthenium",
    "Ni": "Nickel",
    "Co": "Cobalt",
    "Cu": "Copper",
    "Al": "Aluminum",
    "Mo": "Molybdenum",
    "W": "Tungsten",
    "Fe": "Iron",
    "Zn": "Zinc",
    "Sn": "Tin",
    "V": "Vanadium",
    "Re": "Rhenium",
}
_UNITS: dict[str, str] = {
    "Au": "$/troy_oz",
    "Ag": "$/troy_oz",
    "Pt": "$/troy_oz",
    "Pd": "$/troy_oz",
    "Rh": "$/troy_oz",
    "Ir": "$/troy_oz",
    "Ru": "$/troy_oz",
    "Ni": "$/lb",
    "Co": "$/lb",
    "Cu": "$/lb",
    "Al": "$/lb",
    "Mo": "$/lb",
    "W": "$/lb",
    "Fe": "$/lb",
    "Zn": "$/lb",
    "Sn": "$/lb",
    "V": "$/lb",
    "Re": "$/lb",
}

# CatCost 2018 reference prices, escalated with ChemPPI when live data is unavailable.
_CATCOST_REF: dict[str, float] = {
    "Au": 1200.8,
    "Ir": 1440.0,
    "Pd": 975.0,
    "Pt": 793.5,
    "Rh": 2390.0,
    "Ru": 260.0,
    "Ag": 14.58,
    "Al": 0.96,
    "Co": 29.6,
    "Cu": 2.75,
    "Fe": 0.0475,
    "Mo": 12.0,
    "Ni": 6.08,
    "W": 24.04,
}


def metal_name(symbol: str) -> str:
    return _NAMES.get(symbol, symbol)


@lru_cache(maxsize=1)
def load_support_series() -> dict:
    """Support-material unit-value series definitions (backend/data/support_series.json)."""
    with open(_DATA_DIR / "support_series.json", encoding="utf-8") as handle:
        return json.load(handle)


COMTRADE_API = "https://comtradeapi.un.org/data/v1/get/C/M/HS"


async def fetch_comtrade_unit_values(
    hs_code: str,
    periods: list[str],
    api_key: str,
    reporter_code: str = "842",
) -> list[dict]:
    """Monthly import unit values ($/kg) for one HS code from UN Comtrade Plus.

    ``periods`` are YYYYMM strings, at most twelve per call (the API limit).
    """
    if not periods:
        return []
    try:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True, headers=_HTTP_HEADERS) as client:
            resp = await client.get(
                COMTRADE_API,
                params={
                    "reporterCode": reporter_code,
                    "partnerCode": "0",
                    "partner2Code": "0",
                    "cmdCode": hs_code,
                    "flowCode": "M",
                    "period": ",".join(periods[:12]),
                    "customsCode": "C00",
                    "motCode": "0",
                },
                headers={"Ocp-Apim-Subscription-Key": api_key},
            )
            resp.raise_for_status()
            rows = resp.json().get("data", [])
    except (httpx.HTTPError, json.JSONDecodeError, ValueError) as e:
        logger.warning("Comtrade %s failed: %s", hs_code, e)
        return []
    points = _parse_comtrade_rows(rows)
    logger.info("Comtrade %s: %d months", hs_code, len(points))
    return points


def _parse_comtrade_rows(rows: list[dict]) -> list[dict]:
    """Customs value over net weight per month, dated at month end; rows without weight are skipped."""
    points: list[dict] = []
    for row in rows:
        try:
            period = str(row["period"])
            net_kg = float(row.get("netWgt") or 0)
            value = float(row.get("primaryValue") or 0)
        except (KeyError, TypeError, ValueError):
            continue
        if net_kg <= 0 or value <= 0 or len(period) != 6:
            continue
        year, month = int(period[:4]), int(period[4:])
        day = date(year, month, calendar.monthrange(year, month)[1])
        points.append({"date": day.isoformat(), "price": round(value / net_kg, 4)})
    points.sort(key=lambda p: p["date"])
    return points


def _utc_now_iso() -> str:
    """Return the current UTC timestamp as a timezone-aware ISO string."""

    return datetime.now(UTC).isoformat()


# Contained-metal bulk anchors from USGS Mineral Commodity Summaries 2026
# (published February 2026; 2025 annual averages). These metals have no free
# quote at any frequency, so the newest published government statistic beats
# escalating the 2018 CatCost value across eight volatile years.
_USGS_REF: dict[str, float] = {
    "Co": 21.0,    # U.S. spot cathode, $/lb (Platts via USGS)
    "Mo": 23.13,   # molybdic oxide $51/kg; USGS quotes contained Mo (Platts basis), so no oxide correction
    "W": 21.74,    # Rotterdam WO3 concentrate $380/mtu at 7.93 kg W per mtu
    "Zn": 1.30,    # LME cash 130 c/lb; fallback under the live Westmetall feed
    "Sn": 15.00,   # LME cash 1,500 c/lb; fallback under the live Westmetall feed
    "V": 8.96,     # V2O5 $5.02/lb at 56.0% contained V
    "Re": 1179.4,  # metal powder, 99.99%, $2,600/kg
}
_USGS_SOURCE = "USGS MCS 2026 (2025 avg)"


def _escalate(price_2018: float) -> float:
    """Scale a 2018 price to today using the ChemPPI index."""
    try:
        with open(_DATA_DIR / "chemppi.json", encoding="utf-8") as f:
            annual = json.load(f).get("annual", {})
        base = float(annual.get("2018", 0))
        latest_year = max(int(year) for year in annual if annual[year])
        latest = float(annual.get(str(latest_year), 0))
        if base and latest:
            return round(price_2018 * (latest / base), 4)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        logger.warning("ChemPPI escalation skipped (%s): %s", type(exc).__name__, exc)
    return price_2018


def _latest_non_null(values: list[float | None]) -> float | None:
    for value in reversed(values):
        if value is not None:
            return float(value)
    return None


def _timestamp_to_iso(timestamp: int | None) -> str:
    if timestamp:
        return datetime.fromtimestamp(timestamp, tz=UTC).isoformat()
    return _utc_now_iso()


def _extract_yahoo_quote(payload: dict, factor: float) -> tuple[float | None, str]:
    result = ((payload.get("chart") or {}).get("result") or [None])[0] or {}
    meta = result.get("meta") or {}
    indicators = result.get("indicators") or {}
    quote_block = (indicators.get("quote") or [{}])[0]
    closes = quote_block.get("close") or []

    raw_price = meta.get("regularMarketPrice")
    if raw_price in (None, 0):
        raw_price = _latest_non_null(closes)
    if raw_price in (None, 0):
        return None, _utc_now_iso()

    market_ts = meta.get("regularMarketTime") or meta.get("currentTradingPeriod", {}).get("regular", {}).get("end")
    return round(float(raw_price) * factor, 4), _timestamp_to_iso(market_ts)


def _extract_yahoo_history(payload: dict, factor: float) -> list[dict]:
    result = ((payload.get("chart") or {}).get("result") or [None])[0] or {}
    timestamps = result.get("timestamp") or []
    indicators = result.get("indicators") or {}
    quote_block = (indicators.get("quote") or [{}])[0]
    opens = quote_block.get("open") or []
    highs = quote_block.get("high") or []
    lows = quote_block.get("low") or []
    closes = quote_block.get("close") or []

    history: list[dict] = []
    for idx, ts in enumerate(timestamps):
        close = closes[idx] if idx < len(closes) else None
        if close is None:
            continue
        open_ = opens[idx] if idx < len(opens) and opens[idx] is not None else close
        high = highs[idx] if idx < len(highs) and highs[idx] is not None else close
        low = lows[idx] if idx < len(lows) and lows[idx] is not None else close
        history.append({
            "date": datetime.fromtimestamp(ts, tz=UTC).strftime("%Y-%m-%d"),
            "price": round(float(close) * factor, 4),
            "open": round(float(open_) * factor, 4),
            "high": round(float(high) * factor, 4),
            "low": round(float(low) * factor, 4),
        })
    return history


async def _fetch_yahoo_quote(
    client: httpx.AsyncClient,
    sym: str,
    ticker: str,
    name: str,
    unit: str,
    factor: float,
) -> dict[str, dict]:
    resp = await client.get(
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}",
        params={"range": "5d", "interval": "1d", "includePrePost": "false"},
    )
    resp.raise_for_status()
    price, fetched_at = _extract_yahoo_quote(resp.json(), factor)
    if price is None:
        return {}
    return {
        sym: {
            "name": name,
            "price": price,
            "unit": unit,
            "source": "Yahoo Finance (live)",
            "ticker": ticker,
            "fetched_at": fetched_at,
        }
    }


async def fetch_yfinance() -> dict[str, dict]:
    """Fetch live futures-backed quotes from the Yahoo chart API."""
    results: dict[str, dict] = {}
    async with httpx.AsyncClient(timeout=20, headers=_HTTP_HEADERS) as client:
        tasks = [
            _fetch_yahoo_quote(client, sym, ticker, name, unit, factor)
            for sym, ticker, name, unit, factor in YAHOO_METALS
        ]
        for item in await asyncio.gather(*tasks, return_exceptions=True):
            if isinstance(item, Exception):
                logger.debug("Yahoo Finance fetch failed: %s", item)
                continue
            results.update(item)

    logger.info("Yahoo Finance: %d metals -> %s", len(results), list(results))
    return results


async def fetch_metals_dev() -> dict[str, dict]:
    api_key = settings.metals_dev_api_key
    if not api_key:
        raise ValueError("METALS_DEV_API_KEY not set")
    async with httpx.AsyncClient(timeout=30, headers=_HTTP_HEADERS) as client:
        resp = await client.get(
            "https://api.metals.dev/v1/latest",
            params={"api_key": api_key, "currency": "USD", "unit": "toz"},
        )
        resp.raise_for_status()
        raw = resp.json().get("metals", {})
    name_to_sym = {
        "gold": "Au",
        "silver": "Ag",
        "platinum": "Pt",
        "palladium": "Pd",
        "rhodium": "Rh",
        "iridium": "Ir",
        "ruthenium": "Ru",
        "nickel": "Ni",
        "cobalt": "Co",
        "copper": "Cu",
        "aluminum": "Al",
        "molybdenum": "Mo",
        "tungsten": "W",
    }
    results: dict[str, dict] = {}
    for raw_name, sym in name_to_sym.items():
        val = raw.get(raw_name)
        if val:
            results[sym] = {
                "name": _NAMES.get(sym, sym),
                "price": round(float(val), 4),
                "unit": _UNITS.get(sym, "$/troy_oz"),
                "source": "Metals.Dev",
                "fetched_at": _utc_now_iso(),
            }
    return results


async def fetch_metalprice_api() -> dict[str, dict]:
    api_key = settings.metalprice_api_key
    if not api_key:
        raise ValueError("METALPRICE_API_KEY not set")
    async with httpx.AsyncClient(timeout=30, headers=_HTTP_HEADERS) as client:
        resp = await client.get(
            "https://api.metalpriceapi.com/v1/latest",
            params={"api_key": api_key, "base": "USD"},
        )
        resp.raise_for_status()
        rates = resp.json().get("rates", {})
    iso_map = {"XPT": "Pt", "XPD": "Pd", "XAU": "Au", "XAG": "Ag"}
    results: dict[str, dict] = {}
    for iso, sym in iso_map.items():
        rate = rates.get(f"USD{iso}") or rates.get(iso)
        if rate and float(rate) > 0:
            results[sym] = {
                "name": _NAMES.get(sym, sym),
                "price": round(1.0 / float(rate), 4),
                "unit": "$/troy_oz",
                "source": "MetalpriceAPI",
                "fetched_at": _utc_now_iso(),
            }
    return results


async def fetch_kitco() -> dict[str, dict]:
    """Scrape Kitco's precious-metals page for current spot prices."""
    url = "https://www.kitco.com/price/precious-metals"
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=_HTTP_HEADERS) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text

        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
        if not match:
            logger.warning("Kitco: __NEXT_DATA__ not found in page")
            return {}

        data = json.loads(match.group(1))
        queries = (
            data.get("props", {})
            .get("pageProps", {})
            .get("dehydratedState", {})
            .get("queries", [])
        )

        metals_data = None
        for query in queries:
            qkey = query.get("queryKey", [])
            if isinstance(qkey, list) and "allMetalsQuote" in qkey:
                metals_data = query.get("state", {}).get("data", {})
                break

        if not metals_data:
            logger.warning("Kitco: allMetalsQuote query not found")
            return {}

        results: dict[str, dict] = {}
        kitco_map = {
            "rhodium": ("Rh", "Rhodium", "$/troy_oz"),
            "platinum": ("Pt", "Platinum", "$/troy_oz"),
            "palladium": ("Pd", "Palladium", "$/troy_oz"),
            "gold": ("Au", "Gold", "$/troy_oz"),
            "silver": ("Ag", "Silver", "$/troy_oz"),
        }

        for kitco_name, (sym, name, unit) in kitco_map.items():
            metal_obj = metals_data.get(kitco_name, {})
            entries = metal_obj.get("results", [])
            if not entries:
                continue
            entry = entries[0]
            bid = entry.get("bid")
            ask = entry.get("ask")
            mid = entry.get("mid")
            if mid and float(mid) > 0:
                price = float(mid)
            elif bid and ask and float(bid) > 0:
                price = (float(bid) + float(ask)) / 2
            elif bid and float(bid) > 0:
                price = float(bid)
            else:
                continue
            results[sym] = {
                "name": name,
                "price": round(price, 4),
                "unit": unit,
                "source": "Kitco (live)",
                "fetched_at": _utc_now_iso(),
            }

        logger.info("Kitco: %d metals -> %s", len(results), list(results))
        return results
    except (httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning("Kitco scraper failed: %s", e)
        return {}


async def fetch_kitco_base() -> dict[str, dict]:
    """Keep the old base-metals stub for compatibility."""
    return {}


def _parse_johnson_matthey_current_prices(page_html: str) -> dict[str, dict]:
    match = re.search(r'id="currentMetalPrices"[^>]*value="([^"]+)"', page_html)
    if not match:
        return {}

    raw_value = html_lib.unescape(match.group(1))
    try:
        payload = json.loads(raw_value)
    except json.JSONDecodeError:
        return {}

    metal_map = {
        "Pt": ("Platinum", "$/troy_oz"),
        "Pd": ("Palladium", "$/troy_oz"),
        "Rh": ("Rhodium", "$/troy_oz"),
        "Ru": ("Ruthenium", "$/troy_oz"),
        "Ir": ("Iridium", "$/troy_oz"),
    }

    results: dict[str, dict] = {}
    for item in payload.get("currentMetalList", []):
        code = item.get("metalCode")
        if code not in metal_map or code in results:
            continue

        price = item.get("price")
        date_str = item.get("metalValueDate")
        if not price:
            continue

        fetched_at = None
        if date_str:
            try:
                fetched_at = datetime.strptime(date_str, "%d/%m/%Y").replace(tzinfo=UTC).isoformat()
            except ValueError:
                fetched_at = None

        name, unit = metal_map[code]
        results[code] = {
            "name": name,
            "price": round(float(price), 4),
            "unit": unit,
            "source": "Johnson Matthey (live)",
            "fetched_at": fetched_at or _utc_now_iso(),
        }
    return results


async def fetch_johnson_matthey() -> dict[str, dict]:
    """Fetch current PGM prices from Johnson Matthey's PGM management page."""
    url = "https://matthey.com/products-and-markets/pgms-and-circularity/pgm-management"
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=True, headers=_HTTP_HEADERS) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text
        results = _parse_johnson_matthey_current_prices(html)
        logger.info("Johnson Matthey: %d metals -> %s", len(results), list(results))
        return results
    except (httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning("Johnson Matthey scraper failed: %s", e)
        return {}


def _parse_markets_insider_quote(
    html: str,
    *,
    symbol: str,
    name: str,
    unit: str,
    factor: float,
) -> dict | None:
    match = re.search(r'price-section__current-value">\s*([0-9][0-9,]*(?:\.[0-9]+)?)', html)
    if not match:
        return None

    raw_price = float(match.group(1).replace(",", ""))
    time_match = re.search(
        r'price-section__additionals.*?<span>\s*([^<]+)\s*</span>\s*<span>\s*MI Indication\s*</span>',
        html,
        re.S,
    )
    return {
        "symbol": symbol,
        "name": name,
        "price": round(raw_price * factor, 4),
        "unit": unit,
        "source": "Markets Insider (live)",
        "fetched_at": _utc_now_iso(),
        "market_hint": time_match.group(1).strip() if time_match else None,
    }


async def fetch_markets_insider() -> dict[str, dict]:
    """Fetch free market data from Markets Insider commodity pages."""
    sources = [
        {
            "symbol": "Ni",
            "name": "Nickel",
            "url": "https://markets.businessinsider.com/commodities/nickel-price",
            "unit": "$/lb",
            "factor": 1 / LB_PER_METRIC_TON,
        },
    ]

    results: dict[str, dict] = {}
    async with httpx.AsyncClient(timeout=20, headers=_HTTP_HEADERS, follow_redirects=True) as client:
        for source in sources:
            try:
                resp = await client.get(source["url"])
                resp.raise_for_status()
                quote = _parse_markets_insider_quote(
                    resp.text,
                    symbol=source["symbol"],
                    name=source["name"],
                    unit=source["unit"],
                    factor=source["factor"],
                )
                if quote:
                    results[source["symbol"]] = quote
            except (httpx.HTTPError, ValueError) as e:
                logger.warning("Markets Insider %s failed: %s", source["symbol"], e)

    logger.info("Markets Insider: %d metals -> %s", len(results), list(results))
    return results


def get_reference_prices() -> dict[str, dict]:
    """Return all metals priced from the newest usable public reference."""
    symbols = list(_CATCOST_REF) + [sym for sym in _USGS_REF if sym not in _CATCOST_REF]
    return {
        sym: {
            "name": _NAMES.get(sym, sym),
            "price": (
                _USGS_REF[sym] if sym in _USGS_REF else _escalate(_CATCOST_REF[sym])
            ),
            "unit": _UNITS.get(sym, "$/troy_oz"),
            "source": (
                _USGS_SOURCE if sym in _USGS_REF else "CatCost 2018 + ChemPPI escalation"
            ),
            "fetched_at": None,
        }
        for sym in symbols
    }


async def fetch_all_prices() -> dict[str, dict]:
    """Fetch prices from all available sources using a layered fallback strategy."""
    results = get_reference_prices()

    if settings.metals_dev_api_key:
        try:
            results.update(await fetch_metals_dev())
        except (httpx.HTTPError, ValueError, KeyError) as e:
            logger.warning("Metals.Dev failed: %s", e)

    yahoo_task = asyncio.create_task(fetch_yfinance())
    kitco_task = asyncio.create_task(fetch_kitco())
    jm_task = asyncio.create_task(fetch_johnson_matthey())
    mi_task = asyncio.create_task(fetch_markets_insider())
    wm_task = asyncio.create_task(fetch_westmetall())

    yahoo_data, kitco_data, jm_data, mi_data, wm_data = await asyncio.gather(
        yahoo_task,
        kitco_task,
        jm_task,
        mi_task,
        wm_task,
        return_exceptions=True,
    )

    if isinstance(yahoo_data, dict):
        results.update(yahoo_data)
    else:
        logger.warning("Yahoo Finance failed: %s", yahoo_data)

    if isinstance(kitco_data, dict):
        for sym, data in kitco_data.items():
            existing_src = results.get(sym, {}).get("source", "")
            if "CatCost" in existing_src or sym == "Rh":
                results[sym] = data
    else:
        logger.warning("Kitco failed: %s", kitco_data)

    if isinstance(jm_data, dict):
        for sym, data in jm_data.items():
            existing_src = results.get(sym, {}).get("source", "")
            if sym in {"Pt", "Pd", "Ru", "Ir"} or "CatCost" in existing_src:
                results[sym] = data
    else:
        logger.warning("Johnson Matthey failed: %s", jm_data)

    if isinstance(mi_data, dict):
        for sym, data in mi_data.items():
            existing_src = results.get(sym, {}).get("source", "")
            if "CatCost" in existing_src:
                results[sym] = data
    else:
        logger.warning("Markets Insider failed: %s", mi_data)

    if isinstance(wm_data, dict):
        for sym, data in wm_data.items():
            existing_src = results.get(sym, {}).get("source", "")
            if sym in {"Cu", "Al"} or "CatCost" in existing_src or "USGS" in existing_src:
                results[sym] = data
    else:
        logger.warning("Westmetall failed: %s", wm_data)

    if settings.metalprice_api_key:
        try:
            backup = await fetch_metalprice_api()
            for sym, data in backup.items():
                existing_src = results.get(sym, {}).get("source", "")
                if "CatCost" in existing_src:
                    results[sym] = data
        except (httpx.HTTPError, ValueError, KeyError) as e:
            logger.warning("MetalpriceAPI failed: %s", e)

    live_count = sum(1 for value in results.values() if "CatCost" not in value.get("source", ""))
    logger.info("fetch_all_prices: %d total, %d live", len(results), live_count)
    return results


JM_HISTORY_SYMBOLS = ("Ru", "Ir", "Rh", "Pd", "Pt")
WESTMETALL_FIELDS: dict[str, str] = {
    "Cu": "LME_Cu_cash",
    "Al": "LME_Al_cash",
    "Ni": "LME_Ni_cash",
    "Zn": "LME_Zn_cash",
    "Sn": "LME_Sn_cash",
}
# IMF Primary Commodity Price System monthly averages: symbol -> (indicator,
# app unit, factor from the published unit). Base metals publish per tonne
# (PCOBA's codelist entry says "per pound" but the values are per tonne);
# gold and silver publish per troy ounce.
IMF_PCPS_SERIES: dict[str, tuple[str, str, float]] = {
    "Al": ("PALUM", "$/lb", 1 / LB_PER_METRIC_TON),
    "Cu": ("PCOPP", "$/lb", 1 / LB_PER_METRIC_TON),
    "Ni": ("PNICK", "$/lb", 1 / LB_PER_METRIC_TON),
    "Zn": ("PZINC", "$/lb", 1 / LB_PER_METRIC_TON),
    "Sn": ("PTIN", "$/lb", 1 / LB_PER_METRIC_TON),
    "Co": ("PCOBA", "$/lb", 1 / LB_PER_METRIC_TON),
    "Mo": ("PLMMODY", "$/lb", 1 / LB_PER_METRIC_TON),
    "Au": ("PGOLD", "$/troy_oz", 1.0),
    "Ag": ("PSILVER", "$/troy_oz", 1.0),
}


async def fetch_johnson_matthey_history(start: date, end: date) -> dict[str, list[dict]]:
    """Return daily Johnson Matthey base-price history for the five PGMs.

    The chart portlet keeps its data behind a Liferay resource URL that the page
    renders into `#getUrl`; posting the date range and metal codes to it returns
    the whole daily series as JSON.
    """
    url = "https://matthey.com/products-and-markets/pgms-and-circularity/pgm-management"
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=_HTTP_HEADERS) as client:
            page = (await client.get(url)).text
            portlet = re.search(r'id="getPortletId"[^>]*value="([^"]+)"', page)
            resource = re.search(r'id="getUrl"[^>]*>(.*?)</', page, re.S)
            if not (portlet and resource):
                logger.warning("Johnson Matthey history: portlet handles missing")
                return {}
            portlet_id = portlet.group(1)
            payload = {
                f"{portlet_id}selectedMetal{i}": code
                for i, code in enumerate(JM_HISTORY_SYMBOLS)
            }
            payload[f"{portlet_id}start_Date"] = start.strftime("%d-%m-%Y")
            payload[f"{portlet_id}end_Date"] = end.strftime("%d-%m-%Y")
            resp = await client.post(
                html_lib.unescape(resource.group(1).strip()),
                data=payload,
                headers={"X-Requested-With": "XMLHttpRequest"},
            )
            resp.raise_for_status()
            rows = resp.json().get("metalList", [])
    except (httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning("Johnson Matthey history failed: %s", e)
        return {}

    series = _parse_johnson_matthey_history(rows)
    logger.info(
        "Johnson Matthey history: %s",
        {sym: len(points) for sym, points in series.items()},
    )
    return series


def _parse_johnson_matthey_history(rows: list[dict]) -> dict[str, list[dict]]:
    """Group JM `metalList` rows into an ascending per-symbol daily series."""
    series: dict[str, list[dict]] = {}
    for row in rows:
        try:
            day = datetime.strptime(row["metalValueDate"], "%d/%m/%Y").date()
            price = float(row["price"])
        except (KeyError, TypeError, ValueError):
            continue
        series.setdefault(row.get("metalCode", ""), []).append(
            {"date": day.isoformat(), "price": price}
        )
    for points in series.values():
        points.sort(key=lambda p: p["date"])
    return series


async def fetch_westmetall_history(symbol: str) -> list[dict]:
    """Return daily LME settlement history for a base metal, in the app's unit."""
    field = WESTMETALL_FIELDS.get(symbol)
    if not field:
        return []
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=True, headers=_HTTP_HEADERS) as client:
            resp = await client.get(
                "https://www.westmetall.com/en/markdaten.php",
                params={"action": "table", "field": field},
            )
            resp.raise_for_status()
            page = resp.text
    except httpx.HTTPError as e:
        logger.warning("Westmetall history(%s) failed: %s", symbol, e)
        return []

    points = _parse_westmetall_table(page)
    logger.info("Westmetall history(%s): %d points", symbol, len(points))
    return points


def _parse_westmetall_table(page: str) -> list[dict]:
    """Parse Westmetall's LME settlement table into ascending $/lb points."""
    points: list[dict] = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", page, re.S):
        cells = [re.sub(r"<[^>]+>", "", c).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
        if len(cells) < 2:
            continue
        try:
            day = datetime.strptime(cells[0].replace(".", ""), "%d %B %Y").date()
            per_tonne = float(cells[1].replace(",", ""))
        except ValueError:
            continue
        points.append({"date": day.isoformat(), "price": round(per_tonne / LB_PER_METRIC_TON, 4)})
    points.sort(key=lambda p: p["date"])
    return points


async def fetch_imf_pcps_history(symbol: str, start: date) -> list[dict]:
    """Return monthly-average history from the IMF Primary Commodity Price System, in the app unit."""
    entry = IMF_PCPS_SERIES.get(symbol)
    if not entry:
        return []
    indicator, _unit, factor = entry
    try:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True, headers=_HTTP_HEADERS) as client:
            resp = await client.get(
                f"https://api.imf.org/external/sdmx/2.1/data/IMF.RES,PCPS/G001.{indicator}.USD.M",
                params={"startPeriod": start.strftime("%Y-%m")},
                headers={"Accept": "application/xml"},
            )
            resp.raise_for_status()
            page = resp.text
    except httpx.HTTPError as e:
        logger.warning("IMF PCPS history(%s) failed: %s", symbol, e)
        return []

    points = _parse_imf_pcps_series(page, factor)
    logger.info("IMF PCPS history(%s): %d points", symbol, len(points))
    return points


def _parse_imf_pcps_series(page: str, factor: float) -> list[dict]:
    """Parse SDMX-ML monthly observations into ascending month-end points.

    ``factor`` converts the published unit to the app unit (see
    IMF_PCPS_SERIES). Cobalt is the trap: its codelist entry says "US dollars
    per pound", but the values are per tonne (~55,000 in mid-2026 against a
    ~$25/lb market).
    """
    points: list[dict] = []
    for year, month, value in re.findall(
        r'<Obs [^>]*TIME_PERIOD="(\d{4})-M(\d{2})"[^>]*OBS_VALUE="([^"]+)"', page
    ):
        try:
            published = float(value)
        except ValueError:
            continue
        y, m = int(year), int(month)
        day = date(y, m, calendar.monthrange(y, m)[1])
        points.append({"date": day.isoformat(), "price": round(published * factor, 4)})
    points.sort(key=lambda p: p["date"])
    return points


async def fetch_reference_series(start: date, end: date) -> tuple[dict[str, dict], dict[str, str]]:
    """Monthly-average series for the reference basis, cut at the latest month all of them cover.

    Johnson Matthey daily base prices are averaged by month (the running month
    is dropped); IMF PCPS publishes monthly averages as such. Returns
    ``(series, failures)`` so one dead feed never loses the others.
    """
    series: dict[str, dict] = {}
    failures: dict[str, str] = {}

    try:
        jm = await fetch_johnson_matthey_history(start, end)
        for symbol in JM_HISTORY_SYMBOLS:
            rows = (jm or {}).get(symbol) or []
            if rows:
                points = monthly_average(rows, exclude_month=end.strftime("%Y-%m"))
                series[symbol] = {
                    "source": "Johnson Matthey (monthly average)",
                    "unit": "$/troy_oz",
                    "points": points,
                }
            else:
                failures[f"jm:{symbol}"] = "johnson matthey returned no rows"
    except Exception as exc:  # noqa: BLE001
        failures["_johnson_matthey"] = f"{type(exc).__name__}: {exc}"

    for symbol, (_indicator, unit, _factor) in IMF_PCPS_SERIES.items():
        try:
            rows = await fetch_imf_pcps_history(symbol, start)
        except Exception as exc:  # noqa: BLE001
            failures[f"imf:{symbol}"] = f"{type(exc).__name__}: {exc}"
            continue
        if rows:
            series[symbol] = {"source": "IMF PCPS (monthly average)", "unit": unit, "points": rows}
        else:
            failures[f"imf:{symbol}"] = "empty response"

    if not series:
        return {}, failures
    return truncate_series(series, latest_common_month(series)), failures


async def fetch_westmetall() -> dict[str, dict]:
    """Return the newest LME official settlement for each Westmetall metal."""
    results: dict[str, dict] = {}
    for symbol in WESTMETALL_FIELDS:
        points = await fetch_westmetall_history(symbol)
        if not points:
            continue
        latest = points[-1]
        results[symbol] = {
            "name": _NAMES.get(symbol, symbol),
            "price": latest["price"],
            "unit": _UNITS.get(symbol, "$/lb"),
            "source": "Westmetall (LME settlement)",
            "fetched_at": _utc_now_iso(),
        }
    return results


async def fetch_history(symbol: str, period: str = "1y") -> list[dict]:
    """Return OHLC history for a metal from the Yahoo chart API."""
    ticker_map = {sym: (ticker, factor) for sym, ticker, *_rest, factor in YAHOO_METALS}
    ticker_data = ticker_map.get(symbol)
    if not ticker_data:
        return []

    ticker, factor = ticker_data
    try:
        async with httpx.AsyncClient(timeout=20, headers=_HTTP_HEADERS) as client:
            resp = await client.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}",
                params={"range": period, "interval": "1d", "includePrePost": "false"},
            )
            resp.raise_for_status()
        return _extract_yahoo_history(resp.json(), factor)
    except (httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning("fetch_history(%s, %s): %s", symbol, period, e)
        return []
