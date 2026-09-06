"""Fetch a bounded support snapshot using only the free, keyless preview API.

Example: python scripts/fetch_support_history.py --start 2026-04 --end 2026-07 --out support_history.json
No credentials are used or sent; no subscription endpoint is called. HTTP429 stops the
run without retrying. Every response or failure is retained beside its status.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import UTC, date, datetime
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.core.comtrade_snapshot import PREVIEW_API, parse_preview, preview_params  # noqa: E402
from backend.core.price_fetcher import load_support_series  # noqa: E402
from backend.services.price_scheduler import _months_between  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", required=True, help="YYYY-MM, inclusive")
    parser.add_argument("--end", required=True, help="YYYY-MM, inclusive")
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    start, end = date.fromisoformat(args.start + "-01"), date.fromisoformat(args.end + "-01")
    periods = _months_between(start, end)
    if not periods or len(periods) > 12 or end >= date.today().replace(day=1):
        parser.error("request 1–12 completed calendar months")
    catalog = load_support_series()
    output = {"generated_at": datetime.now(UTC).isoformat(), "endpoint": PREVIEW_API,
              "access": "free public preview; no credentials", "source": "UN Comtrade",
              "policy_url": "https://uncomtrade.org/docs/policy-on-use-and-re-dissemination/",
              "scope": catalog["description"], "requested_months": periods, "series": {}, "requests": []}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    stopped = False
    with httpx.Client(timeout=60, follow_redirects=True) as client:
        for entry in catalog["series"]:
            points = []
            for period in periods:
                params = preview_params(entry["hs"], period, catalog["reporter_code"])
                record = {"symbol": entry["id"], "period": period, "status": "unverified"}
                try:
                    response = client.get(PREVIEW_API, params=params)
                    record.update(url=str(response.url), http_status=response.status_code)
                    stopped = response.status_code == 429
                    response.raise_for_status()
                    payload = response.json()
                    record["response"] = payload
                    point = parse_preview(payload, entry["hs"], period, catalog["reporter_code"])
                    record["status"] = "accepted" if point else "not_published"
                    if point:
                        points.append(point)
                except (httpx.HTTPError, ValueError, TypeError) as exc:
                    record["reason"] = str(exc)
                output["requests"].append(record)
                if points:
                    output["series"][entry["id"]] = {"name": entry["name"], "unit": "$/kg",
                        "source": "UN Comtrade (monthly unit value)", "cadence": "monthly_unit_value", "grade_note": entry["note"],
                        "points": points, "first": points[0]["date"], "last": points[-1]["date"], "n": len(points)}
                args.out.write_text(json.dumps(output, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
                print(f"{entry['id']} {period}: {record['status']}", flush=True)
                if stopped:
                    break
                time.sleep(12)
            if stopped:
                break
    print(f"Saved {len(output['series'])} series; {len(output['requests'])} requests to {args.out}")
    if stopped or any(r["status"] == "unverified" for r in output["requests"]):
        sys.exit(1)


if __name__ == "__main__":
    main()
