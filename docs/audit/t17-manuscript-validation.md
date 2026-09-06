# T17 manuscript and SI validation — 2026-09-06

The revised manuscript and supporting tables agree with the final frozen analysis outputs. The review corrected explanations and source annotations; no calculation, source data or pipeline logic was changed by this review. Machine-readable results are in [t17-manuscript-validation-evidence.json](t17-manuscript-validation-evidence.json).

| Check | Observed result |
|---|---|
| Manuscript JSON source annotations | 42 comments, 69 resolved keys, no unresolved paths |
| SI JSON source annotations | 980 comments, 980 resolved keys, no unresolved paths |
| Directly adjacent numerical literals | 466 checked against the referenced scalar with displayed-precision rounding tolerance; no mismatches |
| Main-text quantitative claims | Library counts, LCA statistics, weight sensitivity, historical winner changes, live/reference changes, break-even summaries and manufacturing ranges match the final JSON; independent aggregation checks passed |
| Relative Markdown figure links | All six resolve; no missing relative links in either artifact |
| Figures | Six PNG/SVG pairs exist; all six PNGs visually inspected; axis units, legend distinctions and cited source files checked |
| Frozen input hashes | All 80 data-file hashes and 34 code-file hashes match the final reproduction manifest |
| Raw history hash | `84888f60f59d4a21a47945f1f98576c1824bc20babbde678c7419cf3806d4c69`; matches the file, manuscript and manifest |
| Primary references | All four exact DOIs return Crossref HTTP 200; titles, authors, journals, volume/issue and pages/article number match after Unicode, HTML-entity and whitespace normalization |
| Abstract and keywords | 165 whitespace-delimited words; six keywords |

The numerical-literal check parses each `file.json:key` annotation, traverses dotted object keys and bracketed array or quoted-object keys, and compares an immediately preceding numeric scalar to the resolved value. Compound sentence annotations were resolved individually and their reported aggregates were checked against the underlying output collections. This is an artifact validation, not an independent validation of every upstream scientific measurement.

## Surgical corrections

- Replaced the statement that all non-price scores stay fixed during historical replay. Composition, route, performance/readiness judgements and source-specific confidence constants stay fixed; economics and cost-weighted evidence scores are recalculated. This agrees with `price_volatility_screen.py` and `_weighted_evidence_score` in `decision_engine.py`.
- Stated the eligibility condition for the 54-candidate route-GWP subset: at least half of materials mass covered, at least one modeled process contribution, and positive modeled total GWP. The mean/median coverage paragraph now states the same half-mass cutoff explicitly.
- Specified short tons for manufacturing order sizes and FCC effective throughput. The engine uses 2,000 lb per short ton. The pipeline owner also updated Figure 2 to `67 short tons/day (footnote b)` and regenerated the figures and manifest; scientific results did not change.
- Specified the implemented tie-break as lower mass-based catalyst cost in USD/lb, then candidate slug, after equal composite scores. Electrode economics can still use area cost; this wording reports the actual common tie-break.
- Clarified that SI lists original steps, while the accompanying manufacturing JSON retains fitted steps and substitutions for each production scale.
- Replaced broad manufacturing-order, screening-category and profile-change annotations with the relevant scalar keys.
- Corrected the SI DOI-key path to `checks.dois["10.1371/journal.pone.0101298"].status` and the root-array path to `[2].rows[8].comet`. The root agent synchronized the SI generator.
- Added numbered reference superscripts in first-citation order and included development in the SARD description.

## Scientific cross-checks

The independent counts recover 116 candidates in 30 families, with 83 literature-architecture proxies and 29 engineering proxies. The other four screening categories remain separate. Route-share eligibility and coverage were recomputed from every candidate's `lca` object; reported median, inclusive upper-decile and maximum values agree with the summary.

The monthly replay has 91 common dates. Counting distinct winners directly from each family's `per_state` records reproduces seven balanced-profile changes and six performance-free changes. The six named families match the manuscript. Comparing reference and live rankings directly reproduces 5/4/11/5 changed winners for balanced, cost-first, evidence-first and performance-free profiles. The manuscript distinguishes source-confidence effects from nominal price changes.

All 120 break-even contests, the 28 precious-versus-base sweeps, 13 cost crossings, median crossing multiplier, three crossings within the stated near-reference interval and 15 sweeps without a crossing match the contest records. A finite scan is not interpreted as dominance at every possible price. The six figure contracts identify their input JSON and fields; Figure 3 contains 88 thermal candidates with positive modeled GWP and distinguishes the 51 higher-coverage and 37 lower-coverage points.

The reference basis is July 2026 with 14 institutional metal series and Fe/Re/V/W anchors. No Comtrade support quote occurs in this frozen reference map. The manuscript therefore correctly states that the newly linked support series do not reprice the current paper run. LCA gaps, uncosted operations, approximate oxide mappings and electrode inventory limits remain explicit.

| Published validation case | COMET USD/lb | Published USD/lb | Reported residual |
|---|---:|---:|---:|
| Pt/C | 27.3695 | 27.37 | −0.00183% |
| Ni/Al2O3 | 19.2206 | 20.59 | −6.65% |
| FCC at the published effective throughput | 2.4380 | 2.41 | +1.16% |

The nominal FCC diagnostic remains 1.6090 USD/lb in the full reproduction ledger and SI error-budget discussion; it is not used as the accepted effective-throughput validation value. No new numerical acceptance claim was introduced.

## References and journal guidance

The [primary-reference audit](paper-references-2026-09-06.md) records actual Crossref and publisher responses. Crossref confirms **Frederick G. Baddour**, which matches `CITATION.cff`; the manuscript uses F. G. and the README now identifies *Organic Process Research & Development*. The Van Allsburg title is *Early-stage evaluation of catalyst manufacturing cost and environmental impact using CatCost*. The Nuss–Eckelman and BioSTEAM titles, author order and bibliographic coordinates also match the exact DOI records. ACS publisher pages returned HTTP 403 in this environment; full-text accessibility is unverified, while Crossref bibliographic identity is verified. Nature and PLOS publisher requests returned HTTP 200.

The [ACS Sustainable Chemistry & Engineering author guidelines](https://researcher-resources.acs.org/publish/author_guidelines?coden=ascecg) responded HTTP 200 during this run and identified an August 27, 2026 update. Articles have a 7,000-word-equivalent limit, a 150–200-word abstract and 5–8 keywords. Small graphics/tables count as approximately 300 words and larger items as 600 or more. Title-page matter, references, captions, the TOC graphic and SI are excluded from the main limit. A fixed maximum number of figures was not found in the accessed instructions. Exact retrieval evidence is retained in [the external-check JSON](../sources/t06-external-checks-2026-09-06.json) and [T06 notes](t06-notes.md).

After removing source comments, citation superscripts, references, figure captions and table rows, the main-text estimate is **2,424 words**. It conservatively retains the author placeholder, headings, keywords and reproduction command. Counting all six figures at 600 words and the two compact three-row tables at 300 words gives **6,624 word equivalents**. The abstract and keyword counts pass the stated limits. Final typesetting still matters: treating all eight visual items as large would give 7,224, and a graphic larger than the 600-word allowance can require further shortening or resizing. No unconditional typeset-length approval is claimed.

The working Markdown keeps section numbers to preserve the requested review structure and marks their removal for the ACS submission copy. Author order, affiliations, corresponding-author details and funding remain explicit author inputs. The prepared version is 1.4.0; the manuscript describes `v1.4.0` as planned. The existing concept DOI is distinguished from an uncreated release deposit and was verified through DataCite/Zenodo, rather than incorrectly treating its Crossref 404 as an invalid DOI.

## Remaining author actions

Confirm authorship and funding, prepare the journal submission layout and TOC graphic, check the final word-equivalent allowance, remove visible section numbering from that copy, and confirm release/Zenodo version relationships after the human-controlled release. Existing third-party access and reuse uncertainties remain in the source audit. This review did not claim that public availability establishes redistribution permission, complete LCA coverage, measured catalytic performance or NREL endorsement.
