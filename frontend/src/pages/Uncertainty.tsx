import type { ReactNode } from 'react';
import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceSectionFooter, WorkspaceSectionNav, useWorkspaceSections, type WorkspaceSection } from '../components/shared/WorkspaceSections';
import { runEstimateRange, type CostInput, type EstimateRangeResult } from '../lib/api';
import { loadCalculatorDraft, loadCalculatorResultSnapshot, type CalculatorDraft, type CalculatorRow } from '../lib/calculator-session';
import { buildRangeCsv, downloadCsv, rangeCsvFilename } from '../lib/export-csv';
import { formatPrice } from '../lib/format-price';
import { useLang } from '../lib/i18n';
import { stepDisplayLabel } from '../lib/step-labels';
import { useUnit } from '../lib/use-unit';

const EstimateRangeBarChart = lazy(() => import('../components/charts/EstimateRangeBarChart'));

const domainDisplay = (domain: string) =>
  domain === 'electrocatalyst' ? 'Electrocatalyst' : domain === 'thermal' ? 'Thermocatalyst' : domain;
const applicationDisplay = (family: string) =>
  family === 'fuel_cell' ? 'Fuel Cell'
    : family === 'direct_methanol_fuel_cell' ? 'DMFC'
      : family === 'electrolyzer' ? 'Electrolyzer'
        : family === 'general' ? 'General'
          : family;

const RANGE_SECTIONS: WorkspaceSection[] = [
  { id: 'case', label: 'Current Case', summary: 'Use the same inputs as Cost Estimate.' },
  { id: 'range', label: 'Estimate Range', summary: 'Run Monte Carlo around the same catalyst case.' },
];

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="cp-metric-tile">
      <div className="cp-subtle-label">{label}</div>
      <div className="mt-2 text-2xl font-display text-slate-900">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-600">{detail}</div>
    </div>
  );
}

function StatTileDark({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="cp-metric-tile-dark">
      <div className="cp-subtle-label !text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-display text-white">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-400">{detail}</div>
    </div>
  );
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3">
        <span className="cp-subtle-label">{label}</span>
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function ChartFallback() {
  const { t } = useLang();
  return (
    <div className="flex h-full min-h-[280px] items-center justify-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50/80 text-center">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0d9488] border-t-transparent" />
      <div className="text-sm text-slate-600">{t("Loading range chart...")}</div>
    </div>
  );
}

function bandBounds(percent: number): [number, number] {
  const bounded = Math.max(0, percent) / 100;
  return [Math.max(0.01, 1 - bounded), 1 + bounded];
}

function thermalRowSummary(rows: CalculatorRow[], role: 'active_metal' | 'promoter' | 'support') {
  return rows
    .filter((row) => row.role === role && row.name.trim().length > 0 && row.wt_pct > 0)
    .map((row) => `${row.name} ${row.wt_pct.toFixed(1)} wt%`)
    .join(' + ');
}

function thermalSupportSummary(rows: CalculatorRow[]) {
  // A single support row auto-balances at run time; the stored wt% can be
  // stale, so re-derive it the same way the range input builder does.
  const supportRows = rows.filter((row) => row.role === 'support' && row.name.trim().length > 0);
  const onlySupport = supportRows[0];
  if (supportRows.length !== 1 || !onlySupport) return thermalRowSummary(rows, 'support');
  const nonSupportWt = rows
    .filter((row) => row.role !== 'support' && row.name.trim().length > 0 && row.wt_pct > 0)
    .reduce((sum, row) => sum + row.wt_pct, 0);
  const balanced = Math.max(0, 100 - nonSupportWt);
  if (balanced <= 0) return '';
  return `${onlySupport.name} ${balanced.toFixed(1)} wt%`;
}

function describeDraftCase(draft: CalculatorDraft, snapshotComposition: string | null) {
  if (draft.catalystDomain === 'electrocatalyst') {
    return snapshotComposition || 'Current electrocatalyst stack from Cost Estimate';
  }

  const active = thermalRowSummary(draft.rows, 'active_metal');
  const promoters = thermalRowSummary(draft.rows, 'promoter');
  const supports = thermalSupportSummary(draft.rows);

  if (active && supports) {
    return promoters ? `${active} + ${promoters} on ${supports}` : `${active} on ${supports}`;
  }
  return active || supports || snapshotComposition || 'Current thermal catalyst draft';
}

function buildRangeInputFromDraft(draft: CalculatorDraft): CostInput | null {
  if (draft.catalystDomain === 'electrocatalyst') {
    const electro = draft.electrocatalystConfig;
    if (
      !electro
      || !electro.catalystMaterialKey
      || !electro.ionomerMaterialKey
      || !electro.membraneMaterialKey
      || !electro.substrateMaterialKey
    ) {
      return null;
    }

    return {
      catalyst_domain: 'electrocatalyst',
      application_family: draft.applicationFamily ?? 'general',
      template_id: electro.templateId || undefined,
      order_size_tons: draft.orderSize,
      steps: draft.steps,
      components: [{
        role: 'active_catalyst',
        material_key: electro.catalystMaterialKey,
        wt_pct: 100,
        name: 'Electrocatalyst powder',
      }],
      electrode_input: {
        application_family: draft.applicationFamily ?? 'general',
        catalyst_material_key: electro.catalystMaterialKey,
        ionomer_material_key: electro.ionomerMaterialKey,
        membrane_material_key: electro.membraneMaterialKey,
        substrate_material_key: electro.substrateMaterialKey,
        active_area_cm2: electro.activeAreaCm2,
        catalyst_loading_mg_cm2: electro.catalystLoadingMgCm2,
        ionomer_to_catalyst_ratio: electro.ionomerToCatalystRatio,
      },
    };
  }

  const thermalRows = draft.rows.filter((row) =>
    (row.role === 'active_metal' || row.role === 'promoter' || row.role === 'support')
  );
  const supportRows = thermalRows.filter((row) => row.role === 'support');
  const nonSupportRows = thermalRows.filter((row) => row.role !== 'support');
  const supportIsSplit = supportRows.length > 1;
  const completedNonSupportRows = nonSupportRows.filter((row) => row.name.trim().length > 0 && row.wt_pct > 0);
  const nonSupportWt = completedNonSupportRows.reduce((sum, row) => sum + row.wt_pct, 0);
  const supportWtPct = Math.max(0, 100 - nonSupportWt);
  const completedSupportRows = supportRows.filter((row) => supportIsSplit
    ? row.name.trim().length > 0 && row.wt_pct > 0
    : row.name.trim().length > 0);

  if (completedNonSupportRows.length === 0 || completedSupportRows.length === 0) return null;
  if (!supportIsSplit && supportWtPct <= 0) return null;
  if (supportIsSplit) {
    const totalWt = completedNonSupportRows.reduce((sum, row) => sum + row.wt_pct, 0)
      + completedSupportRows.reduce((sum, row) => sum + row.wt_pct, 0);
    if (Math.abs(totalWt - 100) > 0.05) return null;
  }

  const components = [
    ...completedNonSupportRows.map((row) => ({
      role: row.role,
      name: row.name,
      material_key: row.source_type === 'manual' ? undefined : row.material_key ?? undefined,
      wt_pct: row.wt_pct,
      price_per_lb: row.source_type === 'manual' || !row.material_key ? row.price_per_lb : undefined,
    })),
    ...completedSupportRows.map((row, index) => ({
      role: 'support' as const,
      name: row.name,
      material_key: row.source_type === 'manual' ? undefined : row.material_key ?? undefined,
      wt_pct: supportIsSplit ? row.wt_pct : index === 0 ? supportWtPct : 0,
      price_per_lb: row.source_type === 'manual' || !row.material_key ? row.price_per_lb : undefined,
    })).filter((row) => row.wt_pct > 0),
  ];

  return {
    catalyst_domain: 'thermal',
    application_family: draft.applicationFamily ?? 'general',
    order_size_tons: draft.orderSize,
    steps: draft.steps,
    include_spent_value: draft.includeSpentValue ?? false,
    reactor_type: draft.reactorType ?? 'fixed',
    catalyst_bulk_density: draft.catalystBulkDensity ?? 50,
    components,
  };
}

export default function Uncertainty() {
  const navigate = useNavigate();
  const { toDisplay, fmtLabel } = useUnit();
  const { lang, t } = useLang();
  const draft = loadCalculatorDraft();
  const latestSnapshot = loadCalculatorResultSnapshot();
  const {
    activeSection,
    activeSectionId,
    activeIndex,
    canGoNext,
    canGoPrevious,
    goNext,
    goPrevious,
    setActiveSection,
  } = useWorkspaceSections(RANGE_SECTIONS, 'estimate-range');
  const [result, setResult] = useState<EstimateRangeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nSim, setNSim] = useState(1000);
  const [activeBandPct, setActiveBandPct] = useState(30);
  const [promoterBandPct, setPromoterBandPct] = useState(20);
  const [supportBandPct, setSupportBandPct] = useState(20);
  const [adjunctBandPct, setAdjunctBandPct] = useState(15);
  const [orderBandPct, setOrderBandPct] = useState(20);

  const calculationInput = draft ? buildRangeInputFromDraft(draft) : null;
  const canRun = calculationInput !== null && draft !== null && draft.steps.length > 0;
  const snapshotComposition =
    latestSnapshot && draft && latestSnapshot.result.input_summary.catalyst_domain === draft.catalystDomain
      ? String(latestSnapshot.result.input_summary.composition ?? '')
      : null;
  const caseSummary = draft ? describeDraftCase(draft, snapshotComposition) : 'No current Cost Estimate draft';
  // Chart x-axis bar labels — shared graded price formatting without the
  // leading "$" so labels stay compact.
  const fmtBound = (v: number) => formatPrice(v).slice(1);
  const histData = result
    ? [
        { range: `${fmtBound(toDisplay(result.min))}-${fmtBound(toDisplay(result.p5))}`, value: 5, fill: '#4e5968' },
        { range: `${fmtBound(toDisplay(result.p5))}-${fmtBound(toDisplay(result.p25))}`, value: 20, fill: '#0d9488' },
        { range: `${fmtBound(toDisplay(result.p25))}-${fmtBound(toDisplay(result.median))}`, value: 25, fill: '#0d9488' },
        { range: `${fmtBound(toDisplay(result.median))}-${fmtBound(toDisplay(result.p75))}`, value: 25, fill: '#0d9488' },
        { range: `${fmtBound(toDisplay(result.p75))}-${fmtBound(toDisplay(result.p95))}`, value: 20, fill: '#0d9488' },
        { range: `${fmtBound(toDisplay(result.p95))}-${fmtBound(toDisplay(result.max))}`, value: 5, fill: '#4e5968' },
      ]
    : [];

  async function handleRun() {
    if (!calculationInput || !draft) return;
    setLoading(true);
    setError('');

    try {
      const nextResult = await runEstimateRange(calculationInput, nSim, {
        active_component_price: bandBounds(activeBandPct),
        promoter_price: bandBounds(promoterBandPct),
        support_price: bandBounds(supportBandPct),
        electrode_adjunct_price: bandBounds(adjunctBandPct),
        order_size_tons: bandBounds(orderBandPct),
      });
      setResult(nextResult);
      setActiveSection('range');
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Range analysis failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <WorkspaceSectionNav
        sections={RANGE_SECTIONS}
        activeSectionId={activeSectionId}
        activeIndex={activeIndex}
        onSelect={setActiveSection}
      />

      {activeSection.id === 'case' ? (
        <section className="surface-card cp-enter overflow-hidden px-5 py-6 sm:px-6" style={{ animationDelay: '0.06s' }}>
          <div className="border-b border-slate-900/8 pb-5">
            <h2 className="cp-heading-xl">{t('Estimate Range')}</h2>
            <p className="cp-body-copy mt-1.5 max-w-2xl">
              {t('Monte Carlo range around the current Cost Estimate inputs. Edit the catalyst there, then run the range here.')}
            </p>
          </div>

          {!draft || !canRun ? (
            <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50/80 px-5 py-5 text-sm text-amber-900">
              <div className="font-semibold">{t('No complete Cost Estimate inputs are ready.')}</div>
              <div className="mt-2 leading-6">
                {t('Build the catalyst case first, then come back here to quantify the price range around that same case.')}
              </div>
              <button onClick={() => navigate('/')} className="cp-button-secondary mt-4 px-4 py-2">
                {t('Open Cost Estimate')}
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <div className="rounded-[22px] border border-slate-200 bg-white/78 px-4 py-4">
                  <div className="cp-subtle-label">{t('Current case')}</div>
                  <div className="mt-2 text-base font-semibold text-[#191f28]">{caseSummary}</div>
                  <div className="mt-1 text-xs leading-6 text-slate-600">
                    {draft.catalystDomain === 'electrocatalyst' ? t('Electrocatalyst assembly') : t('Thermocatalyst formulation')}
                  </div>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-white/78 px-4 py-4">
                  <div className="cp-subtle-label">{t('Preparation basis')}</div>
                  <div className="mt-2 text-base font-semibold text-[#191f28]">{lang === 'ko' ? `제조 단계 ${draft.steps.length}개` : `${draft.steps.length} unit operation${draft.steps.length === 1 ? '' : 's'}`}</div>
                  <div className="mt-1 text-xs leading-6 text-slate-600">{draft.steps.map((key) => t(stepDisplayLabel(key))).join(', ') || t('No preparation steps selected')}</div>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-white/78 px-4 py-4">
                  <div className="cp-subtle-label">{t('Production scale')}</div>
                  <div className="mt-2 text-base font-semibold text-[#191f28]">{lang === 'ko' ? `${draft.orderSize}톤` : `${draft.orderSize} tons`}</div>
                  <div className="mt-1 text-xs leading-6 text-slate-600">
                    {t(applicationDisplay(draft.applicationFamily ?? 'general'))} / {t(domainDisplay(draft.catalystDomain))}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FieldBlock label={t('Simulation count')} hint={lang === 'ko' ? '100~10000' : '100 to 10000'}>
                  <input
                    type="number"
                    step="100"
                    min="100"
                    max="10000"
                    value={nSim}
                    onChange={(event) => setNSim(Number(event.target.value))}
                    className="input-base font-mono"
                  />
                </FieldBlock>

                <FieldBlock label={draft.catalystDomain === 'electrocatalyst' ? t('Catalyst powder band') : t('Active metal band')} hint="+/- %">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={activeBandPct}
                    onChange={(event) => setActiveBandPct(Number(event.target.value))}
                    className="input-base font-mono"
                  />
                </FieldBlock>

                {draft.catalystDomain === 'thermal' ? (
                  <>
                    <FieldBlock label={t('Promoter band')} hint="+/- %">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={promoterBandPct}
                        onChange={(event) => setPromoterBandPct(Number(event.target.value))}
                        className="input-base font-mono"
                      />
                    </FieldBlock>
                    <FieldBlock label={t('Support band')} hint="+/- %">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={supportBandPct}
                        onChange={(event) => setSupportBandPct(Number(event.target.value))}
                        className="input-base font-mono"
                      />
                    </FieldBlock>
                  </>
                ) : (
                  <FieldBlock label={t('Ionomer / membrane / GDL band')} hint="+/- %">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={adjunctBandPct}
                      onChange={(event) => setAdjunctBandPct(Number(event.target.value))}
                      className="input-base font-mono"
                    />
                  </FieldBlock>
                )}

                <FieldBlock label={t('Production scale band')} hint="+/- %">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={orderBandPct}
                    onChange={(event) => setOrderBandPct(Number(event.target.value))}
                    className="input-base font-mono"
                  />
                </FieldBlock>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="cp-metric-tile">
                  <div className="cp-subtle-label">{t('Baseline source')}</div>
                  <div className="mt-2 text-lg font-semibold text-[#191f28]">{t('Current Cost Estimate inputs')}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">{t('No separate metal-only form is used here anymore.')}</div>
                </div>
                <div className="cp-metric-tile">
                  <div className="cp-subtle-label">{t('What moves')}</div>
                  <div className="mt-2 text-lg font-semibold text-[#191f28]">
                    {draft.catalystDomain === 'electrocatalyst' ? t('Catalyst + adjunct prices') : t('Active, promoter, and support prices')}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">{t('The same case is re-run under sampled price and scale perturbations.')}</div>
                </div>
                <div className="cp-metric-tile">
                  <div className="cp-subtle-label">{t('Interpretation')}</div>
                  <div className="mt-2 text-lg font-semibold text-[#191f28]">{t('Estimate spread, not a new formulation')}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">{t('Use this to read cost confidence around the existing route.')}</div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button onClick={handleRun} disabled={loading} className="cp-button-primary min-w-[240px]">
                  {loading ? (
                    <>
                      <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                      {t('Running estimate range')}
                    </>
                  ) : (
                    `${t('Run estimate range')} (${nSim.toLocaleString('en-US')})`
                  )}
                </button>

                <button onClick={() => navigate('/')} className="cp-button-secondary px-4 py-2">
                  {t('Edit in Cost Estimate')}
                </button>
              </div>

              {error ? (
                <div className="mt-4 rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">{t(error)}</div>
              ) : null}
            </>
          )}
        </section>
      ) : (
        <section className="surface-card cp-enter overflow-hidden px-5 py-6 sm:px-6" style={{ animationDelay: '0.1s' }}>
          {!result ? (
            <div className="flex min-h-[420px] flex-col justify-between">
              <div>
                <span className="section-kicker">{t('Estimate Range')}</span>
                <h2 className="cp-heading-xl mt-4">{t('Run the current case to reveal the price spread.')}</h2>
                <p className="cp-body-copy mt-3 max-w-xl">
                  {t('This result uses the same catalyst inputs and preparation route from Cost Estimate.')}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile label={t('Baseline')} value={t('Pending')} detail={t('Current estimate')} />
                <StatTile label={t('Mean')} value={t('Pending')} detail={t('Average simulated value')} />
                <StatTile label="P5-P95" value={t('Pending')} detail={t('90% interval')} />
              </div>
            </div>
          ) : (
            <>
              <div className="surface-ink overflow-hidden p-5">
                <div className="grid gap-3 sm:grid-cols-4">
                  <StatTileDark label={t('Baseline')} value={`${formatPrice(toDisplay(result.baseline_price_per_lb))}${fmtLabel}`} detail={t('Current estimate')} />
                  <StatTileDark label={t('Mean')} value={`${formatPrice(toDisplay(result.mean))}${fmtLabel}`} detail={t('Average outcome')} />
                  <StatTileDark label={t('Median')} value={`${formatPrice(toDisplay(result.median))}${fmtLabel}`} detail={t('50th percentile')} />
                  <StatTileDark
                    label="P5-P95"
                    value={`${formatPrice(toDisplay(result.p5))}-${formatPrice(toDisplay(result.p95))}`}
                    detail={lang === 'ko' ? `성공한 실행 ${result.n_successful.toLocaleString('en-US')}회` : `${result.n_successful.toLocaleString('en-US')} successful runs`}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <div className="rounded-[22px] border border-slate-200 bg-white/78 px-4 py-4">
                  <div className="cp-subtle-label">{t('Case')}</div>
                  <div className="mt-2 text-base font-semibold text-[#191f28]">{result.composition}</div>
                  <div className="mt-1 text-xs leading-6 text-slate-600">
                    {t(domainDisplay(result.catalyst_domain))} / {t(applicationDisplay(result.application_family))}
                  </div>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-white/78 px-4 py-4">
                  <div className="cp-subtle-label">{t('Range width')}</div>
                  <div className="mt-2 text-base font-semibold text-[#191f28]">
                    {formatPrice(toDisplay(result.p95 - result.p5))}{fmtLabel}
                  </div>
                  <div className="mt-1 text-xs leading-6 text-slate-600">{t('P95 minus P5')}</div>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-white/78 px-4 py-4">
                  <div className="cp-subtle-label">{t('Std dev')}</div>
                  <div className="mt-2 text-base font-semibold text-[#191f28]">
                    {formatPrice(toDisplay(result.std))}{fmtLabel}
                  </div>
                  <div className="mt-1 text-xs leading-6 text-slate-600">{t('Distribution spread')}</div>
                </div>
              </div>

              <div className="mt-5 rounded-[28px] border border-slate-900/8 bg-white/62 p-5 backdrop-blur-xl">
                <div className="cp-subtle-label">{t('Simulated distribution')}</div>
                <div className="cp-heading-lg mt-2">{t('Percentile-weighted price spread')}</div>

                <div className="mt-5 h-[280px]">
                  <Suspense fallback={<ChartFallback />}>
                    <EstimateRangeBarChart data={histData} />
                  </Suspense>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-7">
                {[
                  [t('Min'), result.min],
                  ['P5', result.p5],
                  ['P25', result.p25],
                  [t('Median'), result.median],
                  ['P75', result.p75],
                  ['P95', result.p95],
                  [t('Max'), result.max],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-[22px] border border-slate-900/8 bg-white/62 px-3 py-4 text-center">
                    <div className="cp-subtle-label">{label}</div>
                    <div className="mt-2 font-mono text-sm text-[#191f28]">{formatPrice(toDisplay(Number(value)))}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <button
                  onClick={() => downloadCsv(rangeCsvFilename(result), buildRangeCsv(result))}
                  className="cp-button-secondary px-4 py-2"
                >
                  {t('Export CSV')}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <WorkspaceSectionFooter
        activeSection={activeSection}
        activeIndex={activeIndex}
        totalSections={RANGE_SECTIONS.length}
        onPrevious={goPrevious}
        onNext={goNext}
        canGoPrevious={canGoPrevious}
        canGoNext={activeSection.id === 'case' ? canRun : canGoNext}
      />
    </div>
  );
}
