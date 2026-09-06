"""Generate the four supporting-information tables from audited, frozen outputs."""

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATE = "2026-09-06"
PAPER = ROOT / "docs/paper"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def cell(value):
    return str(value).replace("|", "/").replace("\n", " ")


def ref(value, file, key):
    return f"{cell(value)}<!-- {file}:{key} -->"


def main():
    library_name = f"all_families_{DATE}.json"
    summary_name = f"paper_summary_{DATE}.json"
    manufacturing_name = f"manufacturing_costs_{DATE}.json"
    audit_name = f"../sources/provenance-{DATE}.json"
    library, summary, manufacturing = [load(PAPER / name) for name in (library_name, summary_name, manufacturing_name)]
    audit = load(PAPER / audit_name)
    lines = [
        "# Supporting information — COMET",
        "",
        f"Reference month {ref(summary['basis_month'], summary_name, 'basis_month')}; seed {ref(summary['seed'], summary_name, 'seed')}. The library contains {ref(summary['families'], summary_name, 'families')} reaction families and {ref(summary['candidates'], summary_name, 'candidates')} representative candidates. Every numerical result is tied to a frozen JSON key in an adjacent HTML comment.",
        "",
        "## Table S1. Reaction families and representative candidates",
        "",
        "These are representative literature architectures and engineering proxies, not measured performance points or supplier quotations. The screening basis is copied from the catalog. Electrode candidates are identified by domain; their mass-based catalyst cost below must not be interpreted as the electrode assembly cost per area. LCA coverage is matched material mass, and a missing factor contributes no assumed impact.",
        "",
        "| Family | Candidate and domain | Screening basis | Manufacturing route | Catalyst cost (USD/lb) | Modeled GWP (kg CO2-eq/kg) | Materials coverage (%) |",
        "|---|---|---|---|---:|---:|---:|",
    ]
    for fi, family in enumerate(library["families"]):
        for ci, candidate in enumerate(family["candidates"]):
            base = f"families[{fi}].candidates[{ci}]"
            lca = candidate["lca"]
            fields = [ref(family["family"], library_name, f"families[{fi}].family"), ref(candidate["title"], library_name, base + ".title") + f" (`{candidate['slug']}`; {family['catalyst_domain']})", ref(candidate["screening_basis"], library_name, base + ".screening_basis"), ref(candidate["route"], library_name, base + ".route"), ref(f"{candidate['landed_cost_per_lb']:.4f}", library_name, base + ".landed_cost_per_lb"), ref("Not estimated" if lca["total_gwp"] is None else f"{lca['total_gwp']:.4f}", library_name, base + ".lca.total_gwp"), ref("Not reported" if lca["coverage_pct"] is None else f"{lca['coverage_pct']:.2f}", library_name, base + ".lca.coverage_pct")]
            lines.append("| " + " | ".join(fields) + " |")

    lines += [
        "", "## Table S2. Manufacturing catalog and scale-specific processing costs", "",
        f"The {ref(summary['manufacturing']['20']['template_count'], summary_name, 'manufacturing.20.template_count')} named thermal methods are evaluated using the existing template-cost endpoint. Columns use production sizes {ref(manufacturing['scales']['2']['order_size_tons'], manufacturing_name, 'scales.2.order_size_tons')}, {ref(manufacturing['scales']['20']['order_size_tons'], manufacturing_name, 'scales.20.order_size_tons')} and {ref(manufacturing['scales']['200']['order_size_tons'], manufacturing_name, 'scales.200.order_size_tons')} short tons. The hourly-rate basis year is {ref(manufacturing['scales']['20']['basis_year'], manufacturing_name, 'scales.20.basis_year')}, escalated to the bundled {ref(manufacturing['scales']['20']['target_year'], manufacturing_name, 'scales.20.target_year')} index. These are processing costs only; materials, overhead, selling margin and omitted operations are excluded.",
        "", "Repeated steps remain repeated. Original steps are listed below; scale substitutions and fitted lists are available under each JSON entry's `steps_fitted` and `substitutions`. An `uncosted_operations` note can describe an existing equipment proxy as well as an omitted operation; no new proxy or hourly rate was derived in this run. Legacy source labels lacking a public permalink do not establish independently verified provenance.",
        "", "| Method | Original steps, including repeats | Source label and link status | Small, USD/lb | Medium, USD/lb | Large, USD/lb | Uncosted/proxy operations |", "|---|---|---|---:|---:|---:|---|",
    ]
    for index, template in enumerate(manufacturing["scales"]["20"]["templates"]):
        raw = load(ROOT / "backend/data/process_templates" / f"{template['id']}.json")
        urls = raw.get("reference_urls", [])
        statuses = sorted({audit["checks"]["urls"].get(url, {}).get("status", "not_checked") for url in urls})
        source = raw.get("source", "Source not supplied")
        if source.startswith("CatCost_v"):
            source = "Legacy CatCost-derived template label; public permalink not supplied"
        source += "; " + (", ".join(statuses) if statuses else "no public permalink in entry")
        fields = [f"{cell(template['name'])} (`{template['id']}`)", ref(", ".join(template["steps"]), manufacturing_name, f"scales.20.templates[{index}].steps"), cell(source)]
        for size in ("2", "20", "200"):
            row_index, row = next((i, t) for i, t in enumerate(manufacturing["scales"][size]["templates"]) if t["id"] == template["id"])
            fields.append(ref("Not costed" if row["processing_cost_per_lb"] is None else f"{row['processing_cost_per_lb']:.4f}", manufacturing_name, f"scales.{size}.templates[{row_index}].processing_cost_per_lb"))
        fields.append(ref("; ".join(template["uncosted_operations"]) or "None listed", manufacturing_name, f"scales.20.templates[{index}].uncosted_operations"))
        lines.append("| " + " | ".join(fields) + " |")

    def source_status(needle):
        states = Counter(value["status"] for url, value in audit["checks"]["urls"].items() if needle in url)
        return ", ".join(sorted(states)) if states else "Not in the data-file URL audit; see collection manifest where applicable"

    lca_reference = load(ROOT / "backend/data/lca_factors.json")["primary_reference"]
    doi = lca_reference["doi"]
    doi_status = audit["checks"]["dois"][doi]["status"]
    doi_key = f'checks.dois["{doi}"].status'
    lines += [
        "", "## Table S3. Sources, provenance checks and reuse status", "",
        "A reachable URL proves a response, not scientific relevance or permission to redistribute source content. Crossref verifies an identifier and its metadata; it does not independently validate the COMET values citing that article. Third-party terms not checked in this run remain explicitly unverified. No provider-wide license is inferred from public accessibility, and no original CatCost workbook or underlying commercial LCI database is redistributed.",
        "", "| Source/data class | Role in the analysis | Observed provenance evidence | License/reuse status |", "|---|---|---|---|",
        "| COMET code and generated analysis | Independent calculation and derived results | Repository LICENSE; reproduction manifest and per-input hashes | PolyForm Noncommercial License 1.0.0; not an OSI-approved license. License unchanged. |",
        "| CatCost publications and public User Guide | Step Method methodology and published validation cases | `table62_reproduction_2026-09-06.json`; legacy template source labels remain visible in the catalog audit | Academic citation only in this run; original workbook excluded. No NREL endorsement is claimed. |",
        f"| IMF Primary Commodity Price System | Institutional monthly metal averages | Complete fresh collection retained in `price_history_{DATE}.json`; {cell(source_status('imf.org'))} | Provider reuse terms: not independently verified. |",
        f"| Johnson Matthey | Daily observations averaged by completed month; PGM live quotes | `price_history_{DATE}.json`, `live_basis_{DATE}.json`; {cell(source_status('matthey.com'))} | Provider reuse terms: not independently verified. |",
        f"| UN Comtrade | Declared HS-code support-material unit-value mappings | {cell(source_status('comtrade'))}; no Comtrade observations were available in the paper basis | Terms: not independently verified. A declared mapping is not a fetched support price; fixed catalog prices remain. |",
        f"| USGS Mineral Commodity Summaries | Annual metal and material anchors | {cell(source_status('usgs.gov'))}; quote years/source fields retained | Source-specific reuse restrictions and third-party exceptions: not independently checked; no blanket license claim. |",
        f"| Yahoo Finance, Westmetall, Kitco and Markets Insider | Frozen observed live comparison and source fallbacks | `../audit/t09-live-source-check-{DATE}.json` records provider outputs; `live_basis_{DATE}.json` records selected quotes | Provider-specific terms: not independently verified. |",
        f"| Nuss and Eckelman materials LCA factors | Materials GWP/CED factors and gap reporting | {ref(doi_status, audit_name, doi_key)}; `backend/data/lca_factors.json:primary_reference` | {ref(lca_reference['license'], '../../backend/data/lca_factors.json', 'primary_reference.license')} is the dataset's stated publication license; this does not grant rights to underlying commercial LCI databases. |",
        f"| Public supplier quotations and literature proxies | Fixed materials and engineering/literature screening bases | Record-specific source fields and resolved citation IDs in `{audit_name}`; terms differ by source | Reuse terms and continued price availability: not independently verified. Quotes remain source-labelled proxies. |",
        f"| Complete data-file audit | File/object-level field checks plus URL and DOI response checks | {ref(audit['summary']['files'], audit_name, 'summary.files')} files; {ref(audit['summary']['unique_urls'], audit_name, 'summary.unique_urls')} URLs; {ref(audit['summary']['unique_dois'], audit_name, 'summary.unique_dois')} DOIs | Audit checks do not replace source-specific licensing review. |",
    ]
    price = summary["price_ranges"]["Ni"]
    rows = summary["manufacturing"]["20"]["partly_costed_templates"]
    lines += [
        "", "## Table S4. Error budget and interpretation limits", "",
        "These contributions are not summed into a validated total confidence interval. Price movements can be correlated; manufacturing and LCA omissions are model gaps. Method-reproduction residuals are regression tolerances, not accuracy bounds for a new catalyst.",
        "", "| Contribution | Quantitative evidence or explicit assumption | Effect and limit | Source |", "|---|---|---|---|",
        f"| Metal/support prices | Nickel monthly values range from {ref(format(price['min'], '.4f'), summary_name, 'price_ranges.Ni.min')} to {ref(format(price['max'], '.4f'), summary_name, 'price_ranges.Ni.max')} USD/lb over {ref(price['first'], summary_name, 'price_ranges.Ni.first')}–{ref(price['last'], summary_name, 'price_ranges.Ni.last')}. All per-metal ranges are preserved. | Observed ranges are not fitted confidence limits. Date-aligned replay preserves co-movement; individual break-even sweeps hold other prices fixed. Unavailable support series retain fixed catalog values. | `paper_summary_2026-09-06.json:price_ranges`; `price_volatility_2026-09-06.json` |",
        f"| Inflation indices | Manufacturing prices use {ref(manufacturing['scales']['20']['chemppi_escalation'], manufacturing_name, 'scales.20.chemppi_escalation')} times the published hourly-rate basis. | The latest bundled index can be a partial annual observation; software cannot infer publication finality. File hashes identify the actual values used. | `manufacturing_costs_2026-09-06.json`; `backend/data/chemppi.json`; `backend/data/cepci.json` |",
        f"| Scale substitution/effective throughput | FCC nominal cost {ref(next(r['comet'] for r in load(PAPER / f'table62_reproduction_{DATE}.json')[2]['rows'] if r['key'] == 'estimated_price_per_lb'), f'table62_reproduction_{DATE}.json', '[2].rows[8].comet')} versus effective-rate cost {ref(summary['table62'][2]['comet_usd_per_lb'], summary_name, 'table62[2].comet_usd_per_lb')} USD/lb. | The effective production-rate assumption materially changes processing cost. Scale substitutions retain operation multiplicity; actual equipment performance is not calibrated. | `table62_reproduction_2026-09-06.json`; `manufacturing_costs_2026-09-06.json:scales` |",
        "| Recovery value | Recovery is an optional use-loss/refining-loss and charge scenario; the paper candidate comparisons do not apply a new recovery assumption. | Recovery performance and refining charges are screening assumptions. Iron scrap differs from refined-metal purchase prices. Recovery is excluded from electrode assembly results. | `backend/core/spent_catalyst.py`; `backend/core/constants.py`; `backend/data/spent_catalyst.json` |",
        f"| Materials/process LCA | {ref(summary['lca']['candidates_coverage_below_50_pct'], summary_name, 'lca.candidates_coverage_below_50_pct')} candidates have materials coverage below half; {ref(summary['lca']['route_share_eligible_candidates'], summary_name, 'lca.route_share_eligible_candidates')} enter the route-share analysis. Its median/p90/max are {ref(format(summary['lca']['route_share_median_pct'], '.2f'), summary_name, 'lca.route_share_median_pct')} / {ref(format(summary['lca']['route_share_p90_pct'], '.2f'), summary_name, 'lca.route_share_p90_pct')} / {ref(format(summary['lca']['route_share_max_pct'], '.2f'), summary_name, 'lca.route_share_max_pct')}%. | Carbon, silica and zeolite gaps remain unfilled. Low-coverage GWP cannot support a complete environmental ordering. Oxide-to-element mappings are approximations. | `paper_summary_2026-09-06.json:lca`; `backend/data/lca_factors.json`; `backend/data/process_energy_factors.json` |",
        f"| Uncosted operations | Partial/proxy route entries: {ref('; '.join(r['name'] for r in rows), summary_name, 'manufacturing.20.partly_costed_templates')}. | No new autoclave, reduction furnace, centrifuge, sieving, coating, freeze-drying, CVD or ALD rate was derived. A listed proxy does not close the missing-equipment cost gap. | `manufacturing_costs_2026-09-06.json`; Table S2 |",
        "", "Rebuild these tables with `python scripts/generate_paper_si.py` after running the paper reproduction command. Public URLs and DOI checks are recorded in the separate provenance audit; uncertain terms or source claims remain unverified rather than silently repaired.", "",
    ]
    path = PAPER / f"si_{DATE}.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {path}; candidate rows={sum(len(f['candidates']) for f in library['families'])}, manufacturing rows={len(manufacturing['scales']['20']['templates'])}")


if __name__ == "__main__":
    main()
