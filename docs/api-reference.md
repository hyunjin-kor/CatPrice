# API Reference

Base URL:

- Electron/local desktop dev: `http://127.0.0.1:8765/api`
- Standalone backend debug runs: `http://localhost:8000/api`

## Calculator

### POST /api/calculate
Full catalyst cost estimation using the current multi-component request shape.

**Thermocatalyst example:**
```json
{
  "catalyst_domain": "thermal",
  "application_family": "general",
  "components": [
    { "role": "active_metal", "name": "Ni", "wt_pct": 20.0, "price_per_lb": 7.5 },
    { "role": "support", "name": "Al2O3", "wt_pct": 80.0, "price_per_lb": 0.5 }
  ],
  "steps": ["mixer_slurry", "incipient_wetness", "dryer_rotary_100_300C"],
  "order_size_tons": 20.0,
  "include_spent_value": true,
  "reactor_type": "fixed",
  "catalyst_bulk_density": 50.0
}
```

**Electrocatalyst example:**
```json
{
  "catalyst_domain": "electrocatalyst",
  "application_family": "fuel_cell",
  "template_id": "pem_fuel_cell_ccm",
  "components": [
    { "role": "active_catalyst", "material_key": "fcs:ptc-20-vulcan", "wt_pct": 100.0 }
  ],
  "steps": ["membrane_pretreatment", "ionomer_ink_homogenization", "ccm_coating_pass", "electrode_drying_low_temp", "hot_press_lamination", "electrochemical_break_in"],
  "order_size_tons": 20.0,
  "electrode_input": {
    "application_family": "fuel_cell",
    "catalyst_material_key": "fcs:ptc-20-vulcan",
    "ionomer_material_key": "fcs:nafion-d2020",
    "membrane_material_key": "fcs:nafion-117",
    "substrate_material_key": "fcs:carbon-paper-gdl",
    "active_area_cm2": 25.0,
    "catalyst_loading_mg_cm2": 0.5,
    "ionomer_to_catalyst_ratio": 0.8
  }
}
```

**Notable response fields:**

- `summary`: estimated and net cost
- `step_method`: campaign basis and cost split
- `spent_catalyst`: returned when recovery screening is enabled
- `electrode_model`: returned for electrocatalyst area-based runs
- `resolved_materials`: source rows, quote basis, and normalization metadata

### POST /api/calculate/quick
Simplified calculation with minimal inputs.

### POST /api/compare
Compare up to 4 compositions side-by-side.

### POST /api/uncertainty
Monte Carlo simulation (100-10000 iterations). Pass `calculation_input` with the
same body accepted by `/api/calculate`, plus `n_simulations` and optionally `seed`.
`seed` is a nonnegative integer; the same input and seed reproduce the same
summary. Omit it (or pass `null`) for fresh random draws. Both the full calculator
input and legacy flat uncertainty request accept this field.

The offline `scripts/run_all_families.py` analysis accepts `--price-basis <json>`
for a frozen price map and `--basis-type reference` for the academic tier. Frozen
runs omit the wall-clock timestamp (`generated_at: null`) so identical inputs
produce identical JSON; `SOURCE_DATE_EPOCH` can supply a fixed UTC timestamp.

## Prices

### GET /api/templates/costs
`?order_size_tons=20` (and optionally `catalyst_domain`). Processing cost of every process template at that campaign size, materials excluded, with the steps fitted to the campaign's scale (`steps_fitted`, `substitutions`), any steps that could not be priced (`dropped_steps`), and the operations the Step Library has no rate for (`uncosted_operations`).

### GET /api/prices
All metals with latest prices. `?basis=live` (default) returns the daily quotes; `?basis=reference` returns the latest stored monthly averages (IMF PCPS, Johnson Matthey), with `basis_month` on each row. The same parameter applies to `/api/prices/{symbol}`, `/api/prices/{symbol}/history`, `/api/prices/trends` and `/api/decision/benchmarks/{family}`; `POST /api/calculate` takes it as `price_basis` in the body. `GET /api/prices/supports?basis=reference` lists the support-material unit-value series (HS code, material, library keys, latest month and value).

### GET /api/prices/{symbol}
Single metal price (e.g., `/api/prices/Pt`).

### GET /api/prices/{symbol}/history
Price history with `?limit=30` parameter.

### POST /api/prices/refresh
Manually trigger price update from APIs. In non-debug deployments this is limited to local requests by default.

## Materials

### GET /api/materials
List all materials. Filter with `?category=metal` or `?q=plat`.

### POST /api/materials
Add a custom material.

### GET /api/materials/templates
List process templates.

### GET /api/materials/templates/{id}
Get specific template details.

### GET /api/materials/steps
List all processing steps with hourly costs.

## Import/Export

### POST /api/import/catcost
Import CatCost-compatible JSON file.

### GET /api/export/{estimate_id}
Export saved estimate (`?format=json` or `?format=csv`).

## System

### GET /api/health
Server health check with scheduler status.
