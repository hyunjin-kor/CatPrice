"""Strict parsing for small, keyless UN Comtrade monthly support snapshots."""

from __future__ import annotations

import calendar
import json
import math
from datetime import date
from functools import lru_cache
from urllib.parse import parse_qsl, urlsplit

from backend.paths import data_dir

PREVIEW_API = "https://comtradeapi.un.org/public/v1/preview/C/M/HS"


def preview_params(hs: str, period: str, reporter: str = "842") -> dict:
    if len(hs) != 6 or not hs.isdigit():
        raise ValueError("expected a six-digit HS code")
    if len(period) != 6 or not period.isdigit():
        raise ValueError("expected YYYYMM")
    date(int(period[:4]), int(period[4:]), 1)
    return {"reporterCode": reporter, "partnerCode": "0", "partner2Code": "0",
            "cmdCode": hs, "flowCode": "M", "period": period,
            "customsCode": "C00", "motCode": "0", "maxRecords": 10}


def parse_preview(payload: dict, hs: str, period: str, reporter: str = "842") -> dict | None:
    """Accept one exact world-import aggregate; missing data is not a zero price.

    Preview permits only one period. One expected row is below the requested
    ten-row cap. Duplicate, truncated, differently filtered or estimated-weight
    responses are rejected, rather than blended into an apparently valid price.
    """
    expected = preview_params(hs, period, reporter)
    if not isinstance(payload, dict):
        raise ValueError("expected a JSON object response")
    rows = payload.get("data")
    if payload.get("error") or not isinstance(rows, list) or type(payload.get("count")) is not int or payload["count"] != len(rows):
        raise ValueError("provider error or inconsistent result count")
    if not rows:
        return None
    if len(rows) != 1 or not isinstance(rows[0], dict):
        raise ValueError("expected exactly one aggregate row")
    row = rows[0]
    for field in ("reporterCode", "partnerCode", "partner2Code", "cmdCode", "flowCode", "period", "customsCode", "motCode"):
        if str(row.get(field)) != str(expected[field]):
            raise ValueError(f"unexpected {field}")
    if row.get("typeCode") != "C" or row.get("freqCode") != "M":
        raise ValueError("expected monthly commodity data")
    # The preview omits aggrLevel/isLeaf; exact six-digit cmdCode establishes
    # the requested HS level. Reject a contradictory level when supplied.
    if row.get("aggrLevel") not in (None, 6) or row.get("isLeaf") is False:
        raise ValueError("unexpected HS aggregation level")
    if row.get("isNetWgtEstimated") is not False:
        raise ValueError("net weight is estimated or its quality flag is missing")
    if isinstance(row.get("netWgt"), bool) or isinstance(row.get("primaryValue"), bool):
        raise ValueError("boolean value or weight is not a measurement")
    try:
        weight, value = float(row["netWgt"]), float(row["primaryValue"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("missing numeric value or net weight") from exc
    if not all(math.isfinite(v) and v > 0 for v in (weight, value)):
        raise ValueError("non-positive or non-finite value/weight")
    price = round(value / weight, 4)
    if not math.isfinite(price) or price <= 0:
        raise ValueError("invalid unit value")
    year, month = int(period[:4]), int(period[4:])
    return {"date": date(year, month, calendar.monthrange(year, month)[1]).isoformat(), "price": price}


def validate_support_snapshot(payload: dict) -> dict:
    """Rebuild the analysis series from the retained HTTP evidence."""
    from backend.core.price_fetcher import load_support_series

    catalog = load_support_series()
    definitions = {entry["id"]: entry for entry in catalog["series"]}
    if payload.get("endpoint") != PREVIEW_API:
        raise ValueError("unexpected snapshot endpoint")
    accepted = [r for r in payload.get("requests", []) if r["status"] == "accepted"]
    if {r["symbol"] for r in accepted} != set(payload.get("series", {})):
        raise ValueError("accepted responses and declared series differ")
    rebuilt = {}
    for symbol, entry in payload.get("series", {}).items():
        if symbol not in definitions or entry.get("unit") != "$/kg":
            raise ValueError(f"unknown support series or unit: {symbol}")
        points = []
        for record in accepted:
            if record["symbol"] != symbol:
                continue
            url = urlsplit(record.get("url", ""))
            expected = preview_params(definitions[symbol]["hs"], record["period"], catalog["reporter_code"])
            query = parse_qsl(url.query)
            if record.get("http_status") != 200 or url._replace(query="").geturl() != PREVIEW_API or sorted(query) != sorted((k, str(v)) for k, v in expected.items()):
                raise ValueError(f"unverified request endpoint/status/filters: {symbol}")
            point = parse_preview(record["response"], definitions[symbol]["hs"], record["period"], catalog["reporter_code"])
            if point is None:
                raise ValueError(f"accepted request contains no observation: {symbol}")
            points.append(point)
        points.sort(key=lambda p: p["date"])
        if not points or len({p["date"] for p in points}) != len(points) or points != entry.get("points"):
            raise ValueError(f"snapshot points do not match retained responses: {symbol}")
        rebuilt[symbol] = {"name": definitions[symbol]["name"], "unit": "$/kg",
            "source": "UN Comtrade (monthly unit value)", "cadence": "monthly_unit_value",
            "grade_note": definitions[symbol]["note"], "points": points,
            "first": points[0]["date"], "last": points[-1]["date"], "n": len(points)}
    return rebuilt


@lru_cache(maxsize=1)
def load_support_history() -> dict:
    """Validated shipped observations, usable offline without an API key."""
    path = data_dir() / "support_price_history.json"
    if not path.exists():
        return {}
    return validate_support_snapshot(json.loads(path.read_text(encoding="utf-8")))


@lru_cache(maxsize=1)
def load_support_quote_urls() -> dict[tuple[str, str, float], str]:
    """Return URLs only for quotes backed by validated, retained responses."""
    path = data_dir() / "support_price_history.json"
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    series = validate_support_snapshot(payload)
    points = {(symbol, p["date"][:7].replace("-", "")): p
              for symbol, entry in series.items() for p in entry["points"]}
    result = {}
    for record in payload["requests"]:
        if record["status"] == "accepted":
            point = points[record["symbol"], record["period"]]
            result[record["symbol"], point["date"], point["price"]] = record["url"]
    return result
