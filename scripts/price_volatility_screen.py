"""Re-rank every benchmark family at each observed historical price state.

The shipped ranking is computed at one price snapshot. This script replays the
metal prices COMET actually recorded, one calendar date at a time, and asks
whether the recommended catalyst changes. Date slices are used rather than
independent per-metal percentiles so that co-movement between metals is
preserved: every state is a set of prices that really occurred together.

Only symbols observed on *every* retained date are allowed to vary. A symbol
missing from one date would otherwise fall back to its present-day baseline,
mixing a historical state with a current price and producing rank changes that
are coverage artefacts rather than market movement.

Only rows from a live market feed are replayed. Seeded reference rows, CatCost
escalation rows and USGS annual averages are point estimates, not observations,
and mixing them into the series manufactures price "movement" that never
happened -- the seeded first day alone reads as Au 2000 -> 4404 and Pt 950 ->
1891 overnight. A metal with no live feed therefore cannot contribute
volatility and holds its baseline value in every state.

Rows whose price is more than `--outlier-factor` away from the median for their
(symbol, source) series are then dropped, and every drop is logged in the output
rather than hidden.

With ``--history`` the replay reads a frozen long-run series produced by
``scripts/fetch_price_history.py`` instead of the application database. Those
feeds publish at different cadences (Johnson Matthey monthly, Yahoo daily), so
frozen states are aligned to month end: each symbol contributes its last
observation in that month. ``--since`` sets the window, and any symbol that does
not cover the whole window is held at its baseline value rather than being
spliced in part way, which would put a step change into the series.

Run:  python scripts/price_volatility_screen.py --out results.json
      python scripts/price_volatility_screen.py --history docs/paper/price_history.json           --since 2021-09 --out results.json
"""

from __future__ import annotations

import argparse
import calendar
import json
import statistics as stats
import sys
from collections import Counter, defaultdict
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import Session, select  # noqa: E402

from backend.core.decision_engine import (  # noqa: E402
    _latest_price_map,
    evaluate_benchmark_family,
    list_benchmark_families,
)
from backend.database import (  # noqa: E402
    create_db_and_tables,
    engine,
    ensure_material_library_seeded,
)
from backend.models.metal_price import MetalPrice  # noqa: E402

DIMS = ("economics", "evidence", "route", "performance")

# Sources that publish an observed market price. Everything else in the table is
# a point estimate (seed, escalation, annual average) and cannot express change.
LIVE_SOURCES = (
    "Yahoo Finance (live)",
    "Johnson Matthey (live)",
    "Kitco (live)",
    "Markets Insider (live)",
    "Westmetall (LME settlement)",
)


def load_clean_series(
    session: Session, outlier_factor: float
) -> tuple[dict[str, list[tuple[datetime, float, str, str]]], list[dict], dict[str, int]]:
    """Return per-symbol live-feed observations with gross outliers removed.

    Non-market sources are excluded first, then an observation is dropped when
    its price is outside [median / factor, median * factor] for its own
    (symbol, source) series, so a unit-conversion or parse failure cannot
    masquerade as market movement.
    """
    rows = session.exec(select(MetalPrice)).all()

    excluded: Counter[str] = Counter()
    live_rows = []
    for row in rows:
        if row.source in LIVE_SOURCES:
            live_rows.append(row)
        else:
            excluded[row.source] += 1

    by_source: dict[tuple[str, str], list[MetalPrice]] = defaultdict(list)
    for row in live_rows:
        by_source[(row.symbol, row.source)].append(row)

    kept: dict[str, list[tuple[datetime, float, str, str]]] = defaultdict(list)
    dropped: list[dict] = []
    for (symbol, source), group in by_source.items():
        prices = [float(r.price) for r in group]
        median = stats.median(prices)
        lo, hi = median / outlier_factor, median * outlier_factor
        bad_dates: Counter[str] = Counter()
        for row in group:
            price = float(row.price)
            if len(group) >= 5 and not (lo <= price <= hi):
                bad_dates[row.fetched_at.date().isoformat()] += 1
                continue
            kept[symbol].append((row.fetched_at, price, row.unit, row.source))
        if bad_dates:
            dropped.append({
                "symbol": symbol,
                "source": source,
                "series_median": round(median, 4),
                "dropped_rows": sum(bad_dates.values()),
                "kept_rows": len(group) - sum(bad_dates.values()),
                "dates": dict(sorted(bad_dates.items())),
            })

    for symbol in kept:
        kept[symbol].sort()
    return dict(kept), dropped, dict(excluded)


def load_frozen_series(
    path: Path, since: str | None
) -> tuple[dict[str, list[tuple[datetime, float, str, str]]], list[str]]:
    """Read a frozen history file and resample every series to month end.

    A symbol is kept only when it has an observation in every month of the
    window; a series that starts late would otherwise introduce a step change
    on the month it appears, which reads as market movement.
    """
    payload = json.loads(path.read_text(encoding="utf-8"))
    raw: dict[str, dict[str, tuple[str, float]]] = {}
    units: dict[str, tuple[str, str]] = {}

    for symbol, entry in payload["series"].items():
        units[symbol] = (entry["unit"], entry["source"])
        monthly: dict[str, tuple[str, float]] = {}
        for point in entry["points"]:
            day = point["date"][:10]
            if since and day[:7] < since:
                continue
            month = day[:7]
            prior = monthly.get(month)
            if prior is None or day >= prior[0]:
                monthly[month] = (day, float(point["price"]))
        if monthly:
            raw[symbol] = monthly

    if not raw:
        return {}, []

    months = sorted({m for entry in raw.values() for m in entry})
    full = [s for s in sorted(raw) if len(raw[s]) == len(months)]
    partial = [s for s in sorted(raw) if s not in full]

    series: dict[str, list[tuple[datetime, float, str, str]]] = {}
    for symbol in full:
        unit, source = units[symbol]
        observations = []
        for month, (_observed_on, price) in sorted(raw[symbol].items()):
            year, mon = int(month[:4]), int(month[5:7])
            month_end = date(year, mon, calendar.monthrange(year, mon)[1])
            observations.append((datetime(month_end.year, month_end.month, month_end.day),
                                 price, unit, source))
        series[symbol] = observations
    return series, partial


def build_date_states(
    series: dict[str, list[tuple[datetime, float, str, str]]],
    baseline: dict[str, dict[str, Any]],
    min_symbols: int,
    common_only: bool,
) -> tuple[list[dict[str, Any]], list[str]]:
    """One price map per calendar date, using that date's last observation.

    With ``common_only`` the varying set is the intersection of symbols observed
    on every retained date; all other symbols hold their baseline value in every
    state, so no rank change can come from a symbol appearing or disappearing.
    """
    per_date: dict[str, dict[str, tuple[datetime, float, str, str]]] = defaultdict(dict)
    for symbol, observations in series.items():
        for fetched_at, price, unit, source in observations:
            day = fetched_at.date().isoformat()
            prior = per_date[day].get(symbol)
            if prior is None or fetched_at >= prior[0]:
                per_date[day][symbol] = (fetched_at, price, unit, source)

    eligible = [d for d in sorted(per_date) if len(per_date[d]) >= min_symbols]
    if not eligible:
        return [], []

    core = set(per_date[eligible[0]])
    for day in eligible[1:]:
        core &= set(per_date[day])
    varying = sorted(core) if common_only else sorted({s for d in eligible for s in per_date[d]})

    states: list[dict[str, Any]] = []
    for day in eligible:
        observed = {s: v for s, v in per_date[day].items() if s in set(varying)}
        price_map = {symbol: dict(entry) for symbol, entry in baseline.items()}
        for symbol, (fetched_at, price, unit, source) in observed.items():
            price_map[symbol] = {
                "symbol": symbol,
                "name": baseline.get(symbol, {}).get("name", symbol),
                "price": price,
                "unit": unit,
                "source": source,
                "fetched_at": fetched_at.isoformat(),
            }
        states.append({
            "date": day,
            "observed_symbols": sorted(observed),
            "prices": price_map,
            "observed_prices": {s: round(v[1], 6) for s, v in sorted(observed.items())},
        })
    return states, varying


def performance_zero_weights(base: dict[str, float]) -> dict[str, float]:
    zeroed = {k: (0.0 if k == "performance" else float(base[k])) for k in DIMS}
    total = sum(zeroed.values())
    return {k: v / total for k, v in zeroed.items()}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--outlier-factor", type=float, default=3.0)
    parser.add_argument("--min-symbols", type=int, default=8,
                        help="skip dates observing fewer than this many symbols")
    parser.add_argument("--history", type=Path,
                        help="frozen history file from scripts/fetch_price_history.py; "
                             "replaces the application database as the price source")
    parser.add_argument("--since", help="window start as YYYY-MM, with --history")
    parser.add_argument("--all-symbols", action="store_true",
                        help="vary every observed symbol instead of only those "
                             "present on all dates (reproduces the coverage artefact)")
    parser.add_argument("--price-basis", type=Path,
                        help="frozen price basis JSON (a previous run's output, or its price_basis map) instead of the local database")
    parser.add_argument("--basis-type", choices=("live", "reference"), default="live")
    args = parser.parse_args()

    create_db_and_tables()

    with Session(engine) as session:
        ensure_material_library_seeded(session)
        if args.price_basis:
            payload = json.loads(args.price_basis.read_text(encoding="utf-8"))
            baseline = payload.get("price_basis", payload)
        else:
            baseline = _latest_price_map(session, args.basis_type)
        if args.history:
            series, partial = load_frozen_series(args.history, args.since)
            dropped, excluded = [], {}
            if not series:
                raise SystemExit(f"no series in {args.history} covered the window")
            print(f"frozen history: {args.history}"
                  + (f" since {args.since}" if args.since else ""))
            if partial:
                print("held at baseline (incomplete coverage of the window): "
                      + ", ".join(partial))
        else:
            partial = []
            series, dropped, excluded = load_clean_series(session, args.outlier_factor)
        states, varying = build_date_states(
            series, baseline, args.min_symbols, common_only=not args.all_symbols
        )

        if not states:
            raise SystemExit("no price states met --min-symbols; nothing to replay")

        print(f"price states: {len(states)} dates "
              f"({states[0]['date']} .. {states[-1]['date']}), "
              f"outlier rows dropped: {sum(d['dropped_rows'] for d in dropped)}")
        print(f"varying symbols ({len(varying)}): {', '.join(varying)}")
        if excluded:
            print("non-market rows excluded: "
                  + ", ".join(f"{src}={n}" for src, n in sorted(excluded.items())))

        families = list_benchmark_families()
        results: list[dict[str, Any]] = []

        for fam in families:
            key = fam["family"]
            base = evaluate_benchmark_family(session=session, family=key, profile="balanced", prices=baseline, basis=args.basis_type)
            base_weights = dict(base["decision_profile"]["weights"])
            perf0 = performance_zero_weights(base_weights)

            balanced_winners: list[str] = []
            perf0_winners: list[str] = []
            per_state: list[dict[str, Any]] = []

            for state in states:
                bal = evaluate_benchmark_family(
                    session=session, family=key, profile="balanced", prices=state["prices"], basis=args.basis_type
                )
                p0 = evaluate_benchmark_family(
                    session=session, family=key, profile="balanced",
                    weights=perf0, prices=state["prices"], basis=args.basis_type,
                )
                bal_win = bal["winner"]["slug"] if bal["winner"] else None
                p0_win = p0["winner"]["slug"] if p0["winner"] else None
                balanced_winners.append(bal_win)
                perf0_winners.append(p0_win)
                per_state.append({
                    "date": state["date"],
                    "balanced_winner": bal_win,
                    "performance_zero_winner": p0_win,
                    "top3_performance_zero": [
                        {"slug": c["slug"],
                         "landed_cost_per_lb": round(float(c["summary"]["landed_cost_per_lb"]), 4)}
                        for c in p0["candidates"][:3]
                    ],
                })

            bal_counts = Counter(w for w in balanced_winners if w)
            p0_counts = Counter(w for w in perf0_winners if w)
            results.append({
                "family": key,
                "title": fam["title"],
                "states": len(states),
                "balanced": {
                    "distinct_winners": len(bal_counts),
                    "winner_counts": dict(bal_counts),
                    "modal_share_pct": round(100 * max(bal_counts.values()) / len(states), 1) if bal_counts else None,
                },
                "performance_zero": {
                    "weights": perf0,
                    "distinct_winners": len(p0_counts),
                    "winner_counts": dict(p0_counts),
                    "modal_share_pct": round(100 * max(p0_counts.values()) / len(states), 1) if p0_counts else None,
                },
                "per_state": per_state,
            })
            flip = "FLIPS" if len(p0_counts) > 1 else "stable"
            print(f"  {key:<38} balanced:{len(bal_counts)}  perf0:{len(p0_counts)}  {flip}")

    bal_flips = [r for r in results if r["balanced"]["distinct_winners"] > 1]
    p0_flips = [r for r in results if r["performance_zero"]["distinct_winners"] > 1]

    out = {
        "generated_at": datetime.now(UTC).isoformat(),
        "method": (
            "Every benchmark family re-ranked at each observed calendar-date price state. "
            "Date slices preserve co-movement between metals; unobserved symbols hold their "
            "baseline value. Winner counted per state."
        ),
        "outlier_factor": args.outlier_factor,
        "min_symbols_per_state": args.min_symbols,
        "varying_symbols": varying,
        "common_symbols_only": not args.all_symbols,
        "live_sources": list(LIVE_SOURCES),
        "excluded_non_market_rows": excluded,
        "price_source": str(args.history) if args.history else "application database",
        "price_basis_source": str(args.price_basis) if args.price_basis else "application database",
        "price_basis": baseline,
        "basis_type": args.basis_type,
        "window_since": args.since,
        "held_at_baseline_incomplete_coverage": partial,
        "dropped_outliers": dropped,
        "price_window": {"first": states[0]["date"], "last": states[-1]["date"], "states": len(states)},
        "price_states": [
            {"date": s["date"], "observed_prices": s["observed_prices"]} for s in states
        ],
        "headline": {
            "families": len(results),
            "families_flipping_balanced": len(bal_flips),
            "families_flipping_performance_zero": len(p0_flips),
            "flipping_families_performance_zero": [r["family"] for r in p0_flips],
        },
        "families": results,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, indent=1, default=str), encoding="utf-8")

    print("\nfamilies whose winner changes across the price window:")
    print(f"  balanced profile      : {len(bal_flips)} / {len(results)}")
    print(f"  performance-zero      : {len(p0_flips)} / {len(results)}")
    for r in p0_flips:
        counts = ", ".join(f"{k}×{v}" for k, v in sorted(r["performance_zero"]["winner_counts"].items(), key=lambda x: -x[1]))
        print(f"    {r['family']:<38} {counts}")
    print(f"\nwrote {args.out}")


if __name__ == "__main__":
    main()
