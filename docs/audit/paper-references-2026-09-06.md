# Main manuscript reference audit — 2026-09-06

Evidence: [Crossref queries, exact DOI records, and HTTP responses](paper-references-2026-09-06.json). Each reference was first searched by title/author through Crossref, then checked using `/works/{doi}`. All four selected identifiers returned HTTP 200 with an exact DOI match and the title/authors below. The first Van Allsburg title query returned HTTP 429; a later title/author query returned 200 and identified the correct article. Both attempts are recorded.

## Verified citations

1. **Baddour, F. G.; Snowden-Swan, L.; Super, J. D.; Van Allsburg, K. M.** Estimating Precommercial Heterogeneous Catalyst Price: A Simple Step-Based Method. *Organic Process Research & Development* **2018**, *22* (12), 1599–1605. [DOI: 10.1021/acs.oprd.8b00245](https://doi.org/10.1021/acs.oprd.8b00245).
2. **Van Allsburg, K. M.; Tan, E. C. D.; Super, J. D.; Schaidle, J. A.; Baddour, F. G.** Early-stage evaluation of catalyst manufacturing cost and environmental impact using CatCost. *Nature Catalysis* **2022**, *5* (4), 342–353. [DOI: 10.1038/s41929-022-00759-6](https://doi.org/10.1038/s41929-022-00759-6).
3. **Nuss, P.; Eckelman, M. J.** Life Cycle Assessment of Metals: A Scientific Synthesis. *PLoS ONE* **2014**, *9* (7), e101298. [DOI: 10.1371/journal.pone.0101298](https://doi.org/10.1371/journal.pone.0101298).
4. **Cortes-Peña, Y.; Kumar, D.; Singh, V.; Guest, J. S.** BioSTEAM: A Fast and Flexible Platform for the Design, Simulation, and Techno-Economic Analysis of Biorefineries under Uncertainty. *ACS Sustainable Chemistry & Engineering* **2020**, *8* (8), 3302–3310. [DOI: 10.1021/acssuschemeng.9b07040](https://doi.org/10.1021/acssuschemeng.9b07040).

Full given names, Crossref publication-date fields, query candidates, journal names, volume, issue and pages are retained in the JSON. HTML entities and title whitespace are normalized only in this human-readable citation list; the raw registry values remain available. No page range was inferred from another paper.

## Corrections and claim boundaries

- **The Baddour 2018 Step Method paper is not in JACS.** Any manuscript or README citation identifying it as *Journal of the American Chemical Society* should use the OPR&D reference above. This title concerns precommercial heterogeneous-catalyst pricing and the step-based method.
- The Van Allsburg 2022 title above exactly matches Crossref and the [publisher article page](https://www.nature.com/articles/s41929-022-00759-6). It is the CatCost cost-and-environmental-impact study; do not substitute an approximate title or DOI from another catalyst paper.
- Nuss and Eckelman is the verified source identity for the metal life-cycle-factor reference. Its existence does not verify every COMET transcription, compound-to-element approximation, or support-coverage assumption. Those remain model/data checks.
- BioSTEAM is optional prior art for uncertainty-aware process simulation and techno-economic analysis. Its verified publication does **not** establish that COMET is the first cost-and-LCA tool, first catalyst decision engine, or first reproducible platform. Any novelty claim must be scoped to demonstrated COMET behavior.
- A Crossref title search may rank a Supporting Information DOI first: the BioSTEAM query returned `10.1021/acssuschemeng.9b07040.s001` ahead of the article. The selected article DOI is explicitly **without `.s001`**.

## Actual URL responses

| Reference | Exact Crossref | DOI resolver final HTTP | Final publisher URL | Interpretation |
| --- | ---: | ---: | --- | --- |
| Baddour 2018 | 200 | 403 | `https://pubs.acs.org/doi/10.1021/acs.oprd.8b00245` | Registered citation confirmed; automated publisher access 확인 못 함 |
| Van Allsburg 2022 | 200 | 200 | `https://www.nature.com/articles/s41929-022-00759-6` | Registered citation and accessible publisher page confirmed |
| Nuss & Eckelman 2014 | 200 | 200 | `https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0101298` | Registered citation and accessible publisher page confirmed |
| BioSTEAM 2020 | 200 | 403 | `https://pubs.acs.org/ascecg/article/8/8/3302/1646301/BioSTEAM-A-Fast-and-Flexible-Platform-for-the` | Registered citation confirmed; automated publisher access 확인 못 함 |

The two ACS 403 responses are access limitations, not evidence of nonexistent articles. Publisher search results independently identified both ACS titles, but they do not convert an observed HTTP 403 into successful full-text retrieval. No full text or proprietary supplementary workbook was copied into the repository.
