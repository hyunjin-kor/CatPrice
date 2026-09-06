import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMET_PLAYWRIGHT_PATH || 'playwright');
const baseUrl = process.env.COMET_CAPTURE_BASE_URL || 'http://127.0.0.1:8876';
const before = process.argv.includes('--before');
const phase = before ? 'before' : 'after';
const evidence = { baseUrl, phase, scenarios: [] };
const output = path.resolve('docs/audit');
await fs.mkdir(path.join(output, 'screens'), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const scenarios = ['cold-offline-default', 'delayed-scale-fitting', ...(!before ? ['stale-scale-cache', 'reload-during-fitting', 'failed-scale-fitting'] : [])];
  for (const scenario of scenarios) {
    const heldCosts = scenario !== 'cold-offline-default';
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const holdRoute = async (route) => {
      if (scenario === 'failed-scale-fitting') return route.abort('failed');
      await gate;
      await route.continue();
    };
    if (heldCosts && scenario !== 'stale-scale-cache') await page.route('**/api/templates/costs?**', holdRoute);
    const record = { scenario, page_errors: [], calculate_requests: 0 };
    evidence.scenarios.push(record);
    page.on('pageerror', (error) => record.page_errors.push(error.message));
    page.on('request', (request) => {
      if (request.url().endsWith('/api/calculate') && request.method() === 'POST') record.calculate_requests += 1;
    });
    try {
      await page.goto(baseUrl);
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('select').first().selectOption({ label: 'Ni' });
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button').filter({ hasText: 'Incipient Wetness Impregnation - Metal on Oxide Support' }).click();
      if (scenario === 'stale-scale-cache') {
        await page.waitForLoadState('networkidle');
        await page.route('**/api/templates/costs?**', holdRoute);
      }
      if (heldCosts) await page.getByTitle('Order size in tons; sets the Small, Medium or Large equipment basis.').fill('2');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      if (scenario === 'reload-during-fitting') await page.reload();
      const run = page.getByRole('button', { name: 'Run estimate', exact: true });
      record.run_disabled_while_pending = await run.isDisabled();
      if (heldCosts && !before) {
        assert.equal(record.run_disabled_while_pending, true, 'Do not submit a route before its scale-specific steps arrive');
        if (scenario === 'failed-scale-fitting') {
          await page.getByText('Preparation costs could not be loaded. Refresh this page or choose the preparation steps manually.', { exact: true }).waitFor();
          await page.getByRole('button', { name: /Toggle language/ }).click();
          await page.getByText('제조법별 가공비를 불러오지 못했습니다. 페이지를 새로고침하거나 제조 단계를 직접 선택하세요.', { exact: true }).waitFor();
          assert.equal(record.calculate_requests, 0);
          assert.deepEqual(record.page_errors, []);
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(output, 'screens', 'free-data-after-failed-scale-fitting-ko.png'), fullPage: true });
          continue;
        }
        await page.getByText('Waiting for the preparation steps at the selected production scale.', { exact: true }).waitFor();
        assert.equal(await page.getByText('Ready to run', { exact: true }).count(), 0);
        if (scenario === 'delayed-scale-fitting') {
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(output, 'screens', 'free-data-after-fitting-pending.png'), fullPage: true });
        }
        release();
      }
      const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/calculate') && response.request().method() === 'POST');
      await run.click();
      const response = await responsePromise;
      record.status = response.status();
      record.request = response.request().postDataJSON();
      record.response = await response.json();
      if (response.status() === 200) await page.getByText('Final result', { exact: true }).first().waitFor();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(output, 'screens', `free-data-${phase}-${record.scenario}.png`), fullPage: true });
      assert.equal(response.status(), 200, JSON.stringify(record.response));
      assert.equal(record.response.route_summary.template_id, 'wet_impregnation_metal_oxide');
      if (heldCosts) {
        assert.equal(record.request.order_size_tons, 2);
        assert.ok(record.request.steps.includes('kiln_batch'));
        assert.ok(!record.request.steps.includes('kiln_continuous_indirect'));
      }
      assert.deepEqual(record.page_errors, []);
    } finally {
      release();
      await page.close();
    }
  }
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, `free-data-cold-start-${phase}.json`), JSON.stringify(evidence, null, 2));
}
