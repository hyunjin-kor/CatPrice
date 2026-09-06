# Reviewer preparation — 2026-09-06

This checklist separates checks already supported by this run from final author decisions. Answers below describe the implemented model and its limits; they do not claim journal acceptance, a released v1.4.0 archive, or experimental validation of every benchmark candidate.

## Submission checklist

- [x] Main method and LCA citations have exact Crossref matches; the Baddour Step Method reference is OPR&D, not JACS. See [reference audit](../audit/paper-references-2026-09-06.md).
- [x] Published Table 6.2 inputs reproduce Pt/C to the cent; the two remaining residuals and the FCC effective-throughput condition are explicit. See [Table 6.2 output](table62_reproduction_2026-09-06.json).
- [x] Live source changes are frozen with observed provider results, separate from synthetic ranking tests. See [source audit](../audit/t09-t10-notes.md).
- [x] Ambiguous supports remain unlinked, unsupported LCA contributions remain data gaps, and unmapped manufacturing operations retain their stated limitations.
- [ ] Check every final manuscript number against its adjacent artifact/key annotation after the final pipeline run; exclude synthetic regression figures from scientific results.
- [ ] Confirm the final manifest identifies the selected live/reference snapshots and their hashes, and records the latest common published month and execution environment.
- [ ] Confirm article word-equivalents, figure/table accounting, abstract, keywords, author affiliations and corresponding-author details against the [official ACS guidance](https://researcher-resources.acs.org/publish/author_guidelines?coden=ascecg).
- [ ] Publish the human-approved tag and release, then verify the version-specific Zenodo archive before changing availability language from “planned v1.4.0” to “released v1.4.0”.

## Ten likely reviewer questions

### 1. What does COMET add to CatCost, and how narrowly is that contribution claimed?

COMET independently implements the published costing structure and supplies an executable workflow joining explicit price-source selection, frozen reference-month inputs, named manufacturing routes, benchmark scoring, and auditable outputs. The contribution should be assessed from these implemented behaviors and the supplied reproductions. It is not evidence that COMET originated catalyst costing or coupled economic/environmental analysis. CatCost and verified process-analysis prior art are cited, and no NREL affiliation or endorsement is claimed. See [methodology](../methodology.md) and [verified references](../audit/paper-references-2026-09-06.md).

### 2. Why do the Ni/alumina and FCC validation cases differ from the published prices?

Inputs were not adjusted to fit the final prices. Pt/C reproduces the published price at cent precision. The Ni/alumina residual follows the implementation's published margin correlation versus the different margin treatment stated in the table footnote. The FCC comparison must use the footnote's effective throughput; the nominal-throughput case is deliberately shown as a different calculation. The reproduction script prints intermediate calculations so readers can locate each divergence. The exact residuals and conditions are in [the reproduction JSON](table62_reproduction_2026-09-06.json) and [T09–T10 regression notes](../audit/t09-t10-notes.md).

### 3. How can a live-price tool produce reproducible paper results?

The paper reads committed price maps and observation snapshots rather than silently substituting the latest network response. The [reproduction manifest](reproduction_manifest_2026-09-06.json) records inputs, hashes and environment. The workflow distinguishes the institutional reference basis from the observed live-source basis; these are different economic assumptions. Runtime and collection timestamps are descriptive metadata and should not be mistaken for invariant scientific outputs. Reproduction uses `scripts/reproduce_paper.py` with the documented reference month and seed. A seed alone cannot reproduce a changed input snapshot.

### 4. Does an old reference-month date mean stale data, and are every metal's sources monthly?

A published monthly average is current when it represents the latest available complete common month for the included institutional series. It should not be judged by a daily-quote age rule. Metals without those series retain their explicit anchors, which are not relabeled as monthly observations. The manifest and reference-basis file disclose the month and which entries come from series versus anchors. The [reference-basis artifact](reference_basis_2026-09-06.json) supports this distinction; the [live-source audit](../audit/t09-t10-notes.md) documents the separate daily source order.

### 5. Are UN Comtrade support prices catalyst-grade purchasing prices?

No. They are customs value divided by net weight for a trade category and combine grades and partners. A matching pure support may use that series on the reference basis, with the limitation visible in its evidence note. Missing series retain the fixed library value; ambiguous, blended, doped or specialty materials remain unlinked. No missing observations are synthesized when a Comtrade key or suitable series is unavailable. [The support audit](../audit/t09-t10-notes.md) lists all linked names and exclusion reasons. Its deliberately synthetic ranking stress is a software regression fixture, not market evidence.

### 6. Is the recommended candidate experimentally demonstrated to be the best catalyst?

The rank is conditional on the price basis, the supplied recipe and preparation proxy, and the selected economics/evidence/route/performance weights. It is a screening decision aid within a reaction family. It does not establish that literature activity measurements collected under different conditions are directly comparable, nor that a score is a kinetic or reactor-performance prediction. Named profiles and the weight-sensitivity sweep expose that dependence. See [all-family results](all_families_2026-09-06.json) and [results narrative](results_2026-09-06.md); cross-family scalar cost comparisons should not be interpreted as equivalent catalytic service.

### 7. Are the environmental results a complete cradle-to-gate LCA for every formulation?

They are a bounded screening calculation with separately reported material and process contributions. Metal-factor mappings and process-energy assumptions are explicit. Unsupported material fractions are reported as coverage gaps; an omitted contribution is not proof of zero impact. Carbon, silica and zeolite factors were not invented to fill those gaps. The boundary also excludes specified upstream supplies, wastes and equipment impacts, while area-based electrode processes are not silently assigned per-mass thermal factors. See [methodology](../methodology.md), `backend/data/lca_factors.json`, and `backend/data/process_energy_factors.json`.

### 8. How are specialized synthesis operations and spent-catalyst recovery treated?

Routes retain flags and notes when an operation lacks a supported hourly cost or uses a documented proxy. Such estimates are partial process estimates, not supplier quotations for a complete synthesis line. Recovery is an optional thermocatalyst screening adjustment based on stated metal-loss and refining assumptions. It is not a model of catalyst deactivation, regeneration cycles, collection logistics, or a guaranteed disposal contract. Report gross manufacturing cost and any recovery adjustment separately when interpreting a comparison. See [manufacturing-cost evidence](manufacturing_costs_2026-09-06.json) and the recovery section of [methodology](../methodology.md).

### 9. What does the Monte Carlo range mean, and what does setting a seed prove?

The calculator samples the specified relative input ranges and reports the resulting modeled cost distribution. The request-level implementation uses uniform factors for active components, promoters, supports, electrode adjuncts and production scale; components in the same category share that category's factor. These are assumed scenarios, not empirically estimated joint market distributions. The reported percentiles therefore are not experimental confidence intervals or bounds on structural model error. A supplied seed makes the computational draws repeatable for the same inputs and environment; it does not validate the assumptions. See `backend/core/uncertainty.py` and the deterministic request tests.

### 10. Can readers legally obtain and verify the exact implementation cited in the paper?

The repository uses PolyForm Noncommercial 1.0.0; it should not be described as OSI-approved open-source software. COMET cites CatCost academically and does not redistribute the proprietary original workbook. The [concept DOI](https://doi.org/10.5281/zenodo.21451931) was verified through DataCite and Zenodo, while Crossref's absence reflects a different registration agency. That existing concept DOI does not prove that the planned v1.4.0 version has been archived. Final availability text should identify the approved source revision, eventual release tag, snapshot hashes and reproduction command, with version-specific archive verification left to the release step. See [external checks](../sources/t06-external-checks-2026-09-06.json).
