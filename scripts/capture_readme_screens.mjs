import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMET_PLAYWRIGHT_PATH || 'playwright');

const baseUrl = process.env.COMET_CAPTURE_BASE_URL ?? 'http://127.0.0.1:4173';
const outputDir = path.resolve(process.cwd(), 'docs', 'assets');
const apiBaseUrl = process.env.COMET_CAPTURE_API_URL ?? 'http://127.0.0.1:8765/api';
const LB_PER_KG = 2.20462;
const TROY_OZ_PER_LB = 14.5833;

async function ensureOutputDir() {
  await mkdir(outputDir, { recursive: true });
}

async function waitForAppReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function captureClip(page, clip, filename) {
  await page.screenshot({
    path: path.join(outputDir, filename),
    type: 'png',
    fullPage: true,
    clip: {
      x: Math.max(0, Math.floor(clip.x)),
      y: Math.max(0, Math.floor(clip.y)),
      width: Math.ceil(clip.width),
      height: Math.ceil(clip.height),
    },
  });
}

function logStep(message) {
  console.log(`[capture] ${message}`);
}

function toPerLb(price, unit) {
  if (unit === '$/troy_oz') return price * TROY_OZ_PER_LB;
  if (unit === '$/kg') return price / LB_PER_KG;
  return price;
}

async function navigateWithinApp(page, route) {
  await page.evaluate((nextRoute) => {
    window.history.pushState({}, '', nextRoute);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, route);
}

async function captureSectionByText(page, text, filename) {
  const clip = await page.evaluate((needle) => {
    const normalizedNeedle = needle.toLowerCase();
    const section = [...document.querySelectorAll('section')].find((node) =>
      node.innerText.toLowerCase().includes(normalizedNeedle),
    );
    if (!section) return null;
    const rect = section.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  }, text);
  if (!clip) {
    throw new Error(`Failed to find section containing "${text}"`);
  }
  await captureClip(page, clip, filename);
}

async function captureSelectorBox(page, selector, filename) {
  const clip = await page.evaluate((query) => {
    const node = document.querySelector(query);
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  }, selector);
  if (!clip) {
    throw new Error(`Failed to find selector "${selector}"`);
  }
  await captureClip(page, clip, filename);
}

async function captureSelectorTopSlice(page, selector, filename, maxHeight) {
  const clip = await page.evaluate(({ query, capHeight }) => {
    const node = document.querySelector(query);
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: Math.min(rect.height, capHeight),
    };
  }, { query: selector, capHeight: maxHeight });
  if (!clip) {
    throw new Error(`Failed to find selector "${selector}"`);
  }
  await captureClip(page, clip, filename);
}

async function captureSelectorSliceFromText(page, selector, text, filename, maxHeight) {
  const clip = await page.evaluate(({ query, needle, capHeight }) => {
    const root = document.querySelector(query);
    if (!root) return null;
    const normalizedNeedle = needle.toLowerCase();
    const candidates = [...root.querySelectorAll('section, div')]
      .filter((node) => node.innerText.toLowerCase().includes(normalizedNeedle))
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width >= 260 && rect.height >= 80;
      });
    if (!candidates.length) return null;
    candidates.sort((left, right) => {
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      return leftRect.width * leftRect.height - rightRect.width * rightRect.height;
    });
    const target = candidates[0];
    if (!target) return null;
    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    return {
      x: rootRect.left + window.scrollX,
      y: targetRect.top + window.scrollY,
      width: rootRect.width,
      height: capHeight,
    };
  }, { query: selector, needle: text, capHeight: maxHeight });
  if (!clip) {
    throw new Error(`Failed to find "${text}" within selector "${selector}"`);
  }
  await captureClip(page, clip, filename);
}

async function captureSmallestBoxByText(page, text, filename) {
  const handle = await page.evaluateHandle((needle) => {
    const normalizedNeedle = needle.toLowerCase();
    const candidates = [...document.querySelectorAll('section, div')]
      .filter((node) => node.innerText.toLowerCase().includes(normalizedNeedle))
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width >= 260 && rect.height >= 140;
      });

    if (!candidates.length) return null;
    candidates.sort((left, right) => {
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      return leftRect.width * leftRect.height - rightRect.width * rightRect.height;
    });
    return candidates[0];
  }, text);
  const element = handle.asElement();
  if (!element) {
    await handle.dispose();
    throw new Error(`Failed to find focused block containing "${text}"`);
  }
  await element.screenshot({
    path: path.join(outputDir, filename),
    type: 'png',
  });
  await handle.dispose();
}

async function preparePage(context, draftSnapshot, resultSnapshot, route = '/') {
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  await page.addInitScript(({ draft, snapshot }) => {
    localStorage.setItem('comet_unit', 'kg');
    const apply = () => {
      window.sessionStorage.setItem('comet_calculator_draft', JSON.stringify(draft));
      window.sessionStorage.setItem('comet_calculator_result', JSON.stringify(snapshot));
    };
    apply();
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      apply();
      if (Date.now() - startedAt > 4000) {
        window.clearInterval(timer);
      }
    }, 50);
  }, { draft: draftSnapshot, snapshot: resultSnapshot });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  if (route !== '/') {
    await navigateWithinApp(page, route);
  }
  await waitForAppReady(page);
  return page;
}

async function main() {
  await ensureOutputDir();

  const [pricesResponse, compositionOptionsResponse] = await Promise.all([
    fetch(`${apiBaseUrl}/prices`),
    fetch(`${apiBaseUrl}/materials/composition-options?catalyst_domain=thermal`),
  ]);

  if (!pricesResponse.ok) {
    throw new Error(`Failed to fetch prices for README capture: ${pricesResponse.status}`);
  }
  if (!compositionOptionsResponse.ok) {
    throw new Error(`Failed to fetch composition options for README capture: ${compositionOptionsResponse.status}`);
  }

  const prices = await pricesResponse.json();
  const compositionOptions = await compositionOptionsResponse.json();
  const liveCu = prices.find((row) => row.symbol === 'Cu' && row.source_type === 'live');
  const indexedMg = compositionOptions.promoter_options.find((row) => row.display_name === 'Mg');
  const indexedAlumina = compositionOptions.support_options.find((row) => row.display_name === 'Al2O3');

  if (!liveCu || !indexedMg || !indexedAlumina) {
    throw new Error('Failed to assemble the thermal README capture case from live/feed-backed rows.');
  }

  const selectedSteps = [
    'mixer_slurry',
    'incipient_wetness',
    'reactor_simple',
    'dryer_rotary_100_300C',
    'kiln_continuous_direct',
  ];
  const resultResponse = await fetch(`${apiBaseUrl}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      catalyst_domain: 'thermal',
      application_family: 'general',
      order_size_tons: 20,
      steps: selectedSteps,
      components: [
        { role: 'active_metal', name: 'Cu', wt_pct: 20, price_per_lb: toPerLb(liveCu.price, liveCu.unit) },
        { role: 'promoter', name: indexedMg.display_name, wt_pct: 5, price_per_lb: indexedMg.price_per_lb },
        { role: 'support', name: indexedAlumina.display_name, wt_pct: 75, price_per_lb: indexedAlumina.price_per_lb },
      ],
    }),
  });
  if (!resultResponse.ok) {
    throw new Error(`Failed to fetch calculation result for README capture: ${resultResponse.status}`);
  }
  const result = await resultResponse.json();
  const liveFeedCount = prices.filter((row) => row.source_type === 'live').length;
  const indexedFeedCount = prices.filter((row) => row.source_type === 'indexed').length;
  const draftSnapshot = {
    rows: [
      {
        id: 'draft-active-cu',
        role: 'active_metal',
        name: 'Cu',
        material_key: null,
        symbol: 'Cu',
        selection_key: 'live:Cu',
        wt_pct: 20,
        price_per_lb: toPerLb(liveCu.price, liveCu.unit),
        source_type: 'live',
        source: liveCu.source,
      },
      {
        id: 'draft-promoter-mg',
        role: 'promoter',
        name: indexedMg.display_name,
        material_key: indexedMg.material_key ?? null,
        symbol: indexedMg.symbol ?? null,
        selection_key: indexedMg.selection_key,
        wt_pct: 5,
        price_per_lb: indexedMg.price_per_lb,
        source_type: indexedMg.source_type,
        source: indexedMg.quote_source ?? 'Library',
      },
      {
        id: 'draft-support-al2o3',
        role: 'support',
        name: indexedAlumina.display_name,
        material_key: indexedAlumina.material_key ?? null,
        symbol: indexedAlumina.symbol ?? null,
        selection_key: indexedAlumina.selection_key,
        wt_pct: 75,
        price_per_lb: indexedAlumina.price_per_lb,
        source_type: indexedAlumina.source_type,
        source: indexedAlumina.quote_source ?? 'Library',
      },
    ],
    steps: selectedSteps,
    catalystDomain: 'thermal',
    applicationFamily: 'general',
    orderSize: 20,
    pricesUpdatedAt: new Date().toISOString(),
    includeSpentValue: false,
    reactorType: 'fixed',
    catalystBulkDensity: 50,
    electrocatalystConfig: null,
    benchmarkCandidate: null,
  };
  const resultSnapshot = {
    result,
    orderSize: 20,
    steps: selectedSteps,
    stepLabels: ['Slurry Mixer', 'Incipient Wetness', 'Simple Reactor', 'Rotary Dryer 100-300 C', 'Continuous Kiln Direct'],
    selectedSupportName: 'Al2O3',
    activeMetalCount: 1,
    liveFeedCount,
    indexedFeedCount,
    nonSupportWt: 25,
    supportWtPct: 75,
    generatedAt: new Date().toISOString(),
    benchmarkCandidate: null,
  };

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1120 },
    deviceScaleFactor: 1,
  });
  await context.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const nextUrl = `${apiBaseUrl}${requestUrl.pathname.replace(/^\/api/, '')}${requestUrl.search}`;
    const response = await route.fetch({ url: nextUrl });
    await route.fulfill({ response });
  });

  logStep('cost estimate workflow');
  {
    const page = await preparePage(context, draftSnapshot, resultSnapshot, '/?estimate=type');
    await page.waitForSelector('text=Choose the catalyst class before you build the formulation.');
    await captureSelectorSliceFromText(
      page,
      'main > div > div:last-child',
      'Choose the catalyst class before you build the formulation.',
      'screen-cost-estimate-type.png',
      390,
    );
    await page.close();
  }
  {
    const page = await preparePage(context, draftSnapshot, resultSnapshot, '/?estimate=composition');
    await page.setViewportSize({ width: 1500, height: 1800 });
    await waitForAppReady(page);
    await page.waitForSelector('text=Define the catalyst formulation.');
    await captureSelectorSliceFromText(
      page,
      'main > div > div:last-child',
      'Define the catalyst formulation.',
      'screen-cost-estimate-composition.png',
      900,
    );
    await page.close();
  }
  {
    const page = await preparePage(context, draftSnapshot, resultSnapshot, '/?estimate=manufacturing');
    await page.setViewportSize({ width: 1500, height: 1800 });
    await waitForAppReady(page);
    await page.waitForSelector('text=Choose the preparation basis.');
    await captureSelectorSliceFromText(
      page,
      'main > div > div:last-child',
      'Choose the preparation basis.',
      'screen-cost-estimate-preparation.png',
      1180,
    );
    await page.close();
  }

  logStep('cost estimate result handoff');
  {
    const page = await preparePage(context, draftSnapshot, resultSnapshot, '/calculator/result?result=summary');
    await page.waitForTimeout(1200);
    await captureSelectorTopSlice(page, 'main > div > div:last-child', 'screen-cost-estimate-result.png', 860);
    await page.close();
  }

  logStep('result');
  {
    const page = await preparePage(context, draftSnapshot, resultSnapshot, '/calculator/result?result=manufacturing');
    await page.setViewportSize({ width: 1500, height: 2000 });
    await waitForAppReady(page);
    await page.waitForTimeout(1200);
    await captureSelectorSliceFromText(
      page,
      'main > div > div:last-child',
      'Separate route logic from raw inputs.',
      'screen-result.png',
      980,
    );
    await page.close();
  }

  logStep('live metal prices');
  {
    const page = await preparePage(context, draftSnapshot, resultSnapshot, '/prices?feed=quotes');
    await page.waitForSelector('text=Scan the tracked metals');
    await page.locator('button').filter({ hasText: 'Platinum' }).first().click();
    await waitForAppReady(page);
    await captureSelectorBox(page, '.cp-split-workspace > section:first-child', 'screen-live-metal-prices-overview.png');
    await navigateWithinApp(page, '/prices?feed=history');
    await page.waitForSelector('text=Selected Metal');
    await waitForAppReady(page);
    await captureSelectorTopSlice(page, '.cp-split-workspace', 'screen-live-metal-prices-trend.png', 820);
    await page.close();
  }

  logStep('literature benchmarks');
  {
    const page = await preparePage(context, draftSnapshot, resultSnapshot, '/benchmarks?reference=overview');
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /Ammonia decomposition reference family/i }).click();
    await waitForAppReady(page);
    await navigateWithinApp(page, '/benchmarks?reference=routes');
    await page.waitForTimeout(1500);
    await captureSectionByText(page, 'How do these routes compare right now?', 'screen-literature-benchmarks-routes.png');
    await navigateWithinApp(page, '/benchmarks?reference=detail');
    await page.waitForTimeout(1200);
    await captureSelectorTopSlice(page, 'section.surface-card.p-4', 'screen-literature-benchmarks-detail.png', 960);
    await page.close();
  }

  logStep('source library');
  {
    const page = await preparePage(context, draftSnapshot, resultSnapshot, '/library?library=materials');
    await page.waitForSelector('text=Material sources, step rates');
    await captureSelectorTopSlice(page, 'main > div > div:last-child', 'screen-source-library.png', 940);
    await page.close();
  }

  logStep('estimate range');
  {
    const page = await preparePage(context, draftSnapshot, resultSnapshot, '/uncertainty');
    await page.waitForSelector('text=Monte Carlo range around');
    await page.getByRole('button', { name: /Run estimate range/ }).click();
    await page.waitForSelector('text=Percentile-weighted price spread');
    await waitForAppReady(page);
    await page.mouse.move(18, 18);
    await page.waitForTimeout(150);
    await captureSelectorSliceFromText(page, 'main > div > div:last-child', 'Baseline', 'screen-estimate-range.png', 845);
    await page.close();
  }

  logStep('round corners');
  await browser.close();
  roundCorners();
  logStep('done');
  } finally {
    await browser.close();
  }
}

function roundCorners() {
  const pythonExe = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
  const script = path.resolve(process.cwd(), 'scripts', 'round_readme_screens.py');
  const result = spawnSync(pythonExe, [script], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`round_readme_screens.py exited with status ${result.status}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
