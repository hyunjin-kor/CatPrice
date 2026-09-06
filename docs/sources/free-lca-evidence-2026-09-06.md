# Free LCA evidence review — 2026-09-06

This bounded review found **four verifiable, source-specific GWP/CED pairs in two freely accessible papers**. They are useful evidence for explicitly named scenarios. None establishes an unconditional LCA factor for COMET's existing generic carbon, silica or zeolite labels. No backend data or calculation code was changed by this review.

Eight primary sources were investigated; seven article DOIs returned matching Crossref metadata. Six full sources were read, including an official Europe PMC full-text XML copy; two silica papers remained inaccessible in full. Crossref confirms bibliographic identity, not experimental validity. All requests used public, unauthenticated access. No purchase, subscription, billable API, API key, restricted inventory export, or source-paper redistribution occurred.

The companion [machine-readable evidence](free-lca-evidence-2026-09-06.json) contains source metadata, HTTP outcomes, available response hashes, numerical locators, limitations and separate decisions for evidence retention and automatic mapping. HTTP 403/429 means **unverified access**, not a dead source. Two supplementary-file URLs returned HTTP 200 with an HTML challenge instead of the advertised document; those files were not treated as acquired.

## Decisions

**Adopt** below means retain a verified published aggregate in this evidence register, with its original material, method and assumptions. It does not authorize silently replacing a generic material factor. **Pending** means missing evidence prevents that particular use. **Reject** means the proposed interpretation conflicts with the source.

| Source / material | Evidence decision | Automatic mapping decision |
|---|---|---|
| Gu 2018, coal-derived activated carbon | Adopt source-specific comparison | Pending: current activated-carbon records do not identify coal feedstock |
| Gu 2018, woody-biochar activated carbon | Adopt with explicit biogenic-carbon assumption | Reject silent use as a carbon-neutral default; pending an explicitly chosen scenario |
| Lemecho 2026, chemically synthesized zeolite 13X | Adopt source-specific comparison | Pending: 13X and manufacturing route must be identified |
| Lemecho 2026, bentonite-derived zeolite 13X | Adopt source-specific comparison | Pending: 13X and manufacturing route must be identified |
| ICBA 2025, industry-average furnace carbon black | Retain corroborating observation; factor adoption pending | Pending: rights, inconsistent plot unit, fossil-only GWP and missing CED |
| Meisel 2022, carbon black / activated silica | Pending exact supplementary values and reuse basis | Reject reading plotted bars as exact factors or assuming article licensing conveys underlying database rights |
| Grimaldi 2021, zeolite A | Pending absolute supplementary results | Reject mapping zeolite A to generic zeolite, ZSM-5, Beta or USY |
| Ros-Lis 2024, mesoporous silicas | Pending full tables and material-specific scope | Pending; a synthesis-route average is not a universal SiO2 factor |
| Gu 2025, rice-husk nanosilica | Pending full-source verification | Pending; no numerical factor adopted |
| Gu 2024, industrial precipitated nanosilica | Retain verified scope; exact factor pending | Reject treating chart estimates or ADP-fossil as exact GWP / total CED |

## Verified numerical evidence

All four rows use a functional unit of **1 kg of the named material at the production gate**. These are published model results, not independently rerun inventories or validation against COMET catalyst grades.

| Source-specific material | GWP (kg CO2 eq/kg) | Total CED (MJ/kg) | Exact source locator | Impact method / condition |
|---|---:|---:|---|---|
| Coal-derived activated carbon | 18.28 | 241.62 | Gu 2018, Tables 8 and 7, printed p. 239 | TRACI 2.1 GWP; CED renewable plus nonrenewable |
| Woody-biochar activated carbon | 8.60 | 158.33 | Gu 2018, Table 8 p. 239 and Table 6 p. 238 | TRACI 2.1 GWP; assumes biogenic CO2 neutrality |
| Chemical-route zeolite 13X | 24.25 | 253 | Lemecho 2026, Results §3.2, text accompanying Figures 10 and 11 | IPCC 2013 GWP 100a; CED includes renewable and nonrenewable energy |
| Bentonite-clay-route zeolite 13X | 2.48 | 11.15 | Same source and locators | Same methods; source-specific synthesis and energy assumptions |

### Activated carbon: Gu et al. (2018)

[Primary full article](https://wfs.swst.org/index.php/wfs/article/download/2654/2492) · [DOI](https://doi.org/10.22382/wfs-2018-024). *Life Cycle Assessment of Activated Carbon from Woody Biomass*, Wood and Fiber Science 50(3), 229–243. Authors: Hongmei Gu, Richard Bergman, Nathaniel Anderson and Sevda Alanya-Rosenbaum. Tables 7–8 were also visually inspected in the PDF.

The woody route uses forest-residue biochar and steam activation, pilot observations with engineering scale-up, colocated operations, and mass allocation between biochar and syngas. The coal comparison adapts the Bayer/Agri-footprint model and adds a coal-combustion emission profile. Woody electricity uses a northwest-US background; the coal comparison uses an EU background. The products were compared by BET surface area and iodine number for activated-carbon substitution, not qualified as equivalent catalyst supports.

The article explicitly gives biogenic CO2 zero characterization for its woody GWP result. It separately discusses the emitted biogenic carbon; this review does not assume neutrality or calculate a replacement characterization result. Table 8's fossil-fuel-depletion indicator is **MJ surplus**, not the CED reported in Tables 6–7.

The article-specific first-page footnote declares the US-government work public domain and not subject to copyright, despite a generic journal footer. Published aggregate results can be attributed here; that declaration is not treated as permission to export or redistribute Agri-footprint or other underlying inventories.

COMET currently has three exact `Activated carbon` component labels: two supports in `hydrodeoxygenation_benchmark.json` and one active catalyst in `methane_pyrolysis_benchmark.json`. Their price evidence identifies activated carbon, not coal versus woody feedstock. An HS 380210 trade-price match does not supply that missing production-route information. Generic `Carbon` is a broader category still.

### Zeolite 13X: Lemecho et al. (2026)

[Official full-text XML](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC12826357/fullTextXML) · [DOI](https://doi.org/10.1039/D5SE01375E). *A sustainable multi-zeolite synthetic framework from a single natural clay: CO2/H2O adsorption performance and life cycle assessment benefits*, Sustainable Energy & Fuels 10(4), 1038–1058. The XML states **CC BY 3.0** with attribution.

Although experiments cover several zeolites, the reported LCA is for **13X**. It includes precursor production and transport, synthesis, washing and drying; use, end of life and equipment maintenance are excluded. The paper assumes natural-gas heat and average Swiss electricity, with database proxies for precursors. It names several background databases/versions, including ecoinvent; their raw inventories were not obtained or republished. The verified numbers are the authors' aggregate comparison, not a reconstruction of those inventories. Generic zeolite and the framework names ZSM-5, Beta and USY do not establish equivalence to either modeled 13X route.

### Carbon black: ICBA (2025)

[Official executive summary](https://static1.squarespace.com/static/5fd161c5b1bc2872873bd5ee/t/682f4138aca5ce037ba8db7f/1747927352960/ICBA%2BIndustry%2BAverage%2BLCA%2Breport_Executive%2BSummary.pdf). This industry study concerns fossil-feedstock **furnace** carbon black and uses 2023 member data; it does not establish acetylene-black or every electrode-carbon grade. It states that critical review was underway.

The prose reports **3.91 metric tonnes CO2 eq per metric tonne carbon black**, after coproduct credits, for IPCC 2021 **GWP100–Fossil** under system expansion. The plot instead labels its axis kg CO2 eq per tonne, an unresolved unit inconsistency. The prose ratio would be numerically equal in kg/kg, but this review records the original wording and does not adopt a generic coefficient. No total CED or explicit reuse license was established in the summary. Public availability alone does not settle software redistribution conditions.

### Carbon black / silica: Meisel et al. (2022)

[Primary full article](https://mdpi-res.com/d_attachment/sustainability/sustainability-14-05393/article_deploy/sustainability-14-05393.pdf) · [DOI](https://doi.org/10.3390/su14095393). *A Comparison of Functional Fillers—Greenhouse Gas Emissions and Air Pollutants from Lignin-Based Filler, Carbon Black and Silica*, Sustainability 14(9), 5393, **CC BY 4.0**.

This cradle-to-gate comparison uses one kilogram of filler and an IPCC 2013 method. The carbon-black and activated-silica references are taken directly from ecoinvent 3.6; no independent reference-production balance is provided. Exact supplementary Table S1 values were not acquired (HTTP 403), and Figure 3 bars were not digitized. Article reuse conditions were not assumed to transfer rights to unmodified third-party database factors. CED was not established.

### Zeolite A: Grimaldi et al. (2021)

[University-hosted full article](https://discovery.ucl.ac.uk/id/eprint/10133450/1/jiec.13180.pdf) · [DOI](https://doi.org/10.1111/jiec.13180). *Intensified production of zeolite A: Life cycle assessment of a continuous flow pilot plant and comparison with a conventional batch plant*, Journal of Industrial Ecology 25(6), 1617–1630, **CC BY 4.0**.

The functional unit is **1 kton zeolite A**, not 1 kg. The study compares batch and scaled-out continuous-flow systems with different mother-liquor recycling assumptions using ILCD/PEF recommendation 1.09, excluding biogenic carbon from its climate-change indicator. GaBi and ecoinvent backgrounds are used. Main-text normalized comparisons are insufficient to establish an absolute per-kg factor. Both advertised supplementary files returned HTML challenge pages, so absolute results remain unverified. Resource-depletion energy units are not evidence of total CED.

### Silica leads and remaining blockers

| Article | Full-source / rights evidence | What prevents numerical adoption |
|---|---|---|
| [Ros-Lis, Vetter & Smith 2024](https://doi.org/10.1039/D4GC02347A), Green Chemistry 26(19), 10107–10114 | Matching Crossref metadata; [author-university record](https://abdn.elsevierpure.com/en/publications/a-comparative-life-cycle-assessment-of-the-synthesis-of-mesoporou/) and Crossref identify CC BY-NC 3.0; full PDF requests blocked | Mesoporous synthesis routes and scale must be distinguished; full methods and exact per-material tables were not verified. No abstract-derived factor adopted. |
| [Gu et al. 2025](https://doi.org/10.3390/pr13020483), Processes 13(2), 483 | Matching Crossref metadata identifies CC BY 4.0; full PDF HTTP 403 | Rice-husk nanosilica; no exact full-source GWP/CED pair verified. |
| [Gu et al. 2024](https://mdpi-res.com/d_attachment/energies/energies-17-05621/article_deploy/energies-17-05621.pdf), Energies 17(22), 5621; [DOI](https://doi.org/10.3390/en17225621) | Full PDF and Crossref HTTP 200; first page states CC BY 4.0 | CML 2001, cradle-to-gate 1 kg high-dispersion precipitated nanosilica from water glass; Chinese plant-report foreground with ecoinvent 3.8 backgrounds. Figure 5 GWP bars lack exact scalar labels; visual inspection does not make them exact values. ADP-fossil is not total CED. |

## Integration limits and next useful evidence

1. A future scenario library can retain the four named pairs with per-factor impact method, region, route, boundary, allocation, biogenic-carbon treatment, exact source locator and license attribution. It must not present TRACI, IPCC and fossil-only results as interchangeable without qualification.
2. Connecting existing candidates requires material-grade / feedstock evidence from the candidate's own paper, SI or supplier specification. Confirm coal-derived activated carbon and exact 13X routes first. Do not improve reported LCA coverage merely by broadening aliases such as `Carbon`, `SiO2` or `Zeolite`.
3. For silica and carbon black, seek an openly licensed exact results table with compatible functional unit and declared method. Missing CED must remain missing; ADP-fossil, MJ surplus, process heat and electricity are not interchangeable with total CED. No chart interpolation or assumed carbon neutrality was used.
4. These papers support transparent screening scenarios. Source identification and an open article license do not independently validate upstream inventory quality, geographical representativeness, catalyst-grade suitability, or rights to redistribute a source database. The review retained only published aggregate observations and citation metadata.

The search stopped after these strong primary leads and documented blockers. It is complete as a bounded free-source review, not a claim that no other free LCA source exists.
