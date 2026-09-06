import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMET_PLAYWRIGHT_PATH || 'playwright');
const baseUrl = process.env.COMET_CAPTURE_BASE_URL || 'http://127.0.0.1:8765';
const phase = process.argv[2] || 'baseline';
const out = path.resolve('docs/audit/screens');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const evidence = { phase, baseUrl, flows: [] };
try {
  const scenarios = phase === 'baseline' ? ['thermal', 'electrocatalyst'] : ['thermal', 'electrocatalyst', 'thermal_duplicate'];
  for (const scenario of scenarios) {
    const domain = scenario === 'thermal_duplicate' ? 'thermal' : scenario;
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    if (domain === 'electrocatalyst') await page.getByRole('button').filter({ hasText: /^Electrocatalyst/ }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    if (domain === 'thermal') await page.locator('select').first().selectOption({ label: 'Ni' });
    else await page.getByLabel(/Preparation template/i).selectOption('pem_fuel_cell_ccm');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    if (domain === 'thermal') {
      const methodName = scenario === 'thermal_duplicate'
        ? 'Excess-Solution (Wet) Impregnation - Metal on Oxide Support'
        : 'Incipient Wetness Impregnation - Metal on Oxide Support';
      await page.getByRole('button').filter({ hasText: methodName }).click();
      if (scenario === 'thermal_duplicate') {
        await page.getByTitle('Order size in tons; sets the Small, Medium or Large equipment basis.').fill('2');
      }
    }
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/calculate') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Run estimate', exact: true }).click();
    const response = await responsePromise;
    assert.equal(response.status(), 200, JSON.stringify({ scenario, request: response.request().postDataJSON(), response: await response.text() }));
    const request = response.request().postDataJSON();
    const result = await response.json();
    assert.equal(request.catalyst_domain, domain);
    assert.equal(result.input_summary.catalyst_domain, domain);
    await page.waitForURL('**/calculator/result');
    await page.getByText('Final result', { exact: true }).first().waitFor();
    const body = await page.locator('body').innerText();
    if (domain === 'thermal') {
      assert.equal(request.template_id, scenario === 'thermal_duplicate'
        ? 'excess_solution_impregnation_metal_oxide' : 'wet_impregnation_metal_oxide');
      assert.equal(result.route_summary.template_id, request.template_id);
      if (scenario === 'thermal_duplicate') assert.equal(request.order_size_tons, 2);
    } else {
      assert.equal(request.template_id, 'pem_fuel_cell_ccm');
      assert.ok(result.electrode_model.cost_per_cm2_usd > 0);
      if (phase !== 'baseline') {
        assert.ok(!body.includes('Selling margin basis'));
        assert.ok(!body.includes('Production time'));
        assert.ok(body.includes('Electrode total'));
      }
    }
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(out, `${phase}-${scenario}.png`), fullPage: true });
    await fs.writeFile(path.join(out, `${phase}-${scenario}.txt`), body);
    evidence.flows.push({ scenario, domain, status: response.status(), request, result, page_errors: errors });
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(baseUrl);
  await page.getByRole('button', { name: /Toggle price basis/ }).click();
  await page.getByRole('button', { name: /Toggle language/ }).click();
  await page.getByRole('link', { name: '실시간 금속 시세', exact: true }).click();
  await page.getByText('점검 필요', { exact: true }).first().waitFor();
  await page.waitForTimeout(500);
  evidence.reference_prices = await page.evaluate(async () => (await fetch('/api/prices?basis=reference')).json());
  evidence.reference_screen = await page.locator('body').innerText();
  await page.screenshot({ path: path.join(out, `${phase}-reference-prices.png`), fullPage: true });
  await fs.writeFile(path.join(out, `${phase}-reference-prices.txt`), evidence.reference_screen);
  if (phase !== 'baseline') {
    assert.ok(evidence.reference_prices.every(row => row.needs_review === false));
    assert.match(evidence.reference_screen, /점검 필요\s+0/);
  }
  await fs.writeFile(`docs/audit/${phase}-browser.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ phase, flows: evidence.flows.map(({ domain, status, request }) => ({ domain, status, template_id: request.template_id })), reference_rows: evidence.reference_prices.length }));
} finally {
  await browser.close();
}


