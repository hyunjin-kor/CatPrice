# README screenshot capture — 2026-09-06

The existing `scripts/capture_readme_screens.mjs` regenerated all 11
`docs/assets/screen-*.png` files against the actual FastAPI application and built
frontend at `http://127.0.0.1:8765`. The server used the isolated audit database.
No saved estimate was created or changed. The script obtains its thermal inputs
and result from the running API and uses browser-session snapshots for the
illustrated workflow.

The capture uses the installed Chrome browser and an external Playwright runtime
through `COMET_PLAYWRIGHT_PATH`; no project dependency was added. Set
`COMET_CAPTURE_BASE_URL=http://127.0.0.1:8765` and
`COMET_CAPTURE_API_URL=http://127.0.0.1:8765/api`, then run
`node scripts/capture_readme_screens.mjs`.

Two capture-harness failures are retained in
`readme-capture-2026-09-06.log` and
`readme-capture-2026-09-06-retry.log`. Both stopped at the library screenshot:
the generic smallest-box search for `Search` also matched `Research` inside an
off-screen material description. The measured selected box started near
70,237 px while document height was 1,377 px. Enabling full-page screenshots
alone did not fix that substring collision. The library now uses the existing
top-slice capture helper. Browser cleanup also runs if a capture fails.

The final run exited **0**, captured every requested surface and completed the
existing rounded-corner postprocessing; see
`readme-capture-2026-09-06-final.log`. The source-library, manufacturing-result
and estimate-range PNGs were visually inspected: controls, cost labels and
charts are rendered and readable. Source text remains in its original language;
the range screenshot shows a real unseeded 1,000-sample UI calculation and is
illustrative, not a replacement for the fixed-seed paper results.

Three stale capture text selectors were aligned with the current application:
catalyst class, catalyst formulation and tracked metals. No frontend code was
changed during screenshot capture.
