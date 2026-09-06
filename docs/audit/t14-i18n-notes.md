# T14 UI translation audit

Before: 699 Korean keys, 2 missing literal `t()` key occurrences, and 104 raw
JSX text occurrences containing Latin letters. After: 822 Korean keys, **0 missing
translation key occurrences and 0 untranslated UI labels** under the expanded
static check. The 27 remaining raw JSX text occurrences are units, proper names,
technical abbreviations, bibliographic labels or sentences already in Korean;
they are listed, not silently omitted, in `i18n-after-t14.json`.

The scan now checks literal text and UI attributes (`label`, `title`,
`placeholder`, `aria-label`, `detail`), and validates both branches of conditional
translation keys. Direct JSX template-literal fragments and their conditional
branches are checked too, except explicit `lang` branches. This caught four
remaining labels (mass coverage, unit-mass basis, unavailable-scale tooltip and
quote-collection time); all now use translated keys. `npm run check:i18n` works
from the frontend directory and fails on missing keys or untranslated UI labels.
Other dynamic expressions and variable keys still require manual review; this scan is not a claim that all
runtime data can be translated automatically.

The manual pass covered keyboard hints, window controls, collapsed and expanded
sidebar labels, chart loading/tooltips/date labels, saved-case hints, source
inspection panels, empty states, sort options and local failure messages. Local
label values supplied through arrays already had Korean keys, apart from
technical acronyms that remain unchanged. Dataset summaries, model warnings,
citations and source notes retain their original text, per decision I.

The reference price review tile now describes monthly quotes behind the latest
stored publication month and states that anchor source confidence is retained.
Electrode source counts use the resolved electrode materials rather than stale
thermal draft counts.

`docs/getting-started.ko.md` covers the thermal workflow, electrode assembly,
price tiers, provenance, benchmark weighting, Monte Carlo and LCA coverage.
README screenshot regeneration and browser evidence are recorded separately by
the main run. Command checks alone are not reported as visual validation.

The final browser audit completed thermal, PEM electrode and an identical-step
alternative thermal method at a changed production scale (2 short tons), all
with calculation HTTP 200 and matching template IDs. The reference screen and
API show 18 tracked entries and zero review flags. One initial audit attempt
returned HTTP 422 before its response body was captured; its exact cause was
not established. Subsequent complete runs passed. The harness now waits for
initial network activity to settle and includes the request and response in
any future assertion failure. This is recorded as an unverified warm-up issue,
not as a demonstrated application fix.

Commands: `npm run check:i18n`, `npm run lint`, `npm run build`, and
`node --test scripts/test_calculator_rules.mjs` (9 passed). One intermediate build
found a duplicate pre-existing `Share` translation key added during the sweep;
the redundant new entry was removed and the build passed afterward.
