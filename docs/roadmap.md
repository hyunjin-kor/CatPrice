# Roadmap

Last updated: 2026-09-01 (v1.3.24)

COMET does local catalyst cost screening on Windows, checked against the published CatCost reference cases. The phases below are ordered by leverage rather than effort.

## Data acquisition policy — user decision, 2026-09-06

The data acquisition budget is zero. Do not purchase datasets or individual papers, subscribe to paid data services, or make billable API calls. Prioritize freely accessible papers and supplementary information, author manuscripts, institutional repositories, public agency reports and statistics, and public supplier information. A free API tier may be used only within its zero-cost allowance, without paid upgrades or automatic charges.

For each adopted value, retain the original source location (page/table where applicable), units, material grade, reference year, relevant process/system boundary, and reuse conditions. Free access does not establish redistribution permission. When a suitable free source cannot be verified, keep the data gap explicit and document the search; do not invent a replacement value. This policy governs subsequent data supplementation and does not itself change existing calculation inputs or the COMET license.

## Phase 1 — Credibility (make it citable)

- **Zenodo DOI** — done (2026-07-20): every release from v1.3.10 on is archived automatically; concept DOI `10.5281/zenodo.21451931`.
- **`CITATION.cff`** — done: GitHub shows a "Cite this repository" button.
- **Hosted documentation**: publish `docs/` with MkDocs Material on GitHub Pages. The methodology page especially, since it is the best argument for trusting the numbers.
- **Tighten the FCC validation band** — superseded (2026-09-02): the ±20% band checked a hand-set materials cost against the published price, which is a consistency check, not validation. The three cases are now reproduced line by line from the published Table 6.2 inputs (materials totals, step lists with multiplicities, order sizes); Pt/C matches to the cent and the two residuals trace to footnotes in the table. See the “Validation strategy” section of `AGENTS.md` and `scripts/reproduce_catcost_table62.py`.

## Phase 2 — Distribution (make it easy to keep)

- **Auto-update** — done (2026-07-21): `electron-updater` checks GitHub Releases on startup, downloads in the background, and offers a restart prompt; releases ship `latest.yml` + blockmap alongside the installer from v1.3.13 on.
- **Windows SmartScreen**: README documents the unsigned-binary warning as of v1.3.13; code signing is still open, and worth revisiting when the user base justifies the certificate cost.
- **Winget manifest**: `winget install COMET` is a cheap distribution channel once releases are stable.
- **Rename the installer `appId`**: `package.json` still carries `com.catprice.app` from before the rename. Changing it makes Windows treat the app as a new install, so `electron-updater` would stop upgrading existing users. Deferred to the next major release (v2.0), where a reinstall notice in the release notes is acceptable.

## Phase 3 — Capability (answer more questions)

These were previously listed as "planned" in the README and are consolidated here.

- **LCA factors for carbons, silica and zeolites**: Nuss & Eckelman (2014) covers metals only, so activated carbon, carbon black, N-doped carbon, SiO₂, ZSM-5/SAPO-34/SSZ-13, MOFs and g-C₃N₄ are still reported as data gaps. Across the 116 benchmark candidates carbon forms alone account for ~1,300 cumulative wt% of unmatched mass, and seven families sit below 40% materials coverage because of it. Needs a second, citable LCI source per material. Do not fill from memory.
- **Paper dataset**: `scripts/run_all_families.py --out <json>` evaluates all 30 families × 116 candidates offline, freezes the price basis it used, adds a performance-weight-zero ranking and a 286-point weight-simplex rank-stability sweep. `scripts/active_metal_breakeven.py` then finds, per family, the metal price at which the cost-only and composite winners flip (`backend/core/breakeven.py`) and counts the months of frozen history on each side. Rerun both whenever prices, factors or benchmarks change so the reported numbers stay reproducible. Both, and `price_volatility_screen.py`, accept `--price-basis <json>` to re-cost from a committed basis instead of the local price table. That basis is the reference tier described in `docs/methodology.md`: `fetch_price_history.py` freezes IMF PCPS and Johnson Matthey monthly averages, `build_reference_basis.py` turns the latest common month into the price map.
- **Cobalt, molybdenum and tungsten price history**: the break-even sweep shows the nearest cost flips are Ni-vs-Co contests (ammonia cracking at Co −8%, dry reforming at Co −17%). Cobalt and molybdenum are covered since 2026-09-03 by the IMF Primary Commodity Price System (`PCOBA` and `PLMMODY`, monthly averages, quoted per tonne; the cobalt codelist entry says "per pound" but the values are per tonne). In the reference tier both take the IMF value directly, so the paper no longer depends on the app's anchors for them. The app's molybdenum anchor was corrected the same day from $34.71/lb to $23.13/lb: USGS's "$51/kg" for molybdic oxide is already per kilogram of contained Mo (Platts convention, and IMF's 2025 average is $51.9/kg), so dividing by the oxide's Mo fraction had inflated it 1.5x. The curated library row `lit:usgs-molybdic-oxide-2025` still records $51/kg against the formula MoO3 and needs the same reading checked. Tungsten still has no free observed series (IMF PCPS, Westmetall/LME, Yahoo Finance and FRED checked on 2026-09-03); candidates are the USGS Mineral Industry Surveys (monthly PDF) or UN Comtrade unit values (API key required).
- **Lifecycle economics**: deactivation kinetics and regeneration-cycle costing, so the estimate covers catalyst lifetime rather than just the first fill. This is the most requested thing the current model cannot answer.
- **Synthesis complexity penalty**: an SCScore-style term that penalizes hard-to-make compositions, catching cases where cheap ingredients hide an expensive route.
- **Chemistry validation layer**: an RDKit/ChemPy check on composition inputs (stoichiometry sanity, precursor plausibility) before money math runs on them.
- **Structure-editor entry**: let users start from a drawn or imported structure instead of composition rows.
- **CatCost JSON import polish**: the import endpoint exists; the workflow around it (mapping report, partial-import handling) needs UX attention so CatCost users can migrate a workbook in one sitting.

## Phase 4 — Reach

- **2026 index data**: extend ChemPPI/CEPCI series when the annual values publish; the BLS updater already automates ChemPPI.
- **Korean documentation**: a Korean getting-started page, given where much of the current user base sits.
- **Community templates**: accept benchmark-family and process-template contributions with a documented review bar (source links required, no proprietary data).

## Standing rule

Every release bumps `package.json`, `frontend/package.json`, `pyproject.toml`, and `backend/main.py:APP_VERSION` together. `backend/tests/test_version_sync.py` fails the suite if they disagree. Docs quote `releases/latest` instead of hardcoded versions wherever possible.
