"""Generate six standalone paper figures from the reproduction pipeline outputs."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.patches import FancyBboxPatch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

BLUE = "#376D9C"
GOLD = "#B78B35"
INK = "#26313B"
GREY = "#DEE2E6"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--date", required=True)
    args = parser.parse_args()
    directory, run_date = args.directory, args.date
    outdir = directory / "figures"
    outdir.mkdir(parents=True, exist_ok=True)

    def load(name):
        return json.loads((directory / f"{name}_{run_date}.json").read_text(encoding="utf-8"))

    summary, library, breakeven = [load(n) for n in ("paper_summary", "all_families", "active_metal_breakeven")]
    month = summary["basis_month"]
    contracts = []
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.spines.top": False, "axes.spines.right": False, "axes.labelcolor": INK, "text.color": INK, "xtick.color": INK, "ytick.color": INK, "svg.fonttype": "none", "svg.hashsalt": "comet-paper", "axes.axisbelow": True})

    def save(fig, name, question, fields, note, chart):
        fig.text(0.02, 0.014, note, fontsize=8, color=INK)
        fig.tight_layout(rect=(0, 0.06, 1, 0.94))
        for ext in ("svg", "png"):
            fig.savefig(outdir / f"{name}_{run_date}.{ext}", dpi=180, metadata={"Date": None} if ext == "svg" else None)
        plt.close(fig)
        contracts.append({"figure": name, "question": question, "chart": chart, "source_keys": fields, "note": note, "palette": {"blue": BLUE, "gold": GOLD, "neutral": INK}, "non_color_distinction": "direct labels, separate markers or open fill", "formats": ["svg", "png"]})

    fig, ax = plt.subplots(figsize=(10, 5.8))
    ax.set(xlim=(0, 10), ylim=(0, 6))
    ax.axis("off")
    nodes = [
        (0.2, 4.1, "Source observations", "IMF / Johnson Matthey\nLive-tier providers\nPublic material references"),
        (3.5, 4.1, "Frozen inputs", "Raw history + SHA-256\nCompleted monthly means\nSeparate live snapshot"),
        (6.8, 4.1, "Price basis", "One reference month\nExplicit metal anchors\nSource evidence"),
        (6.8, 1.0, "Cost and LCA engine", "Step Method / electrode model\nScale and margin assumptions\nCoverage and missing processes"),
        (3.5, 1.0, "Deterministic analyses", "Benchmark weight grid\nHistorical replay\nActive-metal sweeps"),
        (0.2, 1.0, "Research outputs", "JSON + environment manifest\nFigures and numerical tables\nDesktop / web result views"),
    ]
    for x, y, title, detail in nodes:
        ax.add_patch(FancyBboxPatch((x, y), 2.8, 1.5, boxstyle="round,pad=0.08,rounding_size=0.08", facecolor="white", edgecolor=BLUE, linewidth=1.3))
        ax.text(x + 1.4, y + 1.16, title, ha="center", fontweight="bold")
        ax.text(x + 1.4, y + 0.56, detail, ha="center", va="center", fontsize=9, linespacing=1.5)
    for start, end in [((3.02, 4.85), (3.38, 4.85)), ((6.32, 4.85), (6.68, 4.85)), ((8.2, 4.0), (8.2, 2.63)), ((6.68, 1.75), (6.32, 1.75)), ((3.38, 1.75), (3.02, 1.75))]:
        ax.annotate("", xy=end, xytext=start, arrowprops={"arrowstyle": "->", "color": INK, "lw": 1.4})
    fig.suptitle("COMET architecture and research data flow", fontsize=15, x=0.02, ha="left")
    save(fig, "figure1_architecture", "How do source observations become traceable research outputs?", ["scripts/reproduce_paper.py", "backend/core", "frontend/src"], "Reference histories and local live quotes remain separate; legacy fallback sources retain their original labels.", "directed process diagram")

    fig, ax = plt.subplots(figsize=(9, 5.3))
    rows = summary["table62"]
    x = np.arange(len(rows))
    bars = ax.bar(x - 0.18, [r["published_usd_per_lb"] for r in rows], width=0.36, color="white", edgecolor=INK, linewidth=1.2, label="Published Table 6.2")
    ax.bar_label(bars, fmt="%.2f", padding=3)
    bars = ax.bar(x + 0.18, [r["comet_usd_per_lb"] for r in rows], width=0.36, color=BLUE, edgecolor=INK, linewidth=0.6, label="COMET")
    ax.bar_label(bars, fmt="%.2f", padding=3)
    ax.set(xticks=x, xticklabels=["2 wt% Pt/C", "21 wt% Ni/Al2O3", "USY-FCC\n67 short tons/day (footnote b)"], ylabel="Catalyst selling price (2017 USD/lb)", ylim=(0, max(r["published_usd_per_lb"] for r in rows) * 1.2))
    ax.yaxis.grid(True, color=GREY)
    ax.legend(frameon=False)
    fig.suptitle("CatCost Table 6.2 reproduction", fontsize=15, x=0.02, ha="left")
    save(fig, "figure2_table62", "Does the independent Step Method reproduce the three published cases?", [f"paper_summary_{run_date}.json:table62"], "Published materials and step inputs; no calibration. Residuals: " + ", ".join(f"{r['residual_pct']:+.2f}%" for r in rows) + ".", "grouped bars")

    fig, ax = plt.subplots(figsize=(9, 5.8))
    plotted = 0
    for high, marker, color, label in [(True, "o", BLUE, "Materials LCA coverage ≥50%"), (False, "x", GOLD, "Materials LCA coverage <50%")]:
        candidates = [c for f in library["families"] if f["catalyst_domain"] != "electrocatalyst" for c in f["candidates"] if c["lca"]["total_gwp"] and c["landed_cost_per_lb"] > 0 and ((c["lca"]["coverage_pct"] or 0) >= 50) == high]
        plotted += len(candidates)
        ax.scatter([c["landed_cost_per_lb"] for c in candidates], [c["lca"]["total_gwp"] for c in candidates], s=35, marker=marker, c=color, alpha=0.85, label=f"{label} (n={len(candidates)})")
    ax.set(xscale="log", yscale="log", xlabel="Delivered thermocatalyst cost (USD/lb; log scale)", ylabel="Modeled cradle-to-gate GWP (kg CO2-eq/kg; log scale)")
    ax.grid(True, color=GREY, which="major")
    ax.legend(frameon=False, loc="upper left")
    fig.suptitle(f"Library GWP and thermocatalyst cost — {month}", fontsize=15, x=0.02, ha="left")
    save(fig, "figure3_gwp_cost", "How does modeled GWP compare with cost for the same mass-based candidates?", [f"all_families_{run_date}.json:families[].candidates[].landed_cost_per_lb", "families[].candidates[].lca"], f"n={plotted} thermocatalysts with positive modeled GWP. Unmatched materials contribute no assumed factor; low-coverage GWP is incomplete.", "log-log scatter")

    fig, ax = plt.subplots(figsize=(10, 9.5))
    ordered = sorted(library["families"], key=lambda f: (f["simplex"]["balanced_winner_share_pct"], f["family"]))
    vals = [f["simplex"]["balanced_winner_share_pct"] for f in ordered]
    ax.barh([f["family"] for f in ordered], vals, color=BLUE, edgecolor=INK, linewidth=0.4)
    ax.axvline(50, color=INK, linestyle="--", linewidth=1)
    ax.set(xlim=(0, 105), xlabel="Grid points retaining the balanced-profile winner (%)")
    ax.xaxis.grid(True, color=GREY)
    ax.tick_params(axis="y", labelsize=8.5)
    fig.suptitle(f"MCDA weight sensitivity — {month}", fontsize=15, x=0.02, ha="left")
    save(fig, "figure4_weight_sensitivity", "How frequently does the balanced winner remain first as weights change?", [f"all_families_{run_date}.json:families[].simplex"], f"{len(ordered)} families; {summary['weight_sensitivity']['grid_points']} simplex points, step 0.1. Dashed guide = 50%. Scores are author-assigned screening judgments.", "ranked horizontal bars")

    fig, ax = plt.subplots(figsize=(9, 5.4))
    comparison = summary["live_reference_comparison"]
    if comparison["status"] == "available":
        profiles = sorted({r["profile"] for r in comparison["rows"]})
        vals = [sum(r["changed"] for r in comparison["rows"] if r["profile"] == p) for p in profiles]
        bars = ax.barh([p.replace("_", " ") for p in profiles], vals, color=BLUE, edgecolor=INK, linewidth=0.6)
        ax.bar_label(bars, fmt="%d", padding=4)
        ax.set(xlim=(0, summary["families"] + 1), xlabel="Families with different winning candidate")
        ax.xaxis.grid(True, color=GREY)
        note = f"Denominator: {summary['families']} families per profile. Live = frozen observed quote snapshot; original source dates are retained."
    else:
        ax.axis("off")
        ax.text(0.5, 0.5, "Live comparison unavailable\nNo observed local live quotes were present", ha="center", va="center", fontsize=14)
        note = "No substitute live values were fabricated. The reference analyses remain available."
    fig.suptitle(f"Live versus reference recommendations — reference {month}", fontsize=15, x=0.02, ha="left")
    save(fig, "figure5_live_reference", "Does the selected price tier change the winning candidate?", [f"paper_summary_{run_date}.json:live_reference_comparison", f"live_basis_{run_date}.json:price_basis"], note, "horizontal count bars or unavailable annotation")

    from sqlmodel import Session

    from backend.core.breakeven import cost_pair
    from backend.core.decision_engine import evaluate_benchmark_family
    from backend.database import engine

    selected = []
    for key in ("ammonia-cracking", "co-prox", "dry-reforming"):
        family = next(f for f in breakeven["families"] if f["family"] == key)
        contest = next((c for c in family["contests"] if c["precious"] and c["kind"] == "precious_vs_base"), None)
        if contest:
            selected.append((family, contest))
    sweep_rows = []
    fig, axes = plt.subplots(1, len(selected), figsize=(12, 4.8), squeeze=False)
    with Session(engine) as session:
        for ax, (family, contest) in zip(axes[0], selected):
            baseline = breakeven["price_basis"]
            symbol = contest["symbol"]
            factors = np.logspace(-3, 2, 41)
            ratios = []
            for factor in factors:
                prices = {s: dict(e) for s, e in baseline.items()}
                prices[symbol]["price"] *= float(factor)
                result = evaluate_benchmark_family(session=session, family=family["family"], prices=prices, basis=breakeven.get("basis_type", "reference"))
                by_slug = {c["slug"]: c for c in result["candidates"]}
                cost_a, cost_b, unit = cost_pair(by_slug[contest["a"]], by_slug[contest["b"]])
                ratios.append(cost_b / cost_a)
                sweep_rows.append({"family": family["family"], "a": contest["a"], "b": contest["b"], "symbol": symbol, "price_factor": float(factor), "metal_price": prices[symbol]["price"], "metal_unit": prices[symbol]["unit"], "cost_a": cost_a, "cost_b": cost_b, "cost_unit": unit, "cost_b_over_a": cost_b / cost_a})
            ax.plot(factors, ratios, color=BLUE, linewidth=1.8)
            ax.axhline(1, color=INK, linestyle="--", linewidth=1)
            ax.axvline(1, color=INK, linestyle=":", linewidth=1)
            ax.set(xscale="log", yscale="log", title=f"{family['family']}\n{symbol} price sweep", xlabel="Metal price / baseline price", ylabel="Rival cost / baseline cost winner")
            ax.grid(True, color=GREY)
    (directory / f"breakeven_sweep_points_{run_date}.json").write_text(json.dumps({"basis_month": month, "basis_type": breakeven.get("basis_type"), "rows": sweep_rows}, indent=2), encoding="utf-8")
    fig.suptitle(f"Active-metal break-even sweeps — {month}", fontsize=15, x=0.02, ha="left")
    save(fig, "figure6_breakeven_sweeps", "At which distinguishing-metal price does a rival become cheaper?", [f"breakeven_sweep_points_{run_date}.json:rows", f"active_metal_breakeven_{run_date}.json:families[].contests"], "All other prices held fixed. Horizontal dashed guide = equal cost; vertical dotted guide = baseline metal price. Full candidate IDs are in the data file.", "faceted log-log sweep curves")
    (directory / f"figure_manifest_{run_date}.json").write_text(json.dumps({"renderer": "Matplotlib", "run_date": run_date, "figures": contracts}, indent=2), encoding="utf-8")
    from backend.routers.templates import template_costs

    manufacturing = {"price_basis": "published Step Method rates, escalated with bundled ChemPPI", "scales": {str(size): template_costs(order_size_tons=float(size), catalyst_domain="thermal") for size in (2, 20, 200)}}
    (directory / f"manufacturing_costs_{run_date}.json").write_text(json.dumps(manufacturing, indent=2), encoding="utf-8")
    print(f"wrote {len(contracts)} SVG and PNG figure pairs to {outdir}")


if __name__ == "__main__":
    main()
