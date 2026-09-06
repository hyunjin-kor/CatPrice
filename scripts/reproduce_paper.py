"""Reproduce the paper from frozen, traceable inputs with one command.

python scripts/reproduce_paper.py --price-basis reference --month 2026-07 --seed 20260906
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import time
import tomllib
from collections import Counter
from datetime import UTC, date, datetime
from pathlib import Path
from statistics import mean, median, quantiles

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.core.reference_basis import (  # noqa: E402
    latest_common_month,
    monthly_average,
    truncate_series,
)

REFERENCE_SYMBOLS = {"Al", "Cu", "Ni", "Zn", "Sn", "Co", "Mo", "Au", "Ag", "Pt", "Pd", "Rh", "Ru", "Ir"}
FALLBACK = ROOT / "docs/paper/price_history_2026-09-02.json"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, allow_nan=False), encoding="utf-8")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize_history(payload: dict, month: str | None, today: date) -> tuple[dict, str]:
    """Keep completed monthly averages; legacy daily input remains explicitly labelled."""
    current_month = today.strftime("%Y-%m")
    series = {}
    for symbol, entry in sorted(payload["series"].items()):
        points = [p for p in entry["points"] if str(p["date"])[:7] < current_month]
        if not points:
            raise ValueError(f"{symbol}: no completed month in the input snapshot")
        is_monthly = entry.get("cadence", payload.get("cadence")) == "monthly_average"
        averaged = monthly_average(points)
        series[symbol] = {
            **entry,
            "source": entry["source"] if is_monthly else f"{entry['source']} (frozen observations averaged by month)",
            "cadence": "monthly_average",
            "transformation": "published monthly averages retained" if is_monthly else "arithmetic mean of available frozen observations; original source retained",
            "points": averaged,
        }
    latest = latest_common_month(series)
    selected = month or latest
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", selected):
        raise ValueError("month must be YYYY-MM")
    if selected >= current_month:
        raise ValueError(f"{selected}: current or future month is incomplete")
    if selected > latest:
        raise ValueError(f"{selected}: later than latest_common_month {latest}")
    for symbol, entry in series.items():
        if not any(p["date"][:7] == selected for p in entry["points"]):
            raise ValueError(f"{symbol}: no observation in {selected}")
    return {
        "cadence": "monthly_average",
        "basis_month": selected,
        "latest_common_month": latest,
        "normalization_note": "Current/future months excluded. Legacy daily histories use available-observation means, not an assertion of IMF publication.",
        "series": truncate_series(series, selected),
    }, selected


def run_command(command: list[str], env: dict[str, str], records: list[dict], *, timeout: int | None = None) -> dict:
    started = time.perf_counter()
    try:
        result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
        record = {"command": command, "returncode": result.returncode, "stdout": result.stdout, "stderr": result.stderr}
    except subprocess.TimeoutExpired as exc:
        record = {"command": command, "returncode": None, "stdout": str(exc.stdout or ""), "stderr": f"timeout after {timeout} seconds: {exc.stderr or ''}"}
    record["elapsed_seconds"] = round(time.perf_counter() - started, 3)
    records.append(record)
    print(f"{Path(command[1]).name}: returncode={record['returncode']}, {record['elapsed_seconds']:.3f}s", flush=True)
    return record


def classify_live_snapshot(payload: dict) -> dict:
    """Classify only the selected quotes; supplied status cannot override evidence."""
    from backend.core.price_evidence import describe_price_evidence

    reference_only = (
        payload.get("basis") == "reference"
        or payload.get("basis_type") == "reference"
        or payload.get("cadence") == "monthly_average"
    )
    observed = []
    if not reference_only:
        for symbol, quote in payload["price_basis"].items():
            source = quote.get("source") or ""
            if "monthly" in source.lower() or "averaged by month" in source.lower():
                continue
            if describe_price_evidence(source=source)["freshness_target_hours"] is not None:
                observed.append(symbol)
    return {**payload, "status": "available" if observed else "unavailable", "observed_symbols": sorted(observed)}


def snapshot_live(path: Path) -> dict:
    """Read existing local live quotes without collecting prices or writing to the DB."""
    from sqlalchemy import inspect
    from sqlmodel import Session

    from backend.core.decision_engine import _latest_price_map
    from backend.database import engine

    if not inspect(engine).has_table("metal_prices"):
        payload = {"status": "unavailable", "reason": "local database has no metal_prices table", "observed_symbols": [], "price_basis": {}}
    else:
        with Session(engine) as session:
            basis = _latest_price_map(session, "live")
        payload = classify_live_snapshot({
            "source": "existing local live-tier database snapshot; no network refresh performed",
            "price_basis": basis,
            "note": "Quote dates and source labels are preserved. Anchors are not live observations.",
        })
    write_json(path, payload)
    return payload


def summarize(families: dict, volatility: dict, breakeven: dict, table62: list, live: dict | None) -> dict:
    candidates = [c for f in families["families"] for c in f["candidates"]]
    coverages = [c["lca"]["coverage_pct"] for c in candidates if c["lca"]["coverage_pct"] is not None]
    route_shares = [100 * c["lca"]["process_gwp"] / c["lca"]["total_gwp"] for c in candidates if (c["lca"]["coverage_pct"] or 0) >= 50 and c["lca"]["steps_modeled"] and c["lca"]["total_gwp"]]
    stability = [f["simplex"]["balanced_winner_share_pct"] for f in families["families"]]
    contests = [c for f in breakeven["families"] for c in f["contests"]]
    pgm = [c for c in contests if c["kind"] == "precious_vs_base" and c["precious"]]
    cross = [c["cost"]["crossing_over_baseline"][0] for c in pgm if c["cost"].get("crossings")]
    reproduction = []
    for case in table62:
        row = next(r for r in case["rows"] if r["key"] == "estimated_price_per_lb")
        effective = case.get("with_published_rate", {})
        reproduction.append({
            "name": case["name"], "published_usd_per_lb": row["published"],
            "comet_usd_per_lb": effective.get("estimated_price_per_lb", row["comet"]),
            "residual_pct": effective.get("dev_pct_vs_published", row["dev_pct"]),
            "effective_rate_ton_per_day": effective.get("effective_rate_ton_per_day"),
        })
    comparison = []
    if live:
        live_by = {f["family"]: f for f in live["families"]}
        for family in families["families"]:
            other = live_by[family["family"]]
            for profile in [*family["profiles"], "performance_zero"]:
                ref_rank = family[profile]["ranking"] if profile == "performance_zero" else family["profiles"][profile]["ranking"]
                live_rank = other[profile]["ranking"] if profile == "performance_zero" else other["profiles"][profile]["ranking"]
                comparison.append({"family": family["family"], "profile": profile, "reference_winner": ref_rank[0], "live_winner": live_rank[0], "changed": ref_rank[0] != live_rank[0]})
    return {
        "families": len(families["families"]), "candidates": len(candidates),
        "screening_basis_counts": dict(sorted(Counter(c["screening_basis"] for c in candidates).items())),
        "component_source_type_counts": dict(sum((Counter(c["component_source_types"]) for c in candidates), Counter())),
        "table62": reproduction,
        "weight_sensitivity": {"grid_points": families["families"][0]["simplex"]["points"], "median_balanced_winner_share_pct": median(stability), "min_balanced_winner_share_pct": min(stability), "max_balanced_winner_share_pct": max(stability), "families_below_50_pct": sum(v < 50 for v in stability), "performance_zero_changes": sum(f["profiles"]["balanced"]["ranking"][0] != f["performance_zero"]["ranking"][0] for f in families["families"])},
        "lca": {"coverage_mean_pct": mean(coverages), "coverage_median_pct": median(coverages), "candidates_coverage_at_least_90_pct": sum(v >= 90 for v in coverages), "candidates_coverage_below_50_pct": sum(v < 50 for v in coverages), "route_share_eligible_candidates": len(route_shares), "route_share_median_pct": median(route_shares) if route_shares else None, "route_share_p90_pct": quantiles(route_shares, n=10, method="inclusive")[8] if len(route_shares) > 1 else (route_shares[0] if route_shares else None), "route_share_max_pct": max(route_shares) if route_shares else None},
        "volatility": {**volatility["headline"], "window": volatility["price_window"], "varying_symbols": volatility["varying_symbols"], "held_at_baseline": volatility["held_at_baseline_incomplete_coverage"]},
        "breakeven": {"families": len(breakeven["families"]), "contests": len(contests), "errors": breakeven["errors"], "exposure_counts": dict(sorted(Counter(f["exposure"] for f in breakeven["families"]).items())), "precious_vs_base_sweeps": len(pgm), "precious_cost_crossings": len(cross), "precious_cost_crossing_median_factor": median(cross) if cross else None, "precious_cost_crossings_between_0_1_and_10": sum(0.1 <= x <= 10 for x in cross), "precious_without_cost_crossing_in_scan": sum(not c["cost"].get("crossings") and "error" not in c["cost"] for c in pgm)},
        "live_reference_comparison": {"status": "available" if live else "unavailable", "rows": comparison, "changed_by_profile": dict(sorted(Counter(r["profile"] for r in comparison if r["changed"]).items()))},
    }


def write_results(path: Path, summary: dict, manifest: dict) -> None:
    w, lca, vol, be = (summary[k] for k in ("weight_sensitivity", "lca", "volatility", "breakeven"))
    lines = [f"# Paper results — {manifest['run_date']}", "", f"Price basis: **{manifest['price_basis']}**, completed month **{manifest['basis_month']}**. Seed: **{manifest['seed']}**.", "", f"Input status: {manifest['history']['status']}. {manifest['history']['note']}", "", "All numerical summaries below are generated from `paper_summary_" + manifest["run_date"] + ".json`; full commands, environment, snapshot hashes and timings are in the reproduction manifest.", "", "## CatCost Table 6.2", "", "| Case | Published $/lb | COMET $/lb | Residual % |", "|---|---:|---:|---:|"]
    for c in summary["table62"]:
        lines.append(f"| {c['name']} | {c['published_usd_per_lb']:.2f} | {c['comet_usd_per_lb']:.4f} | {c['residual_pct']:+.2f} |")
    lines += ["", "FCC uses the published footnote-b effective production rate. The other comparison file retains the nominal-rate diagnostic; it is not the FCC validation value.", "", "## Library and weight sensitivity", "", f"{summary['families']} families and {summary['candidates']} candidates; {w['grid_points']} weight-simplex points. Balanced-winner stability median {w['median_balanced_winner_share_pct']:.2f}% (range {w['min_balanced_winner_share_pct']:.2f}–{w['max_balanced_winner_share_pct']:.2f}%); {w['families_below_50_pct']} families below 50%. Setting performance weight to zero changes {w['performance_zero_changes']} winners.", "", "Author-assigned performance, evidence and route scores are screening judgments, not measured catalytic performance. Report cost ordering and composite recommendations separately.", "", "## LCA coverage", "", f"Mean coverage {lca['coverage_mean_pct']:.2f}%; median {lca['coverage_median_pct']:.2f}%; {lca['candidates_coverage_at_least_90_pct']} candidates at or above 90%, {lca['candidates_coverage_below_50_pct']} below 50%. Carbon, silica and zeolite factors were not filled with assumed values.", "", f"Among {lca['route_share_eligible_candidates']} candidates with at least 50% materials coverage and a modeled process, median route-energy GWP share is {lca['route_share_median_pct']:.2f}% and maximum {lca['route_share_max_pct']:.2f}%.", "", "## Historical price replay", "", f"{vol['window']['states']} monthly states, {vol['window']['first']} to {vol['window']['last']}. Performance-zero recommendations change in {vol['families_flipping_performance_zero']} of {vol['families']} families; balanced recommendations change in {vol['families_flipping_balanced']}.", "", "Varying metals: " + ", ".join(vol["varying_symbols"]) + ". Incomplete series held at baseline: " + (", ".join(vol["held_at_baseline"]) or "none") + ".", "", "## Active-metal break-even", "", f"{be['families']} families; {be['contests']} contests; {len(be['errors'])} family errors. In {be['precious_vs_base_sweeps']} precious-metal sweeps against a base-metal alternative, {be['precious_cost_crossings']} cost crossings occur in the 0.001×–100× scan; {be['precious_cost_crossings_between_0_1_and_10']} lie between 0.1× and 10× of baseline. No crossing in a finite scan is not proof that free precious metal can never win.", "", "## Live versus reference", "", "Comparison status: " + summary["live_reference_comparison"]["status"] + ". The live comparison uses the frozen observed quote snapshot with its original source dates. The manifest records whether quotes came from the existing local database or an explicitly supplied collection.", ""]
    for profile, count in summary["live_reference_comparison"]["changed_by_profile"].items():
        lines.append(f"- {profile}: {count} changed winners of {summary['families']} families.")
    lines += ["", "## Reproduction", "", "```bash", f"python scripts/reproduce_paper.py --price-basis reference --month {manifest['basis_month']} --seed {manifest['seed']}", "```", "", "Raw history SHA-256: `" + manifest["history"]["sha256"] + "`.", "", "The raw input is retained byte-for-byte. The separate monthly-history derivative excludes incomplete months; its source labels distinguish institutional averages from legacy observation means. The analysis DB is temporary and seeded from committed library files.", "", "Six SVG/PNG figures and their source-key contracts are generated by `scripts/generate_paper_figures.py`. Non-quantitative architecture annotations describe the implemented source-to-result flow.", ""]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--price-basis", choices=("reference",), default="reference")
    parser.add_argument("--month", help="YYYY-MM; default latest common completed month")
    parser.add_argument("--seed", type=int, default=20260906)
    parser.add_argument("--out-dir", type=Path, default=ROOT / "docs/paper")
    parser.add_argument("--date", default=date.today().isoformat(), help="output filename date")
    parser.add_argument("--history", type=Path, help="use an existing frozen input without network collection")
    parser.add_argument("--live-basis", type=Path, help="reuse an explicitly frozen live-basis snapshot for the comparison")
    args = parser.parse_args()
    date.fromisoformat(args.date)
    if not 0 <= args.seed <= 4294967295:
        parser.error("seed must be in [0, 4294967295]")
    args.out_dir = args.out_dir.resolve()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    paths = {name: args.out_dir / f"{name}_{args.date}.json" for name in ("price_history", "monthly_history", "reference_basis", "live_basis", "all_families", "all_families_live", "price_volatility", "active_metal_breakeven", "table62_reproduction", "manufacturing_costs", "paper_summary", "reproduction_manifest")}
    env = {**os.environ, "PYTHONHASHSEED": str(args.seed), "PYTHONIOENCODING": "utf-8"}
    manifest = {"run_date": args.date, "started_at": datetime.now(UTC).isoformat(), "price_basis": args.price_basis, "seed": args.seed, "seed_scope": "PYTHONHASHSEED; all three analyses use deterministic enumeration and do not invoke Monte Carlo", "environment": {"python": sys.version, "platform": platform.platform(), "packages": {d.metadata["Name"]: d.version for d in sorted(importlib.metadata.distributions(), key=lambda d: d.metadata["Name"].lower()) if d.metadata.get("Name")}}, "commands": [], "status": "running"}
    records = manifest["commands"]
    try:
        with tempfile.TemporaryDirectory(prefix="comet-paper-") as temp:
            fetched = Path(temp) / "fetched_history.json"
            if args.history:
                source, status, note = args.history.resolve(), "provided_snapshot", "Network collection skipped explicitly via --history."
            else:
                fetch = run_command([sys.executable, "scripts/fetch_price_history.py", "--out", str(fetched)], env, records, timeout=600)
                payload = read_json(fetched) if fetched.exists() else {}
                complete = REFERENCE_SYMBOLS <= set(payload.get("series", {}))
                if fetch["returncode"] == 0 and complete:
                    source, status, note = fetched, "fresh_reference_history", "IMF PCPS and Johnson Matthey monthly series fetched; provider failures retained in raw input."
                else:
                    source, status, note = FALLBACK, "frozen_fallback", "Fresh reference collection failed or missed required symbols. Authorized 2026-09-02 history reused; legacy Yahoo/JM/Westmetall labels retained, no claim of IMF coverage."
                    manifest["fetch_failures"] = payload.get("failures", {})
                    manifest["missing_reference_symbols"] = sorted(REFERENCE_SYMBOLS - set(payload.get("series", {})))
            if source != paths["price_history"]:
                shutil.copyfile(source, paths["price_history"])
            manifest["history"] = {"status": status, "note": note, "source": str(source) if source != fetched else "scripts/fetch_price_history.py", "file": paths["price_history"].name, "sha256": sha256(paths["price_history"])}
            normalized, month = normalize_history(read_json(paths["price_history"]), args.month, date.today())
            manifest["basis_month"] = month
            manifest["history"]["upstream_metadata"] = {k: v for k, v in read_json(paths["price_history"]).items() if k != "series"}
            normalized["raw_input_sha256"] = manifest["history"]["sha256"]
            write_json(paths["monthly_history"], normalized)
            if args.live_basis:
                live = classify_live_snapshot(read_json(args.live_basis))
                write_json(paths["live_basis"], live)
            else:
                live = snapshot_live(paths["live_basis"])
            manifest["live_snapshot"] = {k: v for k, v in live.items() if k != "price_basis"}
            env["DATABASE_URL"] = "sqlite:///" + (Path(temp) / "analysis.db").as_posix()
            snapshot_data = Path(temp) / "data"
            shutil.copytree(ROOT / "backend/data", snapshot_data)
            env["COMET_DATA_DIR"] = str(snapshot_data)
            manifest["inputs"] = [{"file": "backend/data/" + path.relative_to(snapshot_data).as_posix(), "sha256": sha256(path)} for path in sorted(snapshot_data.rglob("*.json"))]
            manifest["code_inputs"] = [{"file": str(path.relative_to(ROOT)), "sha256": sha256(path)} for path in sorted([*(ROOT / "backend/core").glob("*.py"), *(ROOT / "scripts").glob("*.py")])]
            manifest["project_version"] = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))["project"]["version"]
            manifest["analysis_database"] = "new temporary SQLite database seeded from committed library data"
            basis = paths["reference_basis"]
            since = min(entry["first"][:7] for entry in normalized["series"].values())
            commands = [
                ["scripts/build_reference_basis.py", "--history", str(paths["monthly_history"]), "--month", month, "--out", str(paths["reference_basis"])],
                ["scripts/reproduce_catcost_table62.py", "--json", str(paths["table62_reproduction"])],
                ["scripts/run_all_families.py", "--price-basis", str(basis), "--basis-type", args.price_basis, "--out", str(paths["all_families"])],
                ["scripts/price_volatility_screen.py", "--history", str(paths["monthly_history"]), "--since", since, "--price-basis", str(basis), "--basis-type", args.price_basis, "--out", str(paths["price_volatility"])],
                ["scripts/active_metal_breakeven.py", "--history", str(paths["monthly_history"]), "--price-basis", str(basis), "--basis-type", args.price_basis, "--out", str(paths["active_metal_breakeven"])],
            ]
            if live["status"] == "available":
                commands.append(["scripts/run_all_families.py", "--price-basis", str(paths["live_basis"]), "--basis-type", "live", "--out", str(paths["all_families_live"])])
            for command in commands:
                record = run_command([sys.executable, *command], env, records)
                if record["returncode"] != 0:
                    raise RuntimeError(f"{command[0]} failed: {record['stderr'][-2000:]}")
            families, volatility, breakeven, table62 = [read_json(paths[n]) for n in ("all_families", "price_volatility", "active_metal_breakeven", "table62_reproduction")]
            if breakeven["errors"]:
                raise RuntimeError(f"break-even returned family errors: {breakeven['errors']}")
            if any("error" in c[key] for f in breakeven["families"] for c in f["contests"] for key in ("cost", "composite_perf0")):
                raise RuntimeError("break-even returned contest errors; inspect output")
            summary = summarize(families, volatility, breakeven, table62, read_json(paths["all_families_live"]) if live["status"] == "available" else None)
            summary["basis_month"] = month
            summary["seed"] = args.seed
            basis_map = read_json(basis)["price_basis"]
            summary["price_ranges"] = {symbol: {
                "source": entry["source"], "unit": entry["unit"], "first": entry["first"], "last": entry["last"], "months": entry["n"],
                "min": min(p["price"] for p in entry["points"]), "max": max(p["price"] for p in entry["points"]),
                "median": median(p["price"] for p in entry["points"]), "basis_month_price": basis_map[symbol]["price"],
                "min_over_basis": min(p["price"] for p in entry["points"]) / basis_map[symbol]["price"],
                "max_over_basis": max(p["price"] for p in entry["points"]) / basis_map[symbol]["price"],
            } for symbol, entry in normalized["series"].items()}
            checks = summary["table62"]
            if round(checks[0]["comet_usd_per_lb"], 2) != round(checks[0]["published_usd_per_lb"], 2) or abs(checks[1]["residual_pct"]) > 7 or abs(checks[2]["residual_pct"]) > 2:
                raise RuntimeError("CatCost Table 6.2 acceptance tolerances failed")
            write_json(paths["paper_summary"], summary)
            figure = run_command([sys.executable, "scripts/generate_paper_figures.py", "--directory", str(args.out_dir), "--date", args.date], env, records)
            if figure["returncode"] != 0:
                raise RuntimeError(f"figure generation failed: {figure['stderr'][-2000:]}")
            manufacturing = read_json(paths["manufacturing_costs"])
            summary["manufacturing"] = {size: {
                "template_count": len(scale["templates"]), "target_year": scale["target_year"],
                "min_processing_cost_per_lb": min(t["processing_cost_per_lb"] for t in scale["templates"] if t["processing_cost_per_lb"] is not None),
                "max_processing_cost_per_lb": max(t["processing_cost_per_lb"] for t in scale["templates"] if t["processing_cost_per_lb"] is not None),
                "partly_costed_template_ids": [t["id"] for t in scale["templates"] if t["uncosted_operations"] or t["dropped_steps"]],
                "partly_costed_templates": [{"id": t["id"], "name": t["name"], "uncosted_operations": t["uncosted_operations"], "dropped_steps": t["dropped_steps"]} for t in scale["templates"] if t["uncosted_operations"] or t["dropped_steps"]],
            } for size, scale in manufacturing["scales"].items()}
            write_json(paths["paper_summary"], summary)
            write_results(args.out_dir / f"results_{args.date}.md", summary, manifest)
            manifest["code_changed_during_run"] = [entry["file"] for entry in manifest["code_inputs"] if sha256(ROOT / entry["file"]) != entry["sha256"]]
            generated_paths = [*paths.values(), args.out_dir / f"results_{args.date}.md", args.out_dir / f"figure_manifest_{args.date}.json", args.out_dir / f"breakeven_sweep_points_{args.date}.json", *(args.out_dir / "figures").glob(f"*_{args.date}.*")]
            manifest["outputs"] = [{"file": str(path.relative_to(args.out_dir)), "sha256": sha256(path)} for path in sorted(generated_paths) if path.is_file() and path != paths["reproduction_manifest"]]
            manifest["status"] = "complete"
    except Exception as exc:
        manifest["status"] = "failed"
        manifest["error"] = f"{type(exc).__name__}: {exc}"
        raise
    finally:
        manifest["finished_at"] = datetime.now(UTC).isoformat()
        write_json(paths["reproduction_manifest"], manifest)
        print(f"wrote {paths['reproduction_manifest']} ({manifest['status']})", flush=True)


if __name__ == "__main__":
    main()
