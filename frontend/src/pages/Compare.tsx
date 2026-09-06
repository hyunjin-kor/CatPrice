import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '../components/shared/Skeleton';
import { WorkspaceSectionFooter, WorkspaceSectionNav, useWorkspaceSections, type WorkspaceSection } from '../components/shared/WorkspaceSections';
import {
  fetchBenchmarkFamilies,
  fetchDecisionBenchmark,
  type BenchmarkFamilySummary,
  type DecisionBenchmark,
  type DecisionCandidate,
} from '../lib/api';
import {
  saveCalculatorDraft,
  type CalculatorBenchmarkPreset,
  type CalculatorRow,
} from '../lib/calculator-session';
import { formatPrice } from '../lib/format-price';
import { useLang } from '../lib/i18n';
import { useBasis } from '../lib/use-basis';
import { useUnit } from '../lib/use-unit';

type DecisionProfile = 'balanced' | 'cost-first' | 'evidence-first';

const PROFILE_OPTIONS = [
  { id: 'balanced' as const, label: 'Balanced', note: 'Economics, evidence, route, and performance' },
  { id: 'cost-first' as const, label: 'Cost-first', note: 'Bias toward lowest current catalyst cost' },
  { id: 'evidence-first' as const, label: 'Evidence-first', note: 'Reward stronger source transparency and route reproducibility' },
];

const REFERENCE_SECTIONS: WorkspaceSection[] = [
  { id: 'overview', label: 'Overview', summary: 'Choose family and ranking logic.' },
  { id: 'routes', label: 'Candidates', summary: 'Scan the current candidates.' },
  { id: 'detail', label: 'Detail', summary: 'Read the selected route deeply.' },
];

function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function scoreTone(score: number) {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 60) return 'text-[#191f28]';
  return 'text-amber-700';
}

function catalystDomainLabel(domain: 'thermal' | 'electrocatalyst') {
  return domain === 'electrocatalyst' ? 'Electrocatalyst' : 'Thermocatalyst';
}

function applicationFamilyLabel(value: string) {
  if (value === 'fuel_cell') return 'Fuel Cell';
  if (value === 'electrolyzer') return 'Electrolyzer';
  if (value === 'direct_methanol_fuel_cell') return 'DMFC';
  return 'General';
}

function screeningBasisLabel(value: string) {
  const labels: Record<string, string> = {
    literature_architecture_proxy: 'Representative literature composition',
    engineering_proxy: 'Engineering estimate',
    market_plus_vendor_anchor: 'Market price plus vendor quote',
    vendor_stack_anchor: 'Vendor quotes',
    literature_low_loading_plus_vendor_stack: 'Literature low loading plus vendor quotes',
    ru_based_cost_pressure_relief: 'Ru-based cost pressure relief',
  };
  return labels[value] ?? value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function toBenchmarkPreset(candidate: DecisionCandidate): CalculatorBenchmarkPreset {
  return {
    slug: candidate.slug,
    title: candidate.title,
    archetype: candidate.archetype,
    screening_basis: candidate.screening_basis,
    screening_summary: candidate.screening_summary,
    catalyst_domain: candidate.catalyst_domain,
    application_family: candidate.application_family,
    route: candidate.route,
    scores: candidate.scores,
    decision_notes: candidate.decision_notes,
  };
}

function toCalculatorRows(candidate: DecisionCandidate): CalculatorRow[] {
  return candidate.components.map((component) => ({
    id: uid(),
    role: component.role as CalculatorRow['role'],
    name: component.name,
    wt_pct: component.wt_pct,
    price_per_lb: component.price_per_lb,
    source_type: component.source_type === 'live' || component.source_type === 'indexed' ? component.source_type : 'manual',
    source: component.pricing_note || component.source,
  }));
}

function MetricTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="cp-metric-tile">
      <div className="cp-subtle-label">{label}</div>
      <div className="mt-2 text-[clamp(1.35rem,2vw,2rem)] leading-[1.08] font-display text-[#191f28] [overflow-wrap:anywhere]">
        {value}
      </div>
      <div className="mt-1 text-xs leading-5 text-slate-600">{detail}</div>
    </div>
  );
}

export default function Compare() {
  const navigate = useNavigate();
  const { toDisplay, fmtLabel } = useUnit();
  const { lang, t } = useLang();
  const { basis } = useBasis();
  const sectionState = useWorkspaceSections(REFERENCE_SECTIONS, 'reference');
  const { family: familyParam } = useParams();
  const [profile, setProfile] = useState<DecisionProfile>('balanced');
  const [families, setFamilies] = useState<BenchmarkFamilySummary[]>([]);
  const [family, setFamily] = useState(familyParam ?? '');
  const [benchmark, setBenchmark] = useState<DecisionBenchmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  function handleFamilyChange(nextFamily: string) {
    setLoading(true);
    setError('');
    setFamily(nextFamily);
    // Keep the URL shareable: /benchmarks/<family> deep-links back to this view.
    navigate(`/benchmarks/${nextFamily}`, { replace: true });
  }

  function handleProfileChange(nextProfile: DecisionProfile) {
    setLoading(true);
    setError('');
    setProfile(nextProfile);
  }

  useEffect(() => {
    fetchBenchmarkFamilies()
      .then((payload) => {
        if (!payload.families.length) {
          setError('No benchmark families are available.');
          setLoading(false);
          return;
        }
        setFamilies(payload.families);
        setFamily((current) => current || payload.families[0]?.family || '');
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to load literature benchmarks');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!family) return;

    let cancelled = false;
    fetchDecisionBenchmark(family, profile, basis)
      .then((payload) => {
        if (cancelled) return;
        setBenchmark(payload);
        setActiveSlug((current) => current ?? payload.winner?.slug ?? payload.candidates[0]?.slug ?? null);
      })
      .catch((caughtError: unknown) => {
        if (cancelled) return;
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to load literature benchmarks');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [family, profile, basis]);

  const candidates = useMemo(() => benchmark?.candidates ?? [], [benchmark?.candidates]);
  const activeFamily = useMemo(() => families.find((item) => item.family === family) ?? null, [families, family]);
  const activeCandidate = useMemo(
    () => candidates.find((candidate) => candidate.slug === activeSlug) ?? benchmark?.winner ?? null,
    [activeSlug, benchmark?.winner, candidates],
  );

  function benchmarkCostValue(candidate: DecisionCandidate) {
    if (candidate.summary.economics_basis_unit === '$/cm2') return formatPrice(candidate.summary.economics_basis_value);
    return formatPrice(toDisplay(candidate.summary.economics_basis_value));
  }

  function benchmarkCostDetail(candidate: DecisionCandidate) {
    return candidate.summary.economics_basis_unit === '$/cm2' ? '/cm²' : fmtLabel;
  }

  function loadIntoCalculator(candidate: DecisionCandidate) {
    const defaults = candidate.electrode_defaults;
    saveCalculatorDraft({
      rows: toCalculatorRows(candidate),
      steps: candidate.route.steps,
      catalystDomain: candidate.catalyst_domain,
      applicationFamily: candidate.application_family,
      orderSize: Number(candidate.estimate.input_summary.order_size_tons ?? 20),
      pricesUpdatedAt: benchmark?.price_basis_updated_at ?? null,
      electrocatalystConfig: candidate.catalyst_domain === 'electrocatalyst'
        ? {
            catalystMaterialKey: defaults?.catalyst_material_key ?? '',
            ionomerMaterialKey: defaults?.ionomer_material_key ?? '',
            membraneMaterialKey: defaults?.membrane_material_key ?? '',
            substrateMaterialKey: defaults?.substrate_material_key ?? '',
            activeAreaCm2: defaults?.active_area_cm2 ?? 25,
            catalystLoadingMgCm2: defaults?.catalyst_loading_mg_cm2 ?? 0.3,
            ionomerToCatalystRatio: defaults?.ionomer_to_catalyst_ratio ?? 0.8,
            templateId: candidate.route.calculator_template_id ?? 'pem_fuel_cell_ccm',
          }
        : null,
      benchmarkCandidate: toBenchmarkPreset(candidate),
    });
    navigate('/?estimate=composition');
  }

  // Only show the full skeleton on the very first load. Family/profile
  // changes also flip `loading` to true, but if we already have a benchmark
  // it's nicer to leave the current view in place than collapse the page
  // to a skeleton between fetches.
  if (loading && !benchmark) {
    return (
      <section className="surface-card cp-enter overflow-hidden p-6 sm:p-7">
        <div className="cp-subtle-label">{t("Literature Benchmarks")}</div>
        <Skeleton className="mt-3 h-9 w-3/5 max-w-md" />
        <Skeleton className="mt-3 h-3 w-3/4 max-w-xl" />
        <Skeleton className="mt-2 h-3 w-2/3 max-w-lg" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, idx) => (
            <div key={idx} className="rounded-[24px] border border-[rgba(25,31,40,0.07)] bg-[rgba(255,255,255,0.5)] px-4 py-4">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="mt-3 h-6 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-4 h-8 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || !benchmark || !activeCandidate) {
    return <section className="surface-card cp-enter overflow-hidden p-6 sm:p-7"><span className="section-kicker">{t("Literature Benchmarks")}</span><h1 className="cp-heading-xl mt-4">{t("Literature benchmarks are unavailable.")}</h1><p className="cp-body-copy mt-3 max-w-xl">{t(error || 'The selected benchmark family did not return any candidate data.')}</p></section>;
  }

  const winner = benchmark.winner;
  const updatedAt = benchmark.price_basis_updated_at ? new Date(benchmark.price_basis_updated_at).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'Reference basis';

  return (
    <div className="flex flex-col gap-4">
      <WorkspaceSectionNav sections={REFERENCE_SECTIONS} activeSectionId={sectionState.activeSectionId} activeIndex={sectionState.activeIndex} onSelect={sectionState.setActiveSection} />

      {sectionState.activeSection.id === 'overview' ? (
        <section className="surface-card cp-enter overflow-hidden p-5 sm:p-6">
          <div className="grid gap-4">
            <div className="surface-ink overflow-hidden p-5 sm:p-6">
              <h1 className="font-display text-[clamp(1.4rem,2vw,1.8rem)] leading-[1.2] text-white">{t('Literature Benchmarks')}</h1>
              <p className="mt-2 text-sm text-white/60">{t('Screen published routes before you edit the cost estimate.')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeFamily ? <span className="cp-chip-dark">{activeFamily.title}</span> : null}
                {benchmark.reaction ? <span className="cp-chip-dark">{benchmark.reaction}</span> : null}
                <span className="cp-chip-dark">
                  {benchmark.price_basis === 'reference' ? t('Academic basis: monthly averages') : t('Practical basis: live quotes')}
                </span>
                <span className="cp-chip-dark">{t(catalystDomainLabel(benchmark.catalyst_domain))}</span>
                <span className="cp-chip-dark">{t(applicationFamilyLabel(benchmark.application_family))}</span>
                <span className="cp-chip-dark">{t(benchmark.decision_profile.label)}</span>
                <span className="cp-chip-dark">{t('Updated')} {updatedAt}</span>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{benchmark.objective}</p>
              {winner ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="cp-metric-tile-dark"><div className="cp-subtle-label !text-slate-400">{t('Top route')}</div><div className="mt-2 text-xl font-display text-white">{winner.title}</div></div>
                  <div className="cp-metric-tile-dark"><div className="cp-subtle-label !text-slate-400">{t(winner.summary.economics_basis_label)}</div><div className="mt-2 text-xl font-display text-white">{benchmarkCostValue(winner)}</div><div className="mt-1 text-xs text-slate-400">{benchmarkCostDetail(winner)}</div></div>
                  <div className="cp-metric-tile-dark"><div className="cp-subtle-label !text-slate-400">{t('Price evidence')}</div><div className="mt-2 text-xl font-display text-white">{winner.scores.evidence.toFixed(1)}</div></div>
                  <div className="cp-metric-tile-dark"><div className="cp-subtle-label !text-slate-400">{t('Literature bank')}</div><div className="mt-2 text-xl font-display text-white">{benchmark.citations.length}</div><div className="mt-1 text-xs text-slate-400">{t('Public benchmark links in the active reaction family')}</div></div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="surface-ghost p-4">
                <div className="cp-subtle-label">{t('Reaction family')}</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {families.map((option) => (
                    <button type="button" key={option.family} onClick={() => handleFamilyChange(option.family)} className={`rounded-[18px] border px-3 py-2 text-left text-sm transition ${option.family === family ? 'border-[#0d9488] bg-[#e6f5f2] text-[#0f766e]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                      <div className="font-semibold">{option.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">{t(catalystDomainLabel(option.catalyst_domain))} / {t(applicationFamilyLabel(option.application_family))}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="surface-ghost p-4">
                <div className="cp-subtle-label">{t('Ranking profile')}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PROFILE_OPTIONS.map((option) => (
                    <button type="button" key={option.id} onClick={() => handleProfileChange(option.id)} className={`rounded-[18px] border px-3 py-2 text-left text-sm transition ${option.id === profile ? 'border-[#0d9488] bg-[#e6f5f2] text-[#0f766e]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                      <div className="font-semibold">{t(option.label)}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">{t(option.note)}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 text-xs leading-6 text-slate-600">
                  {t('Profiles change weighting only. Candidate records and source links stay fixed.')}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {sectionState.activeSection.id === 'routes' ? (
        <section className="surface-card p-4">
          <div className="flex items-start justify-between gap-3"><div><div className="cp-subtle-label">{t('Published routes')}</div><div className="cp-heading-lg mt-2">{t('How do these routes compare right now?')}</div></div><span className="cp-chip">{lang === 'ko' ? `${candidates.length}개 후보` : `${candidates.length} candidates`}</span></div>
          <div className="mt-4 space-y-3">
            {candidates.map((candidate, index) => (
              <button type="button" key={candidate.slug} onClick={() => { setActiveSlug(candidate.slug); sectionState.setActiveSection('detail'); }} className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${activeCandidate.slug === candidate.slug ? 'border-emerald-200 bg-emerald-50/80' : 'border-slate-900/8 bg-white/64 hover:bg-white/88'}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-[16px] border border-slate-900/8 bg-white/72 text-sm font-semibold text-[#191f28]">{index + 1}</span><div className="min-w-0"><div className="truncate font-semibold text-[#191f28]">{candidate.title}</div><div className="mt-1 text-xs text-slate-600">{candidate.archetype}</div></div></div>
                    <div className="mt-3 text-sm leading-6 text-slate-600">{candidate.screening_summary}</div>
                  </div>
                  <div className="grid shrink-0 gap-2 text-right sm:min-w-[150px]"><div><div className="cp-subtle-label">{t(candidate.summary.economics_basis_label)}</div><div className="mt-2 text-2xl font-display text-[#191f28]">{benchmarkCostValue(candidate)}</div><div className="text-xs text-slate-600">{benchmarkCostDetail(candidate)}</div></div><div className={`text-sm font-semibold ${scoreTone(candidate.scores.total)}`}>{t('Score')} {candidate.scores.total.toFixed(1)}</div></div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {sectionState.activeSection.id === 'detail' ? (
        <section className="surface-card p-4">
          <div className="flex flex-col gap-3 border-b border-slate-900/8 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><div className="cp-subtle-label">{t('Selected reference route')}</div><div className="cp-heading-lg mt-2">{activeCandidate.title}</div><div className="mt-1 text-sm text-slate-600">{activeCandidate.archetype}</div><div className="mt-2 flex flex-wrap gap-2"><span className="cp-chip">{t(catalystDomainLabel(activeCandidate.catalyst_domain))}</span><span className="cp-chip">{t(applicationFamilyLabel(activeCandidate.application_family))}</span></div></div>
            <button type="button" onClick={() => loadIntoCalculator(activeCandidate)} className="cp-button-primary">{t('Load into cost estimate')}</button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile label={t(activeCandidate.summary.economics_basis_label)} value={benchmarkCostValue(activeCandidate)} detail={benchmarkCostDetail(activeCandidate)} />
            <MetricTile label={t('Materials')} value={formatPrice(toDisplay(activeCandidate.summary.materials_cost_per_lb))} detail={t('Raw materials')} />
            <MetricTile label={t('Processing')} value={formatPrice(toDisplay(activeCandidate.summary.processing_cost_per_lb))} detail={t('Step-method operations')} />
            <MetricTile label={t('Route extras')} value={formatPrice(toDisplay(activeCandidate.summary.route_extra_cost_per_lb))} detail={t('QA + activation + route overhead')} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile label={t('Key evidence')} value={String(activeCandidate.literature_basis.length)} detail={t('Direct links supporting the selected route.')} />
            <MetricTile label={t('Literature bank')} value={String(benchmark.citations.length)} detail={t('Higher-level references visible across the reaction family.')} />
            <MetricTile label={t('Composition basis')} value={t(screeningBasisLabel(activeCandidate.screening_basis))} detail={t('How this route is framed in the benchmark set.')} />
            <MetricTile label={t('Ranking profile')} value={t(benchmark.decision_profile.label)} detail={t('Current weighting logic for ranking.')} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)]">
            <div className="space-y-4">
              <div className="surface-ghost p-4">
                <div className="cp-subtle-label">{t('Preparation method')}</div>
                <div className="mt-2 cp-heading-sm">{activeCandidate.route.name}</div>
                <div className="mt-2 text-sm leading-7 text-slate-600">{activeCandidate.route.route_note}</div>
                <div className="mt-3 flex flex-wrap gap-2"><span className="cp-chip">{activeCandidate.route.manufacturing_mode}</span><span className="cp-chip">{activeCandidate.summary.temperature_window_c[0]}-{activeCandidate.summary.temperature_window_c[1]} °C</span><span className="cp-chip">{lang === 'ko' ? t(activeCandidate.summary.scale) : `${activeCandidate.summary.scale} scale`}</span></div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">{([['Preprocess', activeCandidate.route.preprocess], ['Synthesis', activeCandidate.route.synthesis], ['Postprocess', activeCandidate.route.postprocess]] as Array<[string, string[]]>).map(([label, items]) => <div key={label} className="rounded-[22px] border border-slate-900/8 bg-white/64 p-3"><div className="cp-subtle-label">{t(label)}</div><div className="mt-3 space-y-2">{items.map((item) => <div key={item} className="text-sm leading-6 text-slate-700">{item}</div>)}</div></div>)}</div>
              </div>
              <div className="surface-ghost p-4">
                <div className="cp-subtle-label">{t('Reference notes')}</div>
                <div className="mt-3 space-y-2">{activeCandidate.decision_notes.map((note) => <div key={note} className="rounded-[18px] border border-slate-900/8 bg-white/64 px-3 py-2 text-sm leading-6 text-slate-700">{note}</div>)}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="surface-ghost p-4">
                <div className="cp-subtle-label">{t('Key evidence')}</div>
                <div className="mt-3 space-y-3">{activeCandidate.literature_basis.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block rounded-[18px] border border-slate-900/8 bg-white/64 px-3 py-3 transition hover:bg-white"><div className="font-semibold text-[#191f28]">{item.label}</div><div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{item.kind}</div><div className="mt-2 text-sm leading-6 text-slate-600">{item.note}</div></a>)}</div>
              </div>
              <div className="surface-ghost p-4">
                <div className="cp-subtle-label">{t('Family literature bank')}</div>
                <div className="mt-3 space-y-3">{benchmark.citations.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block rounded-[18px] border border-slate-900/8 bg-white/64 px-3 py-3 transition hover:bg-white"><div className="flex flex-wrap items-center gap-2"><div className="font-semibold text-[#191f28]">{item.label}</div><span className="cp-chip">{item.kind}</span></div><div className="mt-2 text-sm leading-6 text-slate-600">{item.note}</div></a>)}</div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <WorkspaceSectionFooter
        activeSection={sectionState.activeSection}
        activeIndex={sectionState.activeIndex}
        totalSections={REFERENCE_SECTIONS.length}
        onPrevious={sectionState.goPrevious}
        onNext={sectionState.goNext}
        canGoPrevious={sectionState.canGoPrevious}
        canGoNext={sectionState.canGoNext}
      />
    </div>
  );
}
