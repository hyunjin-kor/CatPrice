# T06 provenance and publication checks — 2026-09-06

This task changes no source data, prices, license files, or calculation formulas. The raw local CatCost extraction is ignored by Git and excluded from all report contents. The reusable audit reads only tracked JSON files.

## Commands and evidence

```text
python -m ruff check scripts/audit_provenance.py
python scripts/audit_provenance.py --date 2026-09-06
python scripts/audit_provenance.py --date 2026-09-06 --reuse-checks docs/sources/provenance-2026-09-06.json --retry-dois --concurrency 1
```

Ruff passed. Inventory consistency checks confirmed 80 tracked JSON files, 3,046 JSON objects, 467 unique HTTP(S) URLs, and 317 unique DOI strings. No unresolved benchmark citation IDs were found. The network outcome counts are recorded in [the exhaustive audit](../sources/provenance-2026-09-06.md) and [machine-readable evidence](../sources/provenance-2026-09-06.json).

The first network pass took **228.697 seconds** (02:46:25.747–02:50:14.444 UTC). It verified 312 DOI registrations, with five transient Crossref 429 responses. A serial retry verified the remaining five; previous 429 attempts remain in the JSON. **All 317 unique DOI strings now match Crossref registrations.** Of 467 unique URLs, **287 returned 200**, **150 returned unverified HTTP responses** (146 × 403 and 4 × 429), **29 had network failures**, and **one returned 404**: `https://www.cmcrecyclingindependence.com/current-pricing/`. That link is listed for human review without changing data. The 179 unverified URLs must not be called dead links.

The object-level audit contains 1,520 objects without a direct source field and 1,526 with one. This includes nested configuration and metadata objects; it must not be reported as 1,520 scientifically unsupported measurements. Inherited file-level context and resolved benchmark citation IDs have separate flags. The audit verifies identifier registration and HTTP response, not whether every linked paper supports each catalyst, activity claim, numeric price, or license declaration. A successful response also does not prove a catalog price is still visible or unchanged. Source data have not been silently corrected.

## Molybdenum anchor and curated entry

The [USGS 2026 molybdenum chapter](https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-molybdenum.pdf) returned HTTP 200. Its 2025 estimated average price is $51/kg; the conversion is $51 × 0.45359237 = **$23.13321087/lb**, consistent with the existing **$23.13/lb** anchor. Footnote 4 describes U.S. molybdic oxide at 57% molybdenum content and names **Argus Media group, Argus Non-Ferrous Markets**. The previous [USGS 2025 chapter](https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-molybdenum.pdf), also HTTP 200, gives the then-estimated 2024 value of $47/kg; the 2026 edition revises 2024 to $47.72/kg.

The current `backend/core/price_fetcher.py` anchor comment calls this a Platts basis. That attribution conflicts with the inspected 2026 USGS footnote. The curated `lit:usgs-molybdic-oxide-2025` item stores $51/kg with formula MoO3 and describes an industrial oxide proxy. The footnote's commercial 57% grade should not be silently interpreted as a catalyst-grade, pure-MoO3 compound-mass quotation. The [Argus methodology](https://www.argusmedia.com/-/media/project/argusmedia/mainsite/english/documents-and-files/methodology/argus-non-ferrous-markets.pdf?rev=4c19438e88c24c4e82b0ff02cfc875f3), HTTP 200, distinguishes the Rotterdam contained-Mo quotation from the U.S. warehouse assessment. It does not justify a new conversion for COMET's curated compound row without a more explicit U.S. unit-basis check.

Decision D is followed: the anchor, curated item, and code remain unchanged. The conversion confirms the existing anchor arithmetic; the exact compound-mass interpretation of the curated MoO3 row remains **확인 못 함**. Request/response times, hashes, and the USGS price-row and footnote evidence are retained in [external checks](../sources/t06-external-checks-2026-09-06.json).

## ACS Sustainable Chemistry & Engineering format

The [official ACS author guidelines](https://researcher-resources.acs.org/publish/author_guidelines?coden=ascecg) were retrieved with HTTP 200; the page reports an update date of **August 27, 2026**. The Article format allows **7,000 word-equivalents**. It requires a **150–200 word abstract**, **5–8 keywords**, and a TOC/abstract graphic. Small figures, schemes, and tables generally count as **300 words each**; large items count as **600 or more**. References, title page, TOC graphic, and Supporting Information are excluded from this count. No independent fixed figure-count ceiling was stated in the inspected guidance.

Six small main-text figures therefore use 1,800 word-equivalents and leave 5,200 for counted text **before any tables**; six large figures would leave at most 3,400. Move detailed supplementary tables to SI. The guidelines permit relevant alternative section names and ask authors to omit section numbering. The user's requested 3.4/3.5/3.6 mapping may remain in the working Markdown; final submission formatting should remove visible numbering. These are preparation requirements, not journal acceptance or submission confirmation.

## Concept DOI

The supplied [concept DOI 10.5281/zenodo.21451931](https://doi.org/10.5281/zenodo.21451931) returned HTTP 200 and resolved to [Zenodo record 22213096](https://zenodo.org/records/22213096). The public [Zenodo API](https://zenodo.org/api/records/21451931) confirms concept DOI `10.5281/zenodo.21451931`, version DOI `10.5281/zenodo.22213096`, and the COMET title. The [DataCite API](https://api.datacite.org/dois/10.5281/zenodo.21451931) returned HTTP 200 with `state=findable`, publisher Zenodo, resource type Software, and a related GitHub URL ending in `tree/v1.3.24`.

The mandatory [Crossref lookup](https://api.crossref.org/works/10.5281%2Fzenodo.21451931) returned 404. This is a registration-agency distinction, not a broken DOI: this DOI is registered with DataCite. It does not establish any v1.4.0 release or archive. No DOI, release, or external record was created or edited.

## Assumptions and limits

- Tracked files define the redistributable audit scope; ignored proprietary files are not enumerated beyond identifying their exclusion.
- Every JSON object is a structural record. Scalar annual observations inherit the audited annual-map context rather than becoming artificial records with repeated source flags.
- HTTP 404/410 is an observed not-found response, while 403/429, other errors, and timeouts are unverified. No link is replaced from status alone.
- DOI exact-match validation confirms registration. Scientific relevance, author/title agreement with free-form citation labels, and legal reuse permissions need separate content review.
- The audit stores only public identifiers, compact citation metadata, statuses, and source-file hashes. No credentials, raw workbook values, response cookies, or private HTTP headers are retained.
