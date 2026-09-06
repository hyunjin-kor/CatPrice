# Cold-start calculation stability — 2026-09-06

A reproducible preparation-step loading race caused HTTP 422. Selecting a
thermal method and changing production size from 20 to 2 short tons could
submit the original continuous-kiln step before the scale-specific response
arrived. The API correctly rejected that step at Small scale. This was
reproduced before changing application code with a real Chrome browser and
the actual FastAPI application on port **8876**.

The separate server used a newly created temporary SQLite database, normal
library initialization, and a stubbed startup price collector returning no
observations. It did not access the user's database or the main audit server
on port 8765. No network subscription or extra project dependency was used.
The ordinary cold, offline 20-ton path already returned 200. The original T14
422 response was not retained, so it cannot be established that the earlier
failure had this same cause.

## Regression before the fix

`scripts/test_calculator_cold_start.mjs --before` held only the browser's
`/api/templates/costs` responses while allowing real API requests for materials,
prices and calculations. The Run estimate button remained enabled, and the
submitted two-ton request still contained `kiln_continuous_indirect`.
The assertion failed with HTTP 422 and this response:

```text
Step 'kiln_continuous_indirect' is not available at 'small' scale.
Try a different scale or substitute step.
```

Full requests/responses: `free-data-cold-start-before.json`.
Screenshot: `screens/free-data-before-delayed-scale-fitting.png`.

## Correction and checks

The selected template now becomes runnable only when its costing response
matches the current order size and its fitted steps match the submitted
steps, including repeated operations. This also rejects a stale 20-ton cache
after a change to two tons. The request handler and the visible button use the
same guard. Manual routes remain usable. Pending and failed-loading guidance
has English and Korean labels; the preparation tile no longer says ready
while waiting. Refreshing the page or selecting steps manually remains the
recovery path after a failed request.

| Actual browser scenario | Observed result |
|---|---|
| New DB, fresh browser, no collected live prices, 20 tons | HTTP 200 before and after; full result summary unchanged |
| Initial scale-fitting response delayed, 2 tons | Run disabled while pending; HTTP 200 after response |
| Existing 20-ton cost cache, new 2-ton response delayed | Stale cache cannot enable Run; HTTP 200 after response |
| Page reloaded with selected method and fitting still pending | Draft identity and 2-ton size retained; HTTP 200 after response |
| Scale-fitting request failed | Run remains disabled, no calculate request sent; Korean recovery guidance shown |

The three delayed-success paths submit `kiln_batch` and preserve
`wet_impregnation_metal_oxide`. Their result is $16.4599/lb for the existing
offline two-ton Ni/Al2O3 inputs. No equation, step rate or price data changed.
Full evidence: `free-data-cold-start-after.json`; screenshots use
`screens/free-data-after-*.png`. Pending guidance, Korean failure guidance and
the successful result were visually inspected after their transitions settled.
There were no page JavaScript errors in the five scenarios.

Validation:

- `node scripts/test_calculator_cold_start.mjs`: five browser scenarios passed.
- `node scripts/test_calculator_rules.mjs`: 10 passed, including pending/mismatched
  order sizes, wrong fitted steps and manual-route availability.
- `python -m pytest backend/tests/test_template_identity.py backend/tests/test_reproducibility.py -q`:
  6 passed in 3.63 seconds.
- `npm run check:i18n`, `npm run lint`, `npm run build` from `frontend`: passed;
  784 static translation calls, 824 Korean keys, zero missing keys and zero
  untranslated labels under the documented scanner scope.

For the browser regression, set `COMET_CAPTURE_BASE_URL` to the isolated
server and `COMET_PLAYWRIGHT_PATH` to an existing Playwright installation.
The script launches installed Chrome. `--before` exists solely to record the
unfixed regression; normal verification omits it. The reload check covers
the existing browser-session draft. A broader saved-estimate investigation
was not needed for this reproduced loading race.
