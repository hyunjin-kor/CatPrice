"""Break-even metal price between two benchmark candidates.

Answers "at what price of metal X does candidate B overtake candidate A?" by
re-costing the family with X swept over a log-spaced range while every other
price holds at the supplied baseline. Two metrics are supported:

  cost       the family's economics basis ($/lb landed, or $/cm2 for
             electrode families) — lower wins
  composite  the MCDA total under the supplied weights — higher wins

The cost gap is affine in X for the candidate that contains it and flat for
the one that does not, so it has at most one crossing; the composite uses
min-max normalised economics and can cross more than once, which is why the
scan reports every sign change rather than assuming one.
"""

from __future__ import annotations

import math
from collections.abc import Callable
from typing import Any

from sqlmodel import Session

from backend.core.decision_engine import _load_catalogs, evaluate_benchmark_family

PRECIOUS = frozenset({"Pt", "Pd", "Rh", "Ru", "Ir", "Os", "Au", "Ag"})


def feed_symbols(family: str, slug: str) -> dict[str, float]:
    """Market-feed metals of one candidate, symbol -> wt%."""
    catalog = _load_catalogs()[family]
    candidate = next(c for c in catalog["candidates"] if c["slug"] == slug)
    out: dict[str, float] = {}
    for component in candidate["components"]:
        pricing = component.get("pricing") or {}
        if pricing.get("type") == "market_feed":
            out[pricing["symbol"]] = out.get(pricing["symbol"], 0.0) + float(component["wt_pct"])
    return out


def find_crossings(
    f: Callable[[float], float],
    lo: float,
    hi: float,
    *,
    scan: int = 32,
    tol_rel: float = 1e-4,
    max_iter: int = 60,
) -> tuple[list[float], int]:
    """Every x in [lo, hi] where f changes sign, found on a log grid then bisected.

    Returns (crossings, evaluations). Exact zeros on the grid count as crossings.
    """
    if lo <= 0 or hi <= lo:
        raise ValueError("need 0 < lo < hi")
    xs = [lo * (hi / lo) ** (i / (scan - 1)) for i in range(scan)]
    ys = [f(x) for x in xs]
    evals = scan
    found: list[float] = []
    for i in range(scan - 1):
        y0, y1 = ys[i], ys[i + 1]
        if y0 == 0.0:
            found.append(xs[i])
            continue
        if (y0 < 0) == (y1 < 0):
            continue
        a, b, fa = xs[i], xs[i + 1], y0
        for _ in range(max_iter):
            m = math.sqrt(a * b)
            fm = f(m)
            evals += 1
            if fm == 0.0 or (b - a) / m < tol_rel:
                a = b = m
                break
            if (fa < 0) == (fm < 0):
                a, fa = m, fm
            else:
                b = m
        found.append(0.5 * (a + b))
    if ys[-1] == 0.0:
        found.append(xs[-1])
    return found, evals


def advantage_of_b(
    session: Session,
    family: str,
    slug_a: str,
    slug_b: str,
    prices: dict[str, dict[str, Any]],
    *,
    metric: str = "cost",
    weights: dict[str, float] | None = None,
    profile: str = "balanced",
    basis: str = "live",
) -> float:
    """Positive when B beats A at these prices, negative when A beats B."""
    result = evaluate_benchmark_family(
        session=session, family=family, profile=profile, weights=weights, prices=prices, basis=basis
    )
    by = {c["slug"]: c for c in result["candidates"]}
    a, b = by[slug_a], by[slug_b]
    if metric == "cost":
        va, vb, _unit = cost_pair(a, b)
        return va - vb
    if metric == "composite":
        return float(b["scores"]["total"]) - float(a["scores"]["total"])
    raise ValueError(f"unknown metric {metric!r}")


def cost_pair(a: dict[str, Any], b: dict[str, Any]) -> tuple[float, float, str]:
    """Comparable cost of two candidates and the unit used.

    Mirrors ``decision_engine._economic_scores``: the family's economics basis
    ($/cm2 for electrode candidates) is used only when both sides share it;
    otherwise both fall back to landed $/lb.
    """
    ua = a["summary"].get("economics_basis_unit") or "$/lb"
    ub = b["summary"].get("economics_basis_unit") or "$/lb"
    if ua == ub and a["summary"].get("economics_basis_value") is not None and b["summary"].get("economics_basis_value") is not None:
        return float(a["summary"]["economics_basis_value"]), float(b["summary"]["economics_basis_value"]), ua
    return float(a["summary"]["landed_cost_per_lb"]), float(b["summary"]["landed_cost_per_lb"]), "$/lb"


def breakeven_for_pair(
    session: Session,
    family: str,
    slug_a: str,
    slug_b: str,
    symbol: str,
    baseline: dict[str, dict[str, Any]],
    *,
    metric: str = "cost",
    weights: dict[str, float] | None = None,
    profile: str = "balanced",
    lo_factor: float = 0.001,
    hi_factor: float = 100.0,
    scan: int = 32,
    basis: str = "live",
) -> dict[str, Any]:
    """Sweep ``symbol`` and report where B overtakes A. Never raises; errors are returned.

    The range spans three decades below and two above the baseline so that a
    precious metal at a few wt% still shows the (often absurd) price at which
    it would match a base-metal rival — that number is the finding, not a
    "none".
    """
    entry = baseline.get(symbol)
    if entry is None:
        return {"error": f"{symbol} not in price basis"}
    p0 = float(entry["price"])
    if p0 <= 0:
        return {"error": f"{symbol} baseline price is {p0}"}

    def swept(p: float) -> dict[str, dict[str, Any]]:
        prices = {s: dict(e) for s, e in baseline.items()}
        prices[symbol] = {**prices[symbol], "price": p, "source": f"break-even sweep of {entry['source']}"}
        return prices

    try:
        def f(p: float) -> float:
            return advantage_of_b(session, family, slug_a, slug_b, swept(p), metric=metric, weights=weights, profile=profile, basis=basis)

        at_baseline = f(p0)
        lo, hi = p0 * lo_factor, p0 * hi_factor
        crossings, evals = find_crossings(f, lo, hi, scan=scan)
        at_lo, at_hi = f(lo), f(hi)
    except Exception as exc:  # engine or data error: report, do not abort the sweep
        return {"error": f"{type(exc).__name__}: {exc}"}

    if crossings:
        verdict = "crosses"
    elif at_lo > 0 and at_hi > 0:
        verdict = "b_always_wins"
    elif at_lo <= 0 and at_hi <= 0:
        verdict = "a_always_wins"
    else:
        verdict = "no_crossing_found"

    return {
        "symbol": symbol,
        "unit": entry["unit"],
        "baseline_price": p0,
        "b_wins_at_baseline": at_baseline > 0,
        "b_wins_when": "above" if at_hi > 0 else "below",
        "verdict": verdict,
        "crossings": [round(c, 6) for c in crossings],
        "crossing_over_baseline": [round(c / p0, 4) for c in crossings],
        "scan_range": [lo, hi],
        "evaluations": evals + 3,
    }


def monthly_last(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Resample daily/monthly observations to one point per month (last seen)."""
    by_month: dict[str, dict[str, Any]] = {}
    for point in points:
        day = str(point["date"])[:10]
        month = day[:7]
        prior = by_month.get(month)
        if prior is None or day >= str(prior["date"])[:10]:
            by_month[month] = {"date": day, "price": float(point["price"])}
    return [by_month[m] for m in sorted(by_month)]


def history_side_counts(points: list[dict[str, Any]], breakeven: float, b_wins_when: str) -> dict[str, Any]:
    """How many monthly states sat on B's side of the break-even."""
    monthly = monthly_last(points)
    if not monthly:
        return {"n": 0}
    prices = [p["price"] for p in monthly]
    if b_wins_when == "above":
        n_b = sum(p > breakeven for p in prices)
    else:
        n_b = sum(p < breakeven for p in prices)
    ordered = sorted(prices)
    return {
        "n": len(prices),
        "first": monthly[0]["date"],
        "last": monthly[-1]["date"],
        "min": ordered[0],
        "median": ordered[len(ordered) // 2],
        "max": ordered[-1],
        "months_b_wins": n_b,
        "months_a_wins": len(prices) - n_b,
        "share_b_wins_pct": round(100.0 * n_b / len(prices), 1),
    }


def classify_contest(symbols_a: set[str], symbols_b: set[str]) -> str:
    """Label the kind of metal exposure a pair of candidates represents."""
    if not symbols_a and not symbols_b:
        return "no_feed"
    if symbols_a == symbols_b:
        return "same_metals"
    if not symbols_a or not symbols_b:
        return "metal_vs_none"
    only_a, only_b = symbols_a - symbols_b, symbols_b - symbols_a
    pa = any(s in PRECIOUS for s in only_a)
    pb = any(s in PRECIOUS for s in only_b)
    if pa and pb:
        return "precious_vs_precious"
    if pa or pb:
        return "precious_vs_base"
    return "base_vs_base"
