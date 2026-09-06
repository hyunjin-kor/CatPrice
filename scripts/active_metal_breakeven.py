"""Break-even active-metal prices for every benchmark family.

For each family, take the cost-only winner at the current price basis and pit
it against every rival that depends on a different market-fed metal. For each
metal that only one of the two contains, sweep that metal's price (all others
fixed) and find where the recommendation flips — on landed cost and on the
performance-zero composite. Then count, from the frozen price history, how
many months of the record sat on each side of that break-even.

Families whose candidates share the same metals or carry no market-fed metal
at all (zeolites, oxides) have no exposure by construction and are listed as
such rather than reported as "stable".

Run:  python scripts/active_metal_breakeven.py --history docs/paper/price_history_<date>.json --out docs/paper/active_metal_breakeven_<date>.json
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import Session  # noqa: E402

from backend.core.breakeven import (  # noqa: E402
    PRECIOUS,
    breakeven_for_pair,
    classify_contest,
    feed_symbols,
    history_side_counts,
)
from backend.core.decision_engine import (  # noqa: E402
    _latest_price_map,
    _load_catalogs,
    evaluate_benchmark_family,
    list_benchmark_families,
)
from backend.database import (  # noqa: E402
    create_db_and_tables,
    engine,
    ensure_material_library_seeded,
)

DIMS = ("economics", "evidence", "route", "performance")


def performance_zero(weights: dict[str, float]) -> dict[str, float]:
    z = {k: (0.0 if k == "performance" else float(weights[k])) for k in DIMS}
    s = sum(z.values())
    return {k: v / s for k, v in z.items()}


def cost_of(c: dict[str, Any]) -> float:
    v = c["summary"].get("economics_basis_value")
    return float(v if v is not None else c["summary"]["landed_cost_per_lb"])


def run_family(session: Session, family: str, baseline: dict, history: dict, scan: int, basis: str = "live") -> dict[str, Any]:
    catalog = _load_catalogs()[family]
    base = evaluate_benchmark_family(session=session, family=family, profile="balanced", prices=baseline, basis=basis)
    w0 = performance_zero(base["decision_profile"]["weights"])
    perf0 = evaluate_benchmark_family(session=session, family=family, profile="balanced", weights=w0, prices=baseline, basis=basis)

    cands = base["candidates"]
    unit = {c["summary"].get("economics_basis_unit") or "$/lb" for c in cands}
    feeds = {c["slug"]: feed_symbols(family, c["slug"]) for c in cands}
    cost_winner = min(cands, key=lambda c: (cost_of(c), c["slug"]))["slug"]
    composite_winner = perf0["winner"]["slug"] if perf0["winner"] else None

    contests: list[dict[str, Any]] = []
    classes: set[str] = set()
    for rival in cands:
        b = rival["slug"]
        if b == cost_winner:
            continue
        sa, sb = set(feeds[cost_winner]), set(feeds[b])
        kind = classify_contest(sa, sb)
        classes.add(kind)
        if kind in {"no_feed", "same_metals"}:
            continue
        for symbol in sorted(sa ^ sb):
            holder = cost_winner if symbol in sa else b
            row: dict[str, Any] = {
                "a": cost_winner, "b": b, "kind": kind, "symbol": symbol,
                "symbol_in": holder, "wt_pct": feeds[holder][symbol],
                "precious": symbol in PRECIOUS,
                "cost": breakeven_for_pair(session, family, cost_winner, b, symbol, baseline, metric="cost", scan=max(12, scan // 2), basis=basis),
                "composite_perf0": breakeven_for_pair(session, family, cost_winner, b, symbol, baseline, metric="composite", weights=w0, scan=scan, basis=basis),
            }
            series = history.get(symbol)
            for key in ("cost", "composite_perf0"):
                be = row[key]
                if "error" in be or not be["crossings"] or series is None:
                    continue
                if series["unit"] != be["unit"]:
                    be["history"] = {"error": f"history unit {series['unit']} != basis unit {be['unit']}"}
                    continue
                be["history"] = history_side_counts(series["points"], be["crossings"][0], be["b_wins_when"])
            contests.append(row)

    if not classes:
        exposure = "single_candidate"
    elif classes <= {"no_feed", "same_metals"}:
        exposure = "no_exposure"
    elif "precious_vs_base" in classes:
        exposure = "precious_vs_base"
    elif "precious_vs_precious" in classes:
        exposure = "precious_vs_precious"
    elif "base_vs_base" in classes:
        exposure = "base_vs_base"
    else:
        exposure = "metal_vs_none"

    return {
        "family": family,
        "title": catalog["title"],
        "domain": catalog.get("catalyst_domain", "thermal"),
        "economics_unit": sorted(unit),
        "cost_winner": cost_winner,
        "composite_perf0_winner": composite_winner,
        "candidates": [{"slug": c["slug"], "cost": round(cost_of(c), 4), "feeds": feeds[c["slug"]]} for c in cands],
        "exposure": exposure,
        "contest_kinds": sorted(classes),
        "contests": contests,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--history", type=Path, required=True, help="frozen price history JSON")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--scan", type=int, default=32, help="log-grid points per sweep")
    ap.add_argument("--family", action="append", help="restrict to these families")
    ap.add_argument("--price-basis", type=Path, help="frozen price basis JSON (a previous run's output, or its price_basis map) instead of the local database")
    ap.add_argument("--basis-type", choices=("live", "reference"), default="live")
    args = ap.parse_args()

    history = json.loads(args.history.read_text(encoding="utf-8"))["series"]
    create_db_and_tables()
    families_out: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    with Session(engine) as session:
        ensure_material_library_seeded(session)
        if args.price_basis:
            payload = json.loads(args.price_basis.read_text(encoding="utf-8"))
            baseline = payload.get("price_basis", payload)
        else:
            baseline = _latest_price_map(session, args.basis_type)
        for fam in list_benchmark_families():
            key = fam["family"]
            if args.family and key not in args.family:
                continue
            try:
                families_out.append(run_family(session, key, baseline, history, args.scan, args.basis_type))
            except Exception as exc:  # isolate one family's failure
                errors.append({"family": key, "error": f"{type(exc).__name__}: {exc}"})

    out = {
        "generated_at": datetime.now(UTC).isoformat(),
        "history_file": str(args.history),
        "history_symbols": {s: {"unit": v["unit"], "first": v["first"], "last": v["last"], "n": v["n"]} for s, v in history.items()},
        "price_basis_source": str(args.price_basis) if args.price_basis else "application database",
        "price_basis": baseline,
        "basis_type": args.basis_type,
        "scan": args.scan,
        "families": families_out,
        "errors": errors,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, indent=1, default=str), encoding="utf-8")

    def cell(be: dict[str, Any]) -> str:
        if "error" in be:
            return f"ERR {be['error'][:28]}"
        if be["crossings"]:
            return f"{be['crossings'][0]:.4g} ({be['crossing_over_baseline'][0]:.3g}x)"
        return {"a_always_wins": "A always", "b_always_wins": "B always"}.get(be["verdict"], "none")

    print(f"{'family':<34}{'exposure':<20}{'A = cost winner':<30}{'B':<30}{'metal':<5}{'cost break-even':>24}{'perf0 composite':>24}{'hist B%':>9}")
    for f in families_out:
        if not f["contests"]:
            print(f"{f['family']:<34}{f['exposure']:<20}{f['cost_winner']:<30}{'-':<30}")
            continue
        for c in f["contests"]:
            h = (c["cost"].get("history") or {})
            hb = h.get("share_b_wins_pct")
            hist = f"{hb:.0f}" if hb is not None else ("no hist" if c["symbol"] not in history else "-")
            print(
                f"{f['family']:<34}{f['exposure']:<20}{c['a'][:29]:<30}{c['b'][:29]:<30}{c['symbol']:<5}"
                f"{cell(c['cost']):>24}{cell(c['composite_perf0']):>24}{hist:>9}"
            )
    if errors:
        print("\nerrors:")
        for e in errors:
            print(f"  {e['family']}: {e['error']}")
    print(f"\nwrote {args.out}  (families={len(families_out)}, contests={sum(len(f['contests']) for f in families_out)}, errors={len(errors)})")


if __name__ == "__main__":
    main()
