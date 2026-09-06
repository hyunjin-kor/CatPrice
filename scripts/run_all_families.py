"""Evaluate every benchmark family offline and write the paper-facing dataset.

For each family and each shipped decision profile this records every
candidate's priced cost, materials/processing split, LCA (materials, route,
total, coverage), the four MCDA scores, `screening_basis`, and price-evidence
tiers. It adds a performance-weight-zero ranking (priced quantities only) and
a weight-simplex rank-stability sweep computed from the same scores, and it
freezes the price basis the run used so the numbers can be reproduced.

Run:  python scripts/run_all_families.py --out results.json [--grid 0.1]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import Session  # noqa: E402

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


def simplex_grid(step: float) -> list[dict[str, float]]:
    n = round(1 / step)
    points = []
    for a in range(n + 1):
        for b in range(n + 1 - a):
            for c in range(n + 1 - a - b):
                d = n - a - b - c
                points.append(dict(zip(DIMS, (a / n, b / n, c / n, d / n))))
    return points


def rank(cands: list[dict], w: dict[str, float]) -> list[str]:
    def total(c: dict) -> float:
        return sum(float(c["scores"][k]) * w[k] for k in DIMS)

    return [
        c["slug"]
        for c in sorted(cands, key=lambda c: (-total(c), float(c["summary"]["landed_cost_per_lb"]), c["slug"]))
    ]


def slim(c: dict) -> dict:
    lca = (c.get("estimate") or {}).get("lca") or {}
    proc = lca.get("process") or {}
    return {
        "slug": c.get("slug"),
        "title": c.get("title"),
        "screening_basis": c.get("screening_basis"),
        "route": (c.get("route") or {}).get("name"),
        "steps": (c.get("route") or {}).get("steps"),
        "landed_cost_per_lb": c["summary"]["landed_cost_per_lb"],
        "materials_cost_per_lb": c["summary"].get("materials_cost_per_lb"),
        "processing_cost_per_lb": c["summary"].get("processing_cost_per_lb"),
        "dominant_cost_driver": c["summary"].get("dominant_cost_driver"),
        "scores": c["scores"],
        "evidence_summary": c.get("evidence_summary"),
        "component_source_types": Counter(x.get("source_type") for x in c.get("components", [])),
        "lca": {
            "total_gwp": lca.get("gwp_kg_co2eq_per_kg_catalyst"),
            "materials_gwp": (lca.get("materials") or {}).get("gwp_kg_co2eq_per_kg_catalyst"),
            "process_gwp": proc.get("gwp_kg_co2eq_per_kg_catalyst"),
            "total_ced": lca.get("ced_mj_per_kg_catalyst"),
            "coverage_pct": lca.get("coverage_pct"),
            "steps_modeled": proc.get("modeled_step_count"),
            "steps_total": proc.get("total_step_count"),
            "system_boundary": lca.get("system_boundary"),
        },
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--grid", type=float, default=0.1, help="weight-simplex grid step")
    ap.add_argument("--price-basis", type=Path, help="frozen price basis JSON (a previous run's output, or its price_basis map) instead of the local database")
    ap.add_argument("--basis-type", choices=("live", "reference"), default="live", help="price tier used when resolving benchmark components")
    args = ap.parse_args()

    create_db_and_tables()
    grid = simplex_grid(args.grid)
    families_out: list[dict] = []
    summary: list[dict] = []

    with Session(engine) as session:
        ensure_material_library_seeded(session)
        if args.price_basis:
            payload = json.loads(args.price_basis.read_text(encoding="utf-8"))
            price_basis = payload.get("price_basis", payload)
        else:
            price_basis = _latest_price_map(session, basis=args.basis_type)
        catalogs = _load_catalogs()

        for fam in list_benchmark_families():
            key = fam["family"]
            catalog = catalogs[key]
            profiles = list(catalog["decision_profiles"])
            by_profile: dict[str, dict] = {}
            for profile in profiles:
                by_profile[profile] = evaluate_benchmark_family(session=session, family=key, profile=profile, prices=price_basis, basis=args.basis_type)

            balanced = by_profile.get("balanced") or by_profile[profiles[0]]
            base_w = dict(balanced["decision_profile"]["weights"])
            perf0 = {k: (0.0 if k == "performance" else base_w[k]) for k in DIMS}
            s = sum(perf0.values())
            perf0 = {k: v / s for k, v in perf0.items()}
            perf0_res = evaluate_benchmark_family(session=session, family=key, profile=balanced["decision_profile"]["id"], weights=perf0, prices=price_basis, basis=args.basis_type)

            cands = balanced["candidates"]
            balanced_winner = cands[0]["slug"] if cands else None
            winners = Counter(rank(cands, w)[0] for w in grid) if cands else Counter()
            stability = 100.0 * winners.get(balanced_winner, 0) / len(grid) if cands else None

            slim_cands = [slim(c) for c in cands]
            proc_shares = [
                sc["lca"]["process_gwp"] / sc["lca"]["total_gwp"]
                for sc in slim_cands
                if sc["lca"]["total_gwp"] and sc["lca"]["process_gwp"] is not None
            ]
            covs = [sc["lca"]["coverage_pct"] for sc in slim_cands if sc["lca"]["coverage_pct"] is not None]

            families_out.append({
                "family": key,
                "title": fam["title"],
                "reaction": fam["reaction"],
                "catalyst_domain": balanced["catalyst_domain"],
                "profiles": {p: {"weights": r["decision_profile"]["weights"], "ranking": [c["slug"] for c in r["candidates"]]} for p, r in by_profile.items()},
                "performance_zero": {"weights": perf0, "ranking": [c["slug"] for c in perf0_res["candidates"]]},
                "simplex": {"grid_step": args.grid, "points": len(grid), "winner_counts": dict(winners), "balanced_winner_share_pct": stability},
                "candidates": slim_cands,
                "score_basis_note": balanced.get("score_basis_note"),
            })
            summary.append({
                "family": key,
                "domain": balanced["catalyst_domain"],
                "n": len(cands),
                "winner_balanced": balanced_winner,
                "winner_cost_first": (by_profile.get("cost-first") or {}).get("winner", {}).get("slug") if by_profile.get("cost-first") else None,
                "winner_evidence_first": (by_profile.get("evidence-first") or {}).get("winner", {}).get("slug") if by_profile.get("evidence-first") else None,
                "winner_perf0": perf0_res["winner"]["slug"] if perf0_res["winner"] else None,
                "distinct_winners_on_grid": len(winners),
                "balanced_winner_share_pct": None if stability is None else round(stability, 1),
                "lca_process_share_mean_pct": round(100 * sum(proc_shares) / len(proc_shares), 2) if proc_shares else None,
                "lca_coverage_mean_pct": round(sum(covs) / len(covs), 1) if covs else None,
                "screening_basis": dict(Counter(sc["screening_basis"] for sc in slim_cands)),
            })

    out = {
        "generated_at": datetime.fromtimestamp(int(os.environ["SOURCE_DATE_EPOCH"]), UTC).isoformat() if "SOURCE_DATE_EPOCH" in os.environ else (None if args.price_basis else datetime.now(UTC).isoformat()),
        "price_basis_source": args.price_basis.name if args.price_basis else "application database",
        "basis_type": args.basis_type,
        "price_basis": price_basis,
        "simplex_grid_step": args.grid,
        "summary": summary,
        "families": families_out,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, indent=1, default=str), encoding="utf-8")

    print(f"{'family':<36}{'dom':<8}{'n':>3}{'grid#':>7}{'stab%':>7}{'proc%':>7}{'cov%':>6}  winner(balanced) -> perf0")
    for r in summary:
        same = "=" if r["winner_balanced"] == r["winner_perf0"] else "!="
        print(
            f"{r['family']:<36}{r['domain'][:7]:<8}{r['n']:>3}{r['distinct_winners_on_grid']:>7}"
            f"{(r['balanced_winner_share_pct'] if r['balanced_winner_share_pct'] is not None else float('nan')):>7.1f}"
            f"{(r['lca_process_share_mean_pct'] if r['lca_process_share_mean_pct'] is not None else float('nan')):>7.2f}"
            f"{(r['lca_coverage_mean_pct'] if r['lca_coverage_mean_pct'] is not None else float('nan')):>6.0f}"
            f"  {r['winner_balanced']} {same} {r['winner_perf0']}"
        )
    print(f"\nwrote {args.out}  (families={len(summary)}, candidates={sum(r['n'] for r in summary)}, grid points={len(grid)})")


if __name__ == "__main__":
    main()
