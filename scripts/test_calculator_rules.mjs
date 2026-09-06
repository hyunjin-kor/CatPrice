import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = require('typescript');
async function loadHelper(name) {
  const source = readFileSync(new URL(`../frontend/src/lib/${name}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { sameSteps, matchThermalTemplate } = await loadHelper('preparation-selection');
const { compareElectroPreference } = await loadHelper('electrode-defaults');
const { electrodeCostRows } = await loadHelper('electrode-result');

test('repeated operations remain distinct while order-only changes match', () => {
  assert.equal(sameSteps(['mix', 'mix', 'dry'], ['mix', 'dry', 'dry']), false);
  assert.equal(sameSteps(['mix', 'mix', 'dry'], ['dry', 'mix', 'mix']), true);
});

test('selected card identity survives identical routes and scale fitting', () => {
  const templates = ['first', 'selected'].map((id) => ({ id, name: id, steps: ['mix', 'kiln_batch'] }));
  assert.equal(matchThermalTemplate(templates, {}, templates[0].steps, 'selected').id, 'selected');
  assert.equal(matchThermalTemplate(templates, {}, templates[0].steps, null), null);
  const fitted = Object.fromEntries(templates.map(({ id }) => [id, { steps_fitted: ['mix', 'kiln_continuous_indirect'] }]));
  assert.equal(matchThermalTemplate(templates, fitted, fitted.selected.steps_fitted, 'selected').id, 'selected');
  assert.equal(matchThermalTemplate(templates, fitted, ['mix'], 'selected'), null);
});

const categories = ['Electrocatalyst Powder', 'Ionomer', 'Membrane', 'Gas Diffusion Layer'];
const candidates = {
  'Electrocatalyst Powder': ['Pt', 'PtRu', 'Ir', 'Ru', 'Ni', 'Ag'].map((symbol) => ({ name: symbol, symbol })),
  Ionomer: [{ name: 'PFSA dispersion' }, { name: 'AEM dispersion' }],
  Membrane: [{ name: 'PFSA membrane' }, { name: 'AEM membrane' }],
  'Gas Diffusion Layer': [{ name: 'Carbon paper' }, { name: 'Titanium PTL' }, { name: 'Nickel foam' }],
};
for (const [family, template, expected] of [
  ['fuel_cell', 'pem_fuel_cell_ccm', ['Pt', 'PFSA dispersion', 'PFSA membrane', 'Carbon paper']],
  ['direct_methanol_fuel_cell', 'dmfc_gde_route', ['PtRu', 'PFSA dispersion', 'PFSA membrane', 'Carbon paper']],
  ['electrolyzer', 'pem_electrolyzer_ccm', ['Ir', 'PFSA dispersion', 'PFSA membrane', 'Titanium PTL']],
  ['electrolyzer', 'alkaline_electrolyzer_gde', ['Ni', 'AEM dispersion', 'AEM membrane', 'Nickel foam']],
]) {
  test(`${family} × ${template} defaults`, () => {
    const chosen = categories.map((category) => [...candidates[category]].reverse().sort((left, right) =>
      compareElectroPreference(left, right, category, family, template))[0].name);
    assert.deepEqual(chosen, expected);
  });
}

test('AEM fuel-cell route retains existing application-family preference', () => {
  const exact = { name: 'Exact family', application_family: 'fuel_cell', price: 100 };
  const general = { name: 'General', application_family: 'general', price: 1 };
  assert.ok(compareElectroPreference(exact, general, 'Electrocatalyst Powder', 'fuel_cell', 'aem_fuel_cell_ccm') < 0);
});

test('equal chemistry ranks prefer source scope, then quoted price, then name', () => {
  const compare = (left, right) => compareElectroPreference(left, right, 'Ionomer', 'fuel_cell', 'pem_fuel_cell_ccm');
  const base = { name: 'PFSA A', price_scope: 'vendor_lab', price: 10 };
  assert.ok(compare({ ...base, price_scope: 'literature_high_volume', price: 100 }, base) < 0);
  assert.ok(compare({ ...base, price: 5 }, base) < 0);
  assert.ok(compare(base, { ...base, name: 'PFSA B' }) < 0);
});

test('electrode displayed ledger uses area costs without thermal cost fields', () => {
  const result = {
    electrode_model: { active_area_cm2: 25, total_cost_usd: 5, breakdown: [
      { label: 'Catalyst powder', cost_usd: 2 }, { label: 'Membrane', cost_usd: 3 },
    ] },
    materials: { total_materials_cost_per_lb: 999999 },
    step_method: { processing_cost_per_lb: 888888, ga_per_lb: 777777, margin_pct: 66 },
    spent_catalyst: { V_reclaimed_per_lb: 555555 },
  };
  const rows = electrodeCostRows(result);
  assert.deepEqual(rows.map((row) => row.label), ['Catalyst powder', 'Membrane']);
  assert.equal(rows.reduce((sum, row) => sum + row.costPerCm2, 0), 0.2);
  assert.equal(rows.reduce((sum, row) => sum + row.share, 0), 100);
  assert.deepEqual(electrodeCostRows({ electrode_model: result.electrode_model }), rows);
  assert.equal(electrodeCostRows({ electrode_model: null }), null);
});
