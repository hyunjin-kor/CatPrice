# Validation and submission UI check — 2026-09-07

Six functional browser cases passed; one existing headline-wrapping issue is recorded. This report preserves the earlier audit and uses a new screenshot prefix.

## Execution evidence

- Command: `node _local/validation_submission_ui_check.cjs` → exit 0 in 9.04 s.
- Chrome 152.0.7977.76, headless Playwright, viewport 1440 × 1100; existing frontend build 1.4.0 served at `http://127.0.0.1:8877`.
- Fresh isolated SQLite database; optional API keys empty; `backend.main.collect_prices` replaced by an async no-op before startup. No external collectors were contacted.
- Six cases: four thermal paths, one corrected benchmark, one area-based electrode path. Ten screenshots; zero page errors, console errors, failed API responses or external browser requests.
- Support snapshot SHA-256: `b6ac7e3f3309d73c8cfe6c0a61547c576e68d522d5f25e94312a6d992a01fa29`.
- Frontend index SHA-256: `1b81cce68df79f88db0a80c59041dec8e2d3dc2c8ad2db84db587cffd7ebc8dc`.

## Thermal paths

| Support | Basis | Applied source price (USD/kg) | Quote year | Estimated catalyst price (USD/kg) | LCA mass coverage |
|---|---|---:|---:|---:|---:|
| tio2 | reference | 3.3905 | 2026 | 13.4407 | 100% |
| tio2 | live | 3.2 | 2025 | 13.3567 | 100% |
| activated-carbon | reference | 3.7154 | 2026 | 13.7965 | 20% |
| activated-carbon | live | 2.7 | 2024 | 12.8271 | 20% |

The wizard selected Ni at 20 wt%, the listed support at 80 wt%, incipient-wetness impregnation and the existing 20-ton production setting. Every calculation POST returned HTTP 200. The reference source cards displayed the June 2026 observation and matching HS-code/month source URL, plus the original library fallback. Live selections used the original library price, year and link without a reference override. English and Korean source views were checked.

**Month distinction:** these UI selections use each material’s latest observation (June 2026). The paper pipeline’s common complete month is May 2026; this test does not claim an identical UI/paper input snapshot. Carbon’s unsupported LCA factors remain missing and the 20% mass coverage is visible.

## Corrected benchmark note

`/benchmarks/ammonia-cracking` was opened in reference basis. The `ni-alumina-baseline` card was selected through the UI; the HTTP 200 decision API response and displayed detail contained all three current registry notes exactly. Korean labels changed while English data notes stayed unchanged, following the translation policy. The notes explicitly distinguish the engineering 12/88 formulation from verified recipes, reject Ni/Pt and carbon-supported alloy papers as validation of this alumina baseline, and label performance/readiness/route scores as authored assessments.

## Electrode separation

The default PEM fuel-cell CCM case was run through the actual wizard in reference basis. The request carried `catalyst_domain=electrocatalyst`, `application_family=fuel_cell`, `template_id=pem_fuel_cell_ccm`, and 25 cm² active area. The API returned 3.931749 USD total and 0.15727 USD/cm²; the five component costs sum to the total within 10⁻⁶ USD. Manufacturing cost is zero for the selected materials-only scenario.

The result displays the electrode cost and component ledger per cm². Thermal selling-price, production-time, margin and recovery-scenario tiles were absent from the result summary. The separately labelled mass-view value retains its supplier-pack basis; this is not a bulk manufacturing validation. The visible model-scope warning excludes unpriced line throughput/stack assembly, and the displayed LCA mass coverage is 0%.

**UI01 — existing presentation limitation:** the top overview card wraps `$0.1573` onto two lines at 1440 pixels. After fonts finished loading, the DOM recorded a 66.24 px font, 211.46875 px price box and two text lines. The larger summary card and API amount remain correct. `FitPriceText` uses viewport/text-length sizing with `overflow-wrap:anywhere`; no application code was changed in this data/manuscript task.

## External comparator review

The current ten-case registry does not justify a manufacturing error statistic. The signed EXW price schedule is not a settled invoice; supplier offers and catalog pack amounts are not paid purchases; precursor/support quotations have a partial material boundary; model assumptions, projections and a blank tender are excluded.

The three selected 1 g offers normalize to 129000, 140000 and 145000 USD/kg by unit arithmetic only. These values do not claim a quotation for purchasing 1 kg, matched production grade/scale, a COMET residual or extra measured precision. No target fitting or currency/inflation conversion was applied.

The comparator is a closed exclusion audit: `observed_manufacturing_cost_count`, `matched_full_cost_case_count` and `paid_data_acquisitions` are fixed at zero, and a fully matched input is rejected. This is correct for the frozen registry, whose cases all have documented exclusions. A future matched case requires new comparison code and independently sourced inputs; the script must not be treated as a general empirical validator. No existing scientific script or registry was changed during this review.

## Screenshots

- [validation-submission-tio2-reference-en-2026-09-07.png](screens/validation-submission-tio2-reference-en-2026-09-07.png)
- [validation-submission-tio2-reference-ko-2026-09-07.png](screens/validation-submission-tio2-reference-ko-2026-09-07.png)
- [validation-submission-tio2-live-ko-2026-09-07.png](screens/validation-submission-tio2-live-ko-2026-09-07.png)
- [validation-submission-activated-carbon-reference-en-2026-09-07.png](screens/validation-submission-activated-carbon-reference-en-2026-09-07.png)
- [validation-submission-activated-carbon-reference-ko-2026-09-07.png](screens/validation-submission-activated-carbon-reference-ko-2026-09-07.png)
- [validation-submission-activated-carbon-live-ko-2026-09-07.png](screens/validation-submission-activated-carbon-live-ko-2026-09-07.png)
- [validation-submission-ammonia-notes-reference-en-2026-09-07.png](screens/validation-submission-ammonia-notes-reference-en-2026-09-07.png)
- [validation-submission-ammonia-notes-reference-ko-2026-09-07.png](screens/validation-submission-ammonia-notes-reference-ko-2026-09-07.png)
- [validation-submission-electrode-reference-en-2026-09-07.png](screens/validation-submission-electrode-reference-en-2026-09-07.png)
- [validation-submission-electrode-reference-ko-2026-09-07.png](screens/validation-submission-electrode-reference-ko-2026-09-07.png)

Full requests, responses, observed text, layout measurements and file hashes: [validation-submission-ui-2026-09-07.json](validation-submission-ui-2026-09-07.json).

Earlier reports and screenshots were preserved. The source/UI findings above are bounded observations; they do not certify flawless layout, external live collection, empirical industrial accuracy or full LCA coverage.

Cleanup: owned UI server PID 28196 was stopped after its command line was verified; Playwright closed Chrome in `finally`. The temporary database was retained, and no unrelated process was stopped.
