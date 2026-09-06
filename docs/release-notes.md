# Release Notes

## 1.4.0 — prepared, not published (2026-09-06)

The package versions are 1.4.0. The latest verified public release remains v1.3.24. No tag, GitHub release, Zenodo deposit or deployment was created in this run.

- Choose live quotes or a common published month throughout the calculator, prices and literature comparison. The monthly reference uses IMF and Johnson Matthey averages; optional UN Comtrade support values retain explicit bulk-proxy provenance ([#104](https://github.com/hyunjin-kor/COMET/pull/104), [#105](https://github.com/hyunjin-kor/COMET/pull/105), [#106](https://github.com/hyunjin-kor/COMET/pull/106)).
- Compare 28 named thermal preparation methods with processing costs at the chosen production scale. Card identity and repeated operations now survive scale fitting ([#107](https://github.com/hyunjin-kor/COMET/pull/107)).
- Researcher-facing terms, clearer Korean labels and walkthrough fixes from [#108](https://github.com/hyunjin-kor/COMET/pull/108), [#109](https://github.com/hyunjin-kor/COMET/pull/109) and [#110](https://github.com/hyunjin-kor/COMET/pull/110) are included; the Korean getting-started guide explains the two workflows.
- Monthly quotes are reviewed against their publication month. Annual anchors retain their lower evidence confidence without being mislabelled as stale monthly observations.
- An optional uncertainty `seed` reproduces a run; omitting it produces independent samples. Benchmark ties resolve consistently.
- Electrode headline, ledger and chart use the same area-based assembly cost. Thermal campaign and margin values are excluded from the electrode result.
- Direct Johnson Matthey and Westmetall sources take priority for the specified metals, with slower Yahoo polling and documented fallbacks.
- The paper reproduction command freezes input hashes and the execution environment, runs all analyses and generates six figures. Source audits distinguish verified DOI registrations, restricted URLs and observed missing pages.

Validation and remaining checks are recorded in the [run audit](audit/autonomous-run-2026-09-06.md) and [release checklist](release-checklist.md). The published Table 6.2 acceptance cases remain Pt/C to the cent, Ni within 7%, and FCC within 2% using its footnote-b rate. Pricing-input changes and display corrections are documented individually; no new rate was invented for uncosted operations.

The authoritative release log for COMET lives on GitHub:

**https://github.com/hyunjin-kor/COMET/releases**

Every tagged release (`vX.Y.Z`) carries the changelog, validation results,
and download links for that version. The latest release also redirects via
the repository's homepage URL:

**https://github.com/hyunjin-kor/COMET/releases/latest**

This file used to mirror release entries by hand and stopped at v1.1.13;
it has been replaced by the GitHub Releases feed so there is exactly one
source of truth. To find a specific version's notes, browse the
[Releases page](https://github.com/hyunjin-kor/COMET/releases) or run:

```bash
gh release view <tag> --repo hyunjin-kor/COMET
```
