import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FitPriceText } from '../components/shared/FitPriceText';
import { WorkspaceSectionFooter, WorkspaceSectionNav, useWorkspaceSections, type WorkspaceSection } from '../components/shared/WorkspaceSections';
import {
  type ApplicationFamily,
  type CatalystDomain,
  calculateCost,
  deleteSavedEstimate,
  fetchSavedEstimate,
  fetchSavedEstimates,
  fetchThermalCompositionOptions,
  fetchMaterials,
  fetchPrices,
  fetchTemplateCosts,
  fetchTemplates,
  refreshPrices as refreshPriceFeed,
  type ComponentInput,
  type CostInput,
  type SavedEstimateSummary,
  type MaterialItem,
  type MetalPrice,
  type ProcessTemplate,
  type TemplateCost,
  type ThermalCompositionOption,
  type ThermalCompositionOptions,
} from '../lib/api';
import {
  loadCalculatorDraft,
  loadCalculatorResultSnapshot,
  saveCalculatorDraft,
  saveCalculatorResultSnapshot,
  type CalculatorBenchmarkPreset,
  type CalculatorResultSnapshot,
  type CalculatorRow,
} from '../lib/calculator-session';
import { formatPrice } from '../lib/format-price';
import { compareElectroPreference } from '../lib/electrode-defaults';
import { matchThermalTemplate, sameSteps } from '../lib/preparation-selection';
import { useLang } from '../lib/i18n';
import { LB_PER_KG, TROY_OZ_PER_LB } from '../lib/unit-conversion';
import { useBasis } from '../lib/use-basis';
import { useUnit } from '../lib/use-unit';


const THERMAL_WT_TOLERANCE = 0.05;
const QUICK_ORDER_SIZES = [2, 20, 200];
const DEFAULT_STEPS = ['mixer_slurry', 'incipient_wetness', 'dryer_rotary_100_300C'];
const ALL_STEPS = [
  { key: 'mixer_dry_blender', label: 'Dry Blender', category: 'Mixing', scales: ['small', 'medium', 'large'] },
  { key: 'mixer_slurry', label: 'Slurry Mixer', category: 'Mixing', scales: ['small', 'medium', 'large'] },
  { key: 'ionomer_ink_homogenization', label: 'Ionomer Ink Homogenization', category: 'Mixing', scales: ['small', 'medium', 'large'] },
  { key: 'ultrasonic_dispersion', label: 'Ultrasonic Dispersion', category: 'Mixing', scales: ['small', 'medium', 'large'] },
  { key: 'incipient_wetness', label: 'Incipient Wetness', category: 'Impregnation', scales: ['small', 'medium', 'large'] },
  { key: 'ccm_coating_pass', label: 'CCM Coating Pass', category: 'Impregnation', scales: ['small', 'medium', 'large'] },
  { key: 'reactor_simple', label: 'Simple Reactor', category: 'Reaction', scales: ['small', 'medium', 'large'] },
  { key: 'reactor_multistep', label: 'Multistep Reactor', category: 'Reaction', scales: ['small', 'medium', 'large'] },
  { key: 'membrane_pretreatment', label: 'Membrane Pretreatment', category: 'Reaction', scales: ['small', 'medium', 'large'] },
  { key: 'substrate_pretreatment', label: 'Substrate Pretreatment', category: 'Reaction', scales: ['small', 'medium', 'large'] },
  { key: 'ion_exchange_conversion', label: 'Ion-Exchange Conversion', category: 'Reaction', scales: ['small', 'medium', 'large'] },
  { key: 'electrochemical_break_in', label: 'Electrochemical Break-In', category: 'Reaction', scales: ['small', 'medium', 'large'] },
  { key: 'crystallizer', label: 'Crystallizer', category: 'Reaction', scales: ['small', 'medium', 'large'] },
  { key: 'dryer_batch_vacuum_tray', label: 'Vacuum Tray Dryer', category: 'Drying', scales: ['small'] },
  { key: 'dryer_rotary_40_100C', label: 'Rotary Dryer 40-100 C', category: 'Drying', scales: ['small', 'medium', 'large'] },
  { key: 'dryer_rotary_100_300C', label: 'Rotary Dryer 100-300 C', category: 'Drying', scales: ['small', 'medium', 'large'] },
  { key: 'electrode_drying_low_temp', label: 'Electrode Drying <100 C', category: 'Drying', scales: ['small', 'medium', 'large'] },
  { key: 'dryer_spray', label: 'Spray Dryer', category: 'Drying', scales: ['medium', 'large'] },
  { key: 'kiln_batch', label: 'Batch Kiln', category: 'Calcination', scales: ['small'] },
  { key: 'kiln_continuous_direct', label: 'Continuous Kiln Direct', category: 'Calcination', scales: ['medium', 'large'] },
  { key: 'kiln_continuous_indirect', label: 'Continuous Kiln Indirect', category: 'Calcination', scales: ['medium', 'large'] },
  { key: 'filter_belt_vacuum', label: 'Belt Vacuum Filter', category: 'Separation', scales: ['small', 'medium', 'large'] },
  { key: 'filter_plate_frame', label: 'Plate and Frame Filter', category: 'Separation', scales: ['small'] },
  { key: 'filter_rotary_vacuum', label: 'Rotary Vacuum Filter', category: 'Separation', scales: ['medium', 'large'] },
  { key: 'extruder_with_feeder', label: 'Extruder with Feeder', category: 'Forming', scales: ['small', 'medium', 'large'] },
  { key: 'hot_press_lamination', label: 'Hot Press Lamination', category: 'Forming', scales: ['small', 'medium', 'large'] },
  { key: 'ball_forming', label: 'Ball Forming', category: 'Forming', scales: ['small', 'medium'] },
  { key: 'mill', label: 'Mill', category: 'Size Reduction', scales: ['small', 'medium', 'large'] },
  { key: 'flare', label: 'Flare', category: 'Utilities', scales: ['small', 'medium', 'large'] },
  { key: 'scrubber_nox', label: 'NOx Scrubber', category: 'Utilities', scales: ['small', 'medium', 'large'] },
] as const;
// MEA-proxy operations only meaningful for electrode workflows; hidden in the
// thermal bucket view so oxide-catalyst routes are not cluttered with them.
const ELECTRO_ONLY_STEPS = new Set([
  'ionomer_ink_homogenization',
  'ultrasonic_dispersion',
  'ccm_coating_pass',
  'membrane_pretreatment',
  'substrate_pretreatment',
  'ion_exchange_conversion',
  'electrochemical_break_in',
  'electrode_drying_low_temp',
  'hot_press_lamination',
]);
const ELECTRO_APPLICATION_OPTIONS: Array<{ value: ApplicationFamily; label: string; detail: string }> = [
  { value: 'fuel_cell', label: 'Fuel Cell', detail: 'PEMFC and hydrogen-air MEA / CCM routes.' },
  { value: 'electrolyzer', label: 'Electrolyzer', detail: 'PEM water electrolysis catalyst and membrane routes.' },
  { value: 'direct_methanol_fuel_cell', label: 'DMFC', detail: 'PtRu-centered methanol oxidation routes.' },
  { value: 'general', label: 'General', detail: 'Use when the application family is still undecided.' },
];
const ESTIMATE_SECTIONS: WorkspaceSection[] = [
  { id: 'type', label: 'Catalyst Type', summary: 'Choose thermocatalyst or electrocatalyst.' },
  { id: 'composition', label: 'Composition', summary: 'Set the formulation or the electrode assembly.' },
  { id: 'manufacturing', label: 'Preparation Method', summary: 'Set production scale and preparation steps.' },
  { id: 'result', label: 'Result', summary: 'Run the estimate and open the result screen.' },
];

type SourceType = CalculatorRow['source_type'];
type Scale = 'small' | 'medium' | 'large';
type FeedPrice = { price_per_lb: number; source_type: Exclude<SourceType, 'manual'>; source: string };
type ThermalSelectionOption = {
  selection_key: string;
  material_key?: string | null;
  name: string;
  display_name: string;
  label: string;
  symbol: string | null;
  formula: string | null;
  category: string;
  price_per_lb: number;
  price_scope?: string | null;
  source_type: SourceType;
  source: string;
  option_kind: 'live' | 'library';
};
type ElectrocatalystDraft = {
  catalystMaterialKey: string;
  ionomerMaterialKey: string;
  membraneMaterialKey: string;
  substrateMaterialKey: string;
  activeAreaCm2: number;
  catalystLoadingMgCm2: number;
  ionomerToCatalystRatio: number;
  templateId: string;
  manufacturingScenario: '' | 'rnd_batch' | 'pilot_roll_to_roll';
};

function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

const toPerLb = (price: number, unit: string) => unit === '$/troy_oz' ? price * TROY_OZ_PER_LB : unit === '$/kg' ? price / LB_PER_KG : price;
const getScale = (tons: number): Scale => (tons < 5 ? 'small' : tons < 70 ? 'medium' : 'large');
const sourceTypeLabel = (sourceType: SourceType) => sourceType === 'live' ? 'Live' : sourceType === 'indexed' ? 'Indexed' : 'Manual';
const sourceTone = (sourceType: SourceType) => sourceType === 'live' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : sourceType === 'indexed' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600';
const priceTone = (sourceType: SourceType) => sourceType === 'live' ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800' : sourceType === 'indexed' ? 'border-amber-200 bg-amber-50/70 text-amber-800' : '';
const scaleMeta = (scale: Scale) => scale === 'small' ? { label: 'Small', rate: '1 t/day', classes: 'border-violet-200 bg-violet-50 text-violet-700' } : scale === 'medium' ? { label: 'Medium', rate: '10 t/day', classes: 'border-sky-200 bg-sky-50 text-sky-700' } : { label: 'Large', rate: '150 t/day', classes: 'border-[#0d9488] bg-[#e6f5f2] text-[#0f766e]' };
const formatStepLabel = (stepKey: string) => ALL_STEPS.find((step) => step.key === stepKey)?.label ?? stepKey;
const catalystDomainLabel = (domain: Extract<CatalystDomain, 'thermal' | 'electrocatalyst'>) => domain === 'electrocatalyst' ? 'Electrocatalyst' : 'Thermocatalyst';
const defaultElectrocatalystConfig = (): ElectrocatalystDraft => ({
  catalystMaterialKey: '',
  ionomerMaterialKey: '',
  membraneMaterialKey: '',
  substrateMaterialKey: '',
  activeAreaCm2: 25,
  catalystLoadingMgCm2: 0.5,
  ionomerToCatalystRatio: 0.8,
  templateId: 'pem_fuel_cell_ccm',
  manufacturingScenario: '',
});

function createBlankRow(role: CalculatorRow['role'], wtPct = 0): CalculatorRow {
  return {
    id: uid(),
    role,
    name: '',
    material_key: null,
    symbol: null,
    selection_key: null,
    wt_pct: wtPct,
    price_per_lb: 0,
    source_type: 'manual',
    source: 'Manual input',
  };
}

function buildLiveMetalOption(price: MetalPrice): ThermalSelectionOption {
  return {
    selection_key: `live:${price.symbol}`,
    material_key: null,
    name: price.symbol,
    display_name: price.symbol,
    label: `${price.symbol} | ${price.name} | ${price.source}`,
    symbol: price.symbol,
    formula: price.symbol,
    category: 'Live metal price',
    price_per_lb: toPerLb(price.price, price.unit),
    price_scope: 'live',
    source_type: price.source_type,
    source: price.source,
    option_kind: 'live',
  };
}

function buildLibraryThermalOption(option: ThermalCompositionOption): ThermalSelectionOption {
  return {
    selection_key: option.selection_key,
    material_key: option.material_key,
    name: option.name,
    display_name: option.display_name,
    label: option.label,
    symbol: option.symbol,
    formula: option.formula,
    category: option.category,
    price_per_lb: option.price_per_lb,
    price_scope: option.price_scope,
    source_type: option.source_type,
    source: option.quote_source || 'Library',
    option_kind: 'library',
  };
}

function thermalScopeRank(scope?: string | null) {
  switch (scope) {
    case 'live':
      return 0;
    case 'literature_high_volume':
      return 1;
    case 'historical_bulk':
      return 2;
    case 'vendor_lab':
      return 3;
    default:
      return 4;
  }
}

function preferThermalOption(next: ThermalSelectionOption, current: ThermalSelectionOption) {
  const scopeDelta = thermalScopeRank(next.price_scope) - thermalScopeRank(current.price_scope);
  if (scopeDelta !== 0) return scopeDelta < 0;
  const nextDisplay = next.display_name.toLowerCase();
  const currentDisplay = current.display_name.toLowerCase();
  if (nextDisplay !== currentDisplay) return nextDisplay < currentDisplay;
  return next.name.toLowerCase() < current.name.toLowerCase();
}

function dedupeThermalOptions(options: ThermalSelectionOption[]) {
  const unique = new Map<string, ThermalSelectionOption>();
  for (const option of options) {
    const key = option.display_name.trim().toLowerCase();
    const current = unique.get(key);
    if (!current || preferThermalOption(option, current)) {
      unique.set(key, option);
    }
  }
  return [...unique.values()].sort((left, right) => left.display_name.localeCompare(right.display_name));
}

function compactThermalOptionLabel(option: ThermalSelectionOption, lang: 'en' | 'ko' = 'en') {
  // Research-pack vendor quotes can sit orders of magnitude above bulk
  // indexes (e.g. lab ZSM-5 at ~$474/kg vs the ~$4/kg trade statistic), so
  // flag them right in the selector instead of only in the price field.
  if (option.price_scope === 'vendor_lab') return `${option.display_name} ${lang === 'ko' ? '(실험실 소포장)' : '(lab price)'}`;
  return option.display_name;
}

function selectedStepKeysForCategory(category: string, activeSteps: string[]) {
  const categoryKeys = new Set<string>(
    ALL_STEPS.filter((step) => step.category === category).map((step) => step.key),
  );
  return activeSteps.filter((stepKey) => categoryKeys.has(stepKey));
}

function createRowFromOption(
  role: 'active_metal' | 'promoter' | 'support',
  option: ThermalSelectionOption,
  wtPct: number,
): CalculatorRow {
  return {
    id: uid(),
    role,
    name: option.display_name,
    material_key: option.material_key ?? null,
    symbol: option.symbol,
    selection_key: option.selection_key,
    wt_pct: wtPct,
    price_per_lb: option.price_per_lb,
    source_type: option.source_type,
    source: option.source,
  };
}

function applyOptionToRow(
  row: CalculatorRow,
  option: ThermalSelectionOption,
  preserveManualPrice = false,
): CalculatorRow {
  return {
    ...row,
    name: option.display_name,
    material_key: option.material_key ?? null,
    symbol: option.symbol,
    selection_key: option.selection_key,
    price_per_lb: preserveManualPrice ? row.price_per_lb : option.price_per_lb,
    source_type: preserveManualPrice ? 'manual' : option.source_type,
    source: preserveManualPrice ? 'Manual input' : option.source,
  };
}

function defaultSupportOption(options: ThermalSelectionOption[]): ThermalSelectionOption | null {
  return options.find((option) => option.display_name === 'Al2O3')
    ?? options.find((option) => option.name.toLowerCase().includes('alumina'))
    ?? options[0]
    ?? null;
}

function defaultRows(
  liveOptions: ThermalSelectionOption[] = [],
  supportOptions: ThermalSelectionOption[] = [],
): CalculatorRow[] {
  const liveNi = liveOptions.find((option) => option.display_name === 'Ni') ?? liveOptions[0] ?? null;
  const support = defaultSupportOption(supportOptions);
  return [
    liveNi ? createRowFromOption('active_metal', liveNi, 20) : createBlankRow('active_metal', 20),
    support ? createRowFromOption('support', support, 80) : createBlankRow('support', 80),
  ];
}

function matchesOption(row: CalculatorRow, option: ThermalSelectionOption) {
  const rowName = row.name.trim().toLowerCase();
  return (
    (row.selection_key && row.selection_key === option.selection_key)
    || (row.material_key && row.material_key === option.material_key)
    || (!!rowName && [option.display_name, option.name, option.symbol ?? '', option.formula ?? '']
      .filter(Boolean)
      .some((value) => value.trim().toLowerCase() === rowName))
  );
}

function ensureThermalRows(
  rows: CalculatorRow[],
  liveOptions: ThermalSelectionOption[] = [],
  supportOptions: ThermalSelectionOption[] = [],
) {
  const thermalRows = rows.filter((row) => row.role === 'active_metal' || row.role === 'promoter' || row.role === 'support');
  const hydratedRows = thermalRows.map((row) => {
    const options = row.role === 'support' ? supportOptions : liveOptions;
    const option = options.find((candidate) => matchesOption(row, candidate));
    if (!option) return row;
    return applyOptionToRow(row, option, row.source_type === 'manual' && row.price_per_lb > 0);
  });
  const hasActiveMetal = hydratedRows.some((row) => row.role === 'active_metal');
  const supportCount = hydratedRows.filter((row) => row.role === 'support').length;
  const hasNamedSupport = hydratedRows.some((row) => row.role === 'support' && hasNamedRow(row));
  if (!hasActiveMetal) return defaultRows(liveOptions, supportOptions);
  if (supportCount === 0) {
    const support = defaultSupportOption(supportOptions);
    return [...hydratedRows, support ? createRowFromOption('support', support, 80) : createBlankRow('support', 80)];
  }
  if (!hasNamedSupport) {
    const support = defaultSupportOption(supportOptions);
    if (!support) return hydratedRows;
    let filled = false;
    return hydratedRows.map((row) => {
      if (row.role !== 'support' || filled) return row;
      filled = true;
      return applyOptionToRow(row, support);
    });
  }
  return hydratedRows;
}

function hasNamedRow(row: CalculatorRow) {
  return row.name.trim().length > 0;
}

function isCompletedThermalRow(row: CalculatorRow) {
  return hasNamedRow(row) && row.wt_pct > 0;
}

function isIncompleteThermalRow(row: CalculatorRow) {
  const hasName = hasNamedRow(row);
  const hasWeight = row.wt_pct > 0;
  return hasName !== hasWeight;
}

function applicationFamilyLabel(value: ApplicationFamily) {
  return ELECTRO_APPLICATION_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function priceScopeLabel(scope?: string) {
  switch (scope) {
    case 'literature_high_volume':
      return 'Literature high-volume';
    case 'historical_bulk':
      return 'Historical bulk';
    case 'vendor_lab':
      return 'Vendor lab';
    default:
      return scope ?? 'Unspecified';
  }
}

function pricingBasisDisplay(value?: string) {
  if (!value) return 'basis not stated';
  return value.replace(/_/g, ' ');
}

function materialSourceTrust(material: MaterialItem) {
  if (material.reference_url) {
    if (material.price_scope === 'literature_high_volume') return 'Public literature source';
    if (material.price_scope === 'vendor_lab') return 'Direct vendor source';
    return 'Public source linked';
  }
  if (material.price_scope === 'historical_bulk') return 'No public permalink';
  return 'Link not stored';
}

function materialQuoteLabel(material?: MaterialItem | null) {
  if (!material?.price_unit || material.price == null) return 'Price not available';
  return `${formatPrice(material.price)} ${material.price_unit}`;
}

function calculatorMaterialLabel(material: MaterialItem) {
  if (material.formula && !material.name.includes(material.formula)) {
    return `${material.name} (${material.formula})`;
  }
  return material.name;
}


function MetricTile({ label, value, detail, dark = false }: { label: string; value: string; detail: string; dark?: boolean }) {
  return (
    <div className={dark ? 'cp-metric-tile-dark' : 'cp-metric-tile'}>
      <div className={`cp-subtle-label ${dark ? '!text-slate-400' : ''}`}>{label}</div>
      <div className={`mt-2 text-2xl font-display ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</div>
      <div className={`mt-1 text-xs leading-5 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{detail}</div>
    </div>
  );
}

function CompactValueRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="cp-data-row">
      <div>
        <div className="cp-subtle-label">{label}</div>
        {detail ? <div className="mt-1 text-xs leading-5 text-slate-600">{detail}</div> : null}
      </div>
      <div className="text-right text-sm font-semibold text-[#191f28]">{value}</div>
    </div>
  );
}

export default function Calculator() {
  const navigate = useNavigate();
  const { toDisplay, toInternal, fmtLabel } = useUnit();
  const { lang, t } = useLang();
  const { basis } = useBasis();
  // The basis the loaded price rows currently reflect; the switch effect re-prices on change.
  const appliedBasisRef = useRef(basis);
  const sectionState = useWorkspaceSections(ESTIMATE_SECTIONS, 'estimate');
  const storedDraft = loadCalculatorDraft();
  const [rows, setRows] = useState<CalculatorRow[]>(() => storedDraft?.rows?.length ? storedDraft.rows : defaultRows());
  const [steps, setSteps] = useState<string[]>(() => storedDraft?.steps?.length ? storedDraft.steps : DEFAULT_STEPS);
  const [selectedThermalTemplateId, setSelectedThermalTemplateId] = useState<string | null>(() => storedDraft?.thermalTemplateId ?? null);
  const [catalystDomain, setCatalystDomain] = useState<'thermal' | 'electrocatalyst'>(() => storedDraft?.catalystDomain ?? 'thermal');
  const [applicationFamily, setApplicationFamily] = useState<ApplicationFamily>(() => storedDraft?.applicationFamily ?? 'fuel_cell');
  const [electrocatalystConfig, setElectrocatalystConfig] = useState<ElectrocatalystDraft>(() => ({ ...defaultElectrocatalystConfig(), ...storedDraft?.electrocatalystConfig }));
  const [orderSize, setOrderSize] = useState<number>(() => storedDraft?.orderSize ?? 20);
  const [includeSpentValue, setIncludeSpentValue] = useState<boolean>(() => storedDraft?.includeSpentValue ?? false);
  const [reactorType, setReactorType] = useState<'fixed' | 'slurry'>(() => storedDraft?.reactorType ?? 'fixed');
  const [catalystBulkDensity, setCatalystBulkDensity] = useState<number>(() => storedDraft?.catalystBulkDensity ?? 50);
  const [selectedBenchmark] = useState<CalculatorBenchmarkPreset | null>(() => storedDraft?.benchmarkCandidate ?? null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [livePriceRows, setLivePriceRows] = useState<MetalPrice[]>([]);
  const [liveMap, setLiveMap] = useState<Record<string, FeedPrice>>({});
  const [thermalOptions, setThermalOptions] = useState<ThermalCompositionOptions | null>(null);
  const [electroMaterials, setElectroMaterials] = useState<MaterialItem[]>([]);
  const [electroTemplates, setElectroTemplates] = useState<ProcessTemplate[]>([]);
  const [thermalTemplates, setThermalTemplates] = useState<ProcessTemplate[]>([]);
  const [templateCosts, setTemplateCosts] = useState<Record<string, TemplateCost>>({});
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimateSummary[]>([]);
  const [savedBusyId, setSavedBusyId] = useState<number | null>(null);
  const [loadedSavedName, setLoadedSavedName] = useState<string | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<CalculatorResultSnapshot | null>(() => loadCalculatorResultSnapshot());
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<Date | null>(() => storedDraft?.pricesUpdatedAt ? new Date(storedDraft.pricesUpdatedAt) : null);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState(false);
  const currentScale = getScale(orderSize);
  const scale = scaleMeta(currentScale);

  useEffect(() => {
    saveCalculatorDraft({
      rows,
      steps,
      thermalTemplateId: selectedThermalTemplateId,
      catalystDomain,
      applicationFamily,
      orderSize,
      pricesUpdatedAt: pricesUpdatedAt ? pricesUpdatedAt.toISOString() : null,
      includeSpentValue,
      reactorType,
      catalystBulkDensity,
      electrocatalystConfig,
      benchmarkCandidate: selectedBenchmark,
    });
  }, [
    applicationFamily,
    catalystBulkDensity,
    catalystDomain,
    electrocatalystConfig,
    includeSpentValue,
    orderSize,
    pricesUpdatedAt,
    reactorType,
    rows,
    selectedBenchmark,
    selectedThermalTemplateId,
    steps,
  ]);

  useEffect(() => {
    if (catalystDomain === 'thermal' && selectedThermalTemplateId) return;
    setSteps((previous) => previous.filter((key) => {
      const step = ALL_STEPS.find((item) => item.key === key);
      return step ? (step.scales as readonly Scale[]).includes(currentScale) : false;
    }));
  }, [currentScale, catalystDomain, selectedThermalTemplateId]);

  // Processing cost of every method at the current production scale, so the
  // method cards can show what the route itself costs before materials.
  useEffect(() => {
    if (catalystDomain !== 'thermal') return;
    let cancelled = false;
    fetchTemplateCosts(orderSize, 'thermal')
      .then((payload) => {
        if (cancelled) return;
        setTemplateCosts(Object.fromEntries(payload.templates.map((item) => [item.id, item])));
        const selected = payload.templates.find((item) => item.id === selectedThermalTemplateId);
        if (selected?.steps_fitted.length) setSteps([...selected.steps_fitted]);
      })
      .catch(() => {
        if (!cancelled) setTemplateCosts({});
      });
    return () => {
      cancelled = true;
    };
  }, [orderSize, catalystDomain, selectedThermalTemplateId]);

  // Fetch live prices ONCE on mount. Each fetchPrices() returns a fresh array
  // reference, and the dedupe/derived options below depend on it — putting
  // thermalOptions in the deps used to cause a fetch ping-pong with the next
  // effect (each fetch produced a new ref, retriggering the other effect).
  useEffect(() => {
    let cancelled = false;
    async function loadPrices() {
      setPricesLoading(true);
      setPricesError(false);
      try {
        const prices = await fetchPrices(appliedBasisRef.current);
        if (cancelled) return;
        setLivePriceRows(prices);
        setLiveMap(toFeedMap(prices));
        setPricesUpdatedAt(new Date());
      } catch {
        if (cancelled) return;
        // Keep the form usable when live prices are temporarily unavailable;
        // surface the failure in the Price basis tile instead of swallowing it.
        setPricesError(true);
      } finally {
        if (!cancelled) setPricesLoading(false);
      }
    }
    void loadPrices();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch thermal composition options ONCE on mount, for the same reason.
  useEffect(() => {
    let cancelled = false;
    async function loadThermalOptions() {
      try {
        const payload = await fetchThermalCompositionOptions();
        if (cancelled) return;
        setThermalOptions(payload);
      } catch {
        if (cancelled) return;
        setThermalOptions({
          max_components: 10,
          active_metal_options: [],
          promoter_options: [],
          support_options: [],
        });
      }
    }

    void loadThermalOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reconcile rows whenever the live price feed or thermal option library
  // changes. This effect only mutates state — no network fetches — so it
  // can safely depend on the upstream sources without producing a loop.
  useEffect(() => {
    if (!livePriceRows.length && !thermalOptions) return;
    const nextLiveOptions = livePriceRows.map(buildLiveMetalOption);
    const nextActiveOptions = dedupeThermalOptions([
      ...nextLiveOptions,
      ...((thermalOptions?.active_metal_options ?? []).map(buildLibraryThermalOption)),
    ]);
    const nextSupportOptions = dedupeThermalOptions(
      (thermalOptions?.support_options ?? []).map(buildLibraryThermalOption),
    );
    setRows((previous) =>
      ensureThermalRows(
        previous.map((row) => {
          if (row.role === 'support') return row;
          const liveKey = row.symbol ? `live:${row.symbol}` : `live:${row.name}`;
          const liveOption = nextLiveOptions.find((option) => option.selection_key === liveKey);
          if (!liveOption || row.source_type === 'manual') return row;
          return applyOptionToRow(row, liveOption);
        }),
        nextActiveOptions,
        nextSupportOptions,
      ),
    );
  }, [livePriceRows, thermalOptions]);

  useEffect(() => {
    async function loadElectrocatalystReferences() {
      try {
        const [materials, templates] = await Promise.all([
          fetchMaterials(undefined, undefined, 'electrocatalyst', applicationFamily),
          fetchTemplates('electrocatalyst'),
        ]);
        setElectroMaterials(materials);
        setElectroTemplates(
          applicationFamily === 'general'
            ? templates
            : templates.filter((template) => !template.application_family || template.application_family === applicationFamily || template.application_family === 'general'),
        );
      } catch {
        setElectroMaterials([]);
        setElectroTemplates([]);
      }
    }

    void loadElectrocatalystReferences();
  }, [applicationFamily]);

  useEffect(() => {
    fetchTemplates('thermal')
      .then((templates) => setThermalTemplates(templates.filter((template) => template.steps.length > 0)))
      .catch(() => setThermalTemplates([]));
  }, []);

  useEffect(() => {
    if (sectionState.activeSection.id !== 'result') return;
    fetchSavedEstimates({ limit: 50 })
      .then(setSavedEstimates)
      .catch(() => setSavedEstimates([]));
  }, [sectionState.activeSection.id]);

  useEffect(() => {
    if (catalystDomain !== 'electrocatalyst') return;
    const activeTemplate = electroTemplates.find((template) => template.id === electrocatalystConfig.templateId) ?? electroTemplates[0];
    if (!activeTemplate) return;

    if (activeTemplate.id !== electrocatalystConfig.templateId) {
      setElectrocatalystConfig((previous) => ({ ...previous, templateId: activeTemplate.id }));
      return;
    }

    setSteps(activeTemplate.steps);
  }, [catalystDomain, electroTemplates, electrocatalystConfig.templateId]);

  useEffect(() => {
    if (catalystDomain !== 'electrocatalyst' || electroMaterials.length === 0) return;

    const comparePreference = (left: MaterialItem, right: MaterialItem, category: string) =>
      compareElectroPreference(left, right, category, applicationFamily, electrocatalystConfig.templateId);

    const pickPreferredKey = (options: MaterialItem[], category: string) => {
      if (options.length === 0) return '';
      const preferred = [...options].sort((left, right) => comparePreference(left, right, category));
      return String(preferred[0]?.id ?? '');
    };

    const shouldReplaceSelection = (currentKey: string, options: MaterialItem[], category: string) => {
      const preferredKey = pickPreferredKey(options, category);
      if (!currentKey) return preferredKey;
      const current = options.find((material) => String(material.id) === currentKey);
      const preferred = options.find((material) => String(material.id) === preferredKey);
      if (!current || !preferred) return preferredKey;
      return comparePreference(current, preferred, category) > 0 ? preferredKey : '';
    };

    const catalystOptions = electroMaterials.filter((material) => material.category === 'Electrocatalyst Powder');
    const ionomerRows = electroMaterials.filter((material) => material.category === 'Ionomer');
    const membraneRows = electroMaterials.filter((material) => material.category === 'Membrane');
    const substrateRows = electroMaterials.filter((material) => material.category === 'Gas Diffusion Layer');

    const nextPatch: Partial<ElectrocatalystDraft> = {};
    const catalystPreferred = shouldReplaceSelection(
      electrocatalystConfig.catalystMaterialKey,
      catalystOptions,
      'Electrocatalyst Powder',
    );
    if (catalystPreferred) {
      nextPatch.catalystMaterialKey = catalystPreferred;
    }
    const ionomerPreferred = shouldReplaceSelection(
      electrocatalystConfig.ionomerMaterialKey,
      ionomerRows,
      'Ionomer',
    );
    if (ionomerPreferred) {
      nextPatch.ionomerMaterialKey = ionomerPreferred;
    }
    const membranePreferred = shouldReplaceSelection(
      electrocatalystConfig.membraneMaterialKey,
      membraneRows,
      'Membrane',
    );
    if (membranePreferred) {
      nextPatch.membraneMaterialKey = membranePreferred;
    }
    const substratePreferred = shouldReplaceSelection(
      electrocatalystConfig.substrateMaterialKey,
      substrateRows,
      'Gas Diffusion Layer',
    );
    if (substratePreferred) {
      nextPatch.substrateMaterialKey = substratePreferred;
    }
    if (electroTemplates.length > 0 && !electroTemplates.some((template) => template.id === electrocatalystConfig.templateId)) {
      nextPatch.templateId = (electroTemplates.find((template) => template.id.startsWith('pem_')) ?? electroTemplates[0])?.id ?? electrocatalystConfig.templateId;
    }

    if (Object.keys(nextPatch).length > 0) {
      setElectrocatalystConfig((previous) => ({ ...previous, ...nextPatch }));
    }
  }, [
    catalystDomain,
    electroMaterials,
    electroTemplates,
    applicationFamily,
    electrocatalystConfig.catalystMaterialKey,
    electrocatalystConfig.ionomerMaterialKey,
    electrocatalystConfig.membraneMaterialKey,
    electrocatalystConfig.substrateMaterialKey,
    electrocatalystConfig.templateId,
  ]);

  function toFeedMap(prices: MetalPrice[]) {
    const map: Record<string, FeedPrice> = {};
    for (const price of prices) {
      if (price.source_type === 'manual') continue;
      map[price.symbol] = { price_per_lb: toPerLb(price.price, price.unit), source_type: price.source_type as Exclude<SourceType, 'manual'>, source: price.source };
    }
    return map;
  }

  function applyPriceRows(prices: MetalPrice[]) {
    const map = toFeedMap(prices);
    const nextLiveOptions = prices.map(buildLiveMetalOption);
    setLivePriceRows(prices);
    setLiveMap(map);
    setRows((previous) => ensureThermalRows(
      previous.map((row) => {
        if (row.role === 'support' || row.source_type === 'manual') return row;
        const liveKey = row.symbol ? `live:${row.symbol}` : `live:${row.name}`;
        const liveOption = nextLiveOptions.find((option) => option.selection_key === liveKey);
        return liveOption ? applyOptionToRow(row, liveOption) : row;
      }),
      [...nextLiveOptions, ...activeMetalLibraryOptions],
      supportSelectionOptions,
    ));
    setPricesUpdatedAt(new Date());
  }

  async function syncPrices() {
    setRefreshing(true);
    try {
      await refreshPriceFeed();
      applyPriceRows(await fetchPrices(basis));
    } finally {
      setRefreshing(false);
    }
  }

  // Switching the price basis re-prices every tracked-metal row from the
  // other tier. The first load is handled by the mount effect above, so this
  // only fires on an actual change.
  useEffect(() => {
    if (appliedBasisRef.current === basis) return;
    appliedBasisRef.current = basis;
    let cancelled = false;
    (async () => {
      const prices = await fetchPrices(basis);
      if (!cancelled) applyPriceRows(prices);
    })().catch(() => {
      // The Price basis tile keeps showing the previous state on a failed switch.
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyPriceRows closes over render-derived option lists; run only when the basis changes
  }, [basis]);

  const activeBenchmark = selectedBenchmark?.catalyst_domain === catalystDomain ? selectedBenchmark : null;
  const routeStepsFor = (template: ProcessTemplate) => {
    const fitted = templateCosts[template.id]?.steps_fitted;
    return fitted?.length ? fitted : template.steps;
  };
  const matchedThermalTemplate =
    catalystDomain === 'thermal' ? matchThermalTemplate(thermalTemplates, templateCosts, steps, selectedThermalTemplateId) : null;
  const benchmarkTemplate = activeBenchmark?.route.calculator_template_id
    ? thermalTemplates.find((template) => template.id === activeBenchmark.route.calculator_template_id) ?? null
    : null;
  const thermalTemplateId = matchedThermalTemplate && (selectedThermalTemplateId || matchedThermalTemplate.id !== benchmarkTemplate?.id) ? matchedThermalTemplate.id : undefined;
  const thermalRouteLabel = thermalTemplateId
    ? matchedThermalTemplate?.name ?? t('Manual step selection')
    : activeBenchmark
      ? benchmarkTemplate && !sameSteps(routeStepsFor(benchmarkTemplate), steps)
        ? `${activeBenchmark.route.name} (${t('edited')})`
        : activeBenchmark.route.name
      : t('Manual step selection');
  const activeElectroTemplate =
    catalystDomain === 'electrocatalyst'
      ? electroTemplates.find((template) => template.id === electrocatalystConfig.templateId) ?? null
      : null;
  const liveMetalOptions = livePriceRows.map(buildLiveMetalOption);
  const activeMetalLibraryOptions = (thermalOptions?.active_metal_options ?? []).map(buildLibraryThermalOption);
  const promoterLibraryOptions = (thermalOptions?.promoter_options ?? []).map(buildLibraryThermalOption);
  const supportSelectionOptions = dedupeThermalOptions((thermalOptions?.support_options ?? []).map(buildLibraryThermalOption));
  const activeMetalOptions = dedupeThermalOptions([...liveMetalOptions, ...activeMetalLibraryOptions]);
  const promoterOptions = dedupeThermalOptions([...liveMetalOptions, ...promoterLibraryOptions]);
  const thermalOptionMap = new Map<string, ThermalSelectionOption>(
    [...activeMetalOptions, ...promoterOptions, ...supportSelectionOptions].map((option) => [option.selection_key, option]),
  );
  const maxThermalComponents = thermalOptions?.max_components ?? 10;
  const electroMaterialMap = new Map(electroMaterials.map((material) => [String(material.id), material]));
  const catalystPowders = electroMaterials.filter((material) => material.category === 'Electrocatalyst Powder');
  const ionomerOptions = electroMaterials.filter((material) => material.category === 'Ionomer');
  const membraneOptions = electroMaterials.filter((material) => material.category === 'Membrane');
  const substrateOptions = electroMaterials.filter((material) => material.category === 'Gas Diffusion Layer');
  const selectedCatalystMaterial = electroMaterialMap.get(electrocatalystConfig.catalystMaterialKey) ?? null;
  const selectedIonomerMaterial = electroMaterialMap.get(electrocatalystConfig.ionomerMaterialKey) ?? null;
  const selectedMembraneMaterial = electroMaterialMap.get(electrocatalystConfig.membraneMaterialKey) ?? null;
  const selectedSubstrateMaterial = electroMaterialMap.get(electrocatalystConfig.substrateMaterialKey) ?? null;

  function handleCatalystDomainChange(nextDomain: 'thermal' | 'electrocatalyst') {
    if (nextDomain === catalystDomain) return;
    setCatalystDomain(nextDomain);
    setError('');

    if (nextDomain === 'thermal') {
      setRows((previous) => ensureThermalRows(previous, activeMetalOptions, supportSelectionOptions));
      const thermalBenchmarkSteps =
        selectedBenchmark?.catalyst_domain === 'thermal'
          ? selectedBenchmark.route.steps
          : DEFAULT_STEPS.filter((key) => {
              const step = ALL_STEPS.find((item) => item.key === key);
              return step ? (step.scales as readonly Scale[]).includes(currentScale) : false;
            });
      setSteps(selectedThermalTemplateId && templateCosts[selectedThermalTemplateId]?.steps_fitted.length
        ? [...templateCosts[selectedThermalTemplateId].steps_fitted] : thermalBenchmarkSteps);
      return;
    }

    if (selectedBenchmark?.catalyst_domain === 'electrocatalyst') {
      setApplicationFamily(selectedBenchmark.application_family);
    }
  }

  const updateRow = (id: string, patch: Partial<CalculatorRow>) => setRows((previous) => previous.map((row) => row.id === id ? { ...row, ...patch } : row));
  const findThermalOption = (selectionKey: string | null | undefined) => selectionKey ? (thermalOptionMap.get(selectionKey) ?? null) : null;
  const selectThermalOption = (
    rowId: string,
    selectionKey: string,
  ) => {
    const option = findThermalOption(selectionKey);
    if (!option) return;
    setRows((previous) => previous.map((row) => {
      if (row.id !== rowId) return row;
      return applyOptionToRow(row, option);
    }));
  };
  const updateElectroConfig = (patch: Partial<ElectrocatalystDraft>) => setElectrocatalystConfig((previous) => ({ ...previous, ...patch }));
  const addRow = (role: 'active_metal' | 'promoter' | 'support') => setRows((previous) => {
    if (previous.length >= maxThermalComponents) return previous;
    const row = createBlankRow(role, role === 'support' ? 0 : 5);
    const supportIndex = previous.findIndex((item) => item.role === 'support');
    if (role === 'support' || supportIndex === -1) return [...previous, row];
    return [...previous.slice(0, supportIndex), row, ...previous.slice(supportIndex)];
  });
  const removeRow = (id: string) => setRows((previous) => {
    const target = previous.find((row) => row.id === id);
    if (!target) return previous;
    if (target.role === 'support' && previous.filter((row) => row.role === 'support').length === 1) {
      return previous;
    }
    return previous.filter((row) => row.id !== id);
  });
  const toggleStep = (stepKey: string) => {
    setSelectedThermalTemplateId(null);
    setSteps((previous) => previous.includes(stepKey) ? previous.filter((item) => item !== stepKey) : [...previous, stepKey]);
  };
  const thermalRows = rows.filter((row) => row.role === 'active_metal' || row.role === 'promoter' || row.role === 'support');
  const supportRows = thermalRows.filter((row) => row.role === 'support');
  const nonSupportRows = thermalRows.filter((row) => row.role !== 'support');
  const supportIsSplit = supportRows.length > 1;
  const completedNonSupportRows = nonSupportRows.filter(isCompletedThermalRow);
  const nonSupportWt = completedNonSupportRows.reduce((sum, row) => sum + row.wt_pct, 0);
  const explicitSupportWt = supportRows.reduce((sum, row) => sum + (isCompletedThermalRow(row) ? row.wt_pct : 0), 0);
  const supportWtPct = supportIsSplit ? explicitSupportWt : Math.max(0, 100 - nonSupportWt);
  const totalThermalWt = supportIsSplit ? nonSupportWt + explicitSupportWt : nonSupportWt + supportWtPct;
  const incompleteThermalRows = thermalRows.filter((row) => {
    if (row.role === 'support' && !supportIsSplit) {
      return !hasNamedRow(row);
    }
    return isIncompleteThermalRow(row);
  });
  const liveFeedCount = Object.values(liveMap).filter((feed) => feed.source_type === 'live').length;
  const indexedFeedCount = Object.values(liveMap).filter((feed) => feed.source_type === 'indexed').length;
  const activeMetalCount = completedNonSupportRows.filter((row) => row.role === 'active_metal').length;
  const hasSupport = supportRows.some(hasNamedRow);
  const isThermalValid = (
    activeMetalCount > 0
    && hasSupport
    && thermalRows.length <= maxThermalComponents
    && incompleteThermalRows.length === 0
    && (
      supportIsSplit
        ? explicitSupportWt > 0 && Math.abs(totalThermalWt - 100) <= THERMAL_WT_TOLERANCE
        : nonSupportWt > 0 && nonSupportWt < 100
    )
  );
  const isElectroValid = Boolean(
    electrocatalystConfig.catalystMaterialKey
      && electrocatalystConfig.ionomerMaterialKey
      && electrocatalystConfig.membraneMaterialKey
      && electrocatalystConfig.substrateMaterialKey
      && activeElectroTemplate,
  );
  const thermalValidationMessage = thermalRows.length > maxThermalComponents
    ? (lang === 'ko'
      ? `열촉매 조성은 복합 담체를 포함해 최대 ${maxThermalComponents}개 성분까지 가능합니다.`
      : `Thermal formulations are capped at ${maxThermalComponents} total components including promoted supports.`)
    : incompleteThermalRows.length > 0
      ? (lang === 'ko'
        ? `계속하기 전에 미완성 조성 행 ${incompleteThermalRows.length}개를 완성하거나 삭제하세요.`
        : `Complete or remove ${incompleteThermalRows.length} unfinished composition row${incompleteThermalRows.length > 1 ? 's' : ''} before continuing.`)
      : activeMetalCount === 0
        ? t('Add at least one active metal before continuing.')
        : !hasSupport
          ? t('Add at least one support before continuing.')
          : supportIsSplit
            ? (lang === 'ko'
              ? `담체를 여러 개 쓸 때는 전체 조성이 100 wt%가 되어야 합니다. 현재 합계: ${totalThermalWt.toFixed(1)} wt%.`
              : `When more than one support is used, the full formulation must sum to 100 wt%. Current total: ${totalThermalWt.toFixed(1)} wt%.`)
            : nonSupportWt >= 100
              ? t('Active metals and promoters must stay below 100 wt% so support remains positive.')
              : t('Enter a valid non-zero loading for the active portion of the formulation.');
  const electrocatalystValidationMessage = t('Select catalyst powder, ionomer, membrane, substrate / GDL, and a preparation template before continuing.');
  const isCompositionSectionValid = catalystDomain === 'electrocatalyst' ? isElectroValid : isThermalValid;
  const isManufacturingSectionValid = isCompositionSectionValid && steps.length > 0;
  const isValid = catalystDomain === 'electrocatalyst' ? isElectroValid : isThermalValid;
  const latestSnapshotForCurrentCase = latestSnapshot
    && latestSnapshot.result.input_summary.catalyst_domain === catalystDomain
    && (
      catalystDomain !== 'electrocatalyst'
      || latestSnapshot.result.input_summary.application_family === applicationFamily
    )
      ? latestSnapshot
      : null;
  const disabledEstimateSections = [
    ...(!isCompositionSectionValid ? ['manufacturing'] : []),
    ...(!isManufacturingSectionValid ? ['result'] : []),
  ];
  const canAdvanceCurrentSection = sectionState.activeSection.id === 'composition'
    ? isCompositionSectionValid
    : sectionState.activeSection.id === 'manufacturing'
      ? isManufacturingSectionValid
      : true;

  useEffect(() => {
    if (sectionState.activeSection.id === 'manufacturing' && !isCompositionSectionValid) {
      sectionState.setActiveSection('composition');
      return;
    }
    if (sectionState.activeSection.id === 'result' && !isManufacturingSectionValid) {
      sectionState.setActiveSection(isCompositionSectionValid ? 'manufacturing' : 'composition');
    }
  }, [
    isCompositionSectionValid,
    isManufacturingSectionValid,
    sectionState,
  ]);

  function handleEstimateSectionSelect(id: string) {
    if (disabledEstimateSections.includes(id)) return;
    sectionState.setActiveSection(id);
  }

  function handleEstimateNext() {
    if (!canAdvanceCurrentSection) return;
    sectionState.goNext();
  }

  async function handleLoadSaved(summary: SavedEstimateSummary) {
    setSavedBusyId(summary.id);
    try {
      const detail = await fetchSavedEstimate(summary.id);
      const input = detail.input as unknown as CostInput;

      if (summary.catalyst_domain === 'electrocatalyst') {
        const electrode = input.electrode_input;
        if (!electrode) return;
        setCatalystDomain('electrocatalyst');
        if (electrode.application_family) setApplicationFamily(electrode.application_family as ApplicationFamily);
        setElectrocatalystConfig((previous) => ({
          ...previous,
          templateId: input.template_id ?? previous.templateId,
          catalystMaterialKey: electrode.catalyst_material_key ?? previous.catalystMaterialKey,
          ionomerMaterialKey: electrode.ionomer_material_key ?? previous.ionomerMaterialKey,
          membraneMaterialKey: electrode.membrane_material_key ?? previous.membraneMaterialKey,
          substrateMaterialKey: electrode.substrate_material_key ?? previous.substrateMaterialKey,
          activeAreaCm2: electrode.active_area_cm2 ?? previous.activeAreaCm2,
          catalystLoadingMgCm2: electrode.catalyst_loading_mg_cm2 ?? previous.catalystLoadingMgCm2,
          ionomerToCatalystRatio: electrode.ionomer_to_catalyst_ratio ?? previous.ionomerToCatalystRatio,
          manufacturingScenario: electrode.manufacturing_scenario ?? '',
        }));
        setOrderSize(input.order_size_tons ?? 20);
        setLoadedSavedName(summary.name);
        return;
      }
      const nextRows: CalculatorRow[] = (input.components ?? [])
        .filter((component) => component.role === 'active_metal' || component.role === 'promoter' || component.role === 'support')
        .map((component) => {
          const role = component.role as 'active_metal' | 'promoter' | 'support';
          const selectionKey = component.material_key ? `library:${component.material_key}` : '';
          const option = selectionKey ? findThermalOption(selectionKey) : undefined;
          if (option) return createRowFromOption(role, option, component.wt_pct);
          return {
            id: uid(),
            role,
            name: component.name ?? '',
            material_key: component.material_key ?? null,
            symbol: null,
            selection_key: '',
            wt_pct: component.wt_pct,
            price_per_lb: component.price_per_lb ?? 0,
            source_type: 'manual' as const,
            source: 'Saved estimate',
          };
        });
      if (nextRows.length === 0) return;
      setCatalystDomain('thermal');
      setRows(nextRows);
      setSelectedThermalTemplateId(input.template_id ?? null);
      setSteps(input.steps ?? []);
      setOrderSize(input.order_size_tons ?? 20);
      setLoadedSavedName(summary.name);
    } catch {
      setLoadedSavedName(null);
    } finally {
      setSavedBusyId(null);
    }
  }

  async function handleDeleteSaved(id: number) {
    setSavedBusyId(id);
    try {
      await deleteSavedEstimate(id);
      setSavedEstimates(await fetchSavedEstimates({ limit: 50 }));
    } catch {
      // keep the current list on failure
    } finally {
      setSavedBusyId(null);
    }
  }

  function toggleRowSource(id: string) {
    setRows((previous) => previous.map((row) => {
      if (row.id !== id) return row;
      const option = findThermalOption(row.selection_key);
      if (!option || option.source_type === 'manual') return row;
      return row.source_type === 'manual'
        ? applyOptionToRow(row, option)
        : { ...row, source_type: 'manual', source: 'Manual input' };
    }));
  }

  async function handleCalculate() {
    if (!isValid || steps.length === 0) return;
    setLoading(true);
    setError('');

    try {
      let input: CostInput;
      let supportName: string | null = null;

      if (catalystDomain === 'electrocatalyst') {
        input = {
          catalyst_domain: 'electrocatalyst',
          application_family: applicationFamily,
          template_id: electrocatalystConfig.templateId || undefined,
          order_size_tons: orderSize,
          steps,
          price_basis: basis,
          components: [{
            role: 'active_catalyst',
            material_key: electrocatalystConfig.catalystMaterialKey,
            wt_pct: 100,
            name: selectedCatalystMaterial?.name ?? 'Electrocatalyst powder',
          }],
          electrode_input: {
            application_family: applicationFamily,
            catalyst_material_key: electrocatalystConfig.catalystMaterialKey,
            ionomer_material_key: electrocatalystConfig.ionomerMaterialKey,
            membrane_material_key: electrocatalystConfig.membraneMaterialKey,
            substrate_material_key: electrocatalystConfig.substrateMaterialKey,
            active_area_cm2: electrocatalystConfig.activeAreaCm2,
            catalyst_loading_mg_cm2: electrocatalystConfig.catalystLoadingMgCm2,
            ionomer_to_catalyst_ratio: electrocatalystConfig.ionomerToCatalystRatio,
            manufacturing_scenario: electrocatalystConfig.manufacturingScenario || undefined,
          },
        };
      } else {
        const completedSupportRows = supportRows.filter((row) => supportIsSplit ? isCompletedThermalRow(row) : hasNamedRow(row));
        supportName = completedSupportRows.map((row) => row.name).join(' + ') || null;

        const components: ComponentInput[] = [
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
        input = {
          components,
          steps,
          template_id: thermalTemplateId,
          catalyst_domain: catalystDomain,
          application_family: applicationFamily,
          order_size_tons: orderSize,
          include_spent_value: includeSpentValue,
          reactor_type: reactorType,
          catalyst_bulk_density: catalystBulkDensity,
          price_basis: basis,
        };
      }

      const result = await calculateCost(input);
      const snapshot: CalculatorResultSnapshot = {
        result,
        orderSize,
        steps,
        stepLabels: steps.map(formatStepLabel),
        selectedSupportName: supportName ?? selectedSubstrateMaterial?.name ?? null,
        activeMetalCount,
        liveFeedCount,
        indexedFeedCount,
        nonSupportWt,
        supportWtPct,
        generatedAt: new Date().toISOString(),
        benchmarkCandidate: selectedBenchmark,
        costInput: input,
      };

      saveCalculatorResultSnapshot(snapshot);
      setLatestSnapshot(snapshot);
      navigate('/calculator/result');
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : typeof caughtError === 'string'
            ? caughtError
            : 'Unexpected calculation error. Review the composition rows and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  function sourceChip(row: CalculatorRow) {
    const option = findThermalOption(row.selection_key);
    const dotClass = row.source_type === 'live' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.32)]' : row.source_type === 'indexed' ? 'bg-amber-500' : 'bg-slate-500';
    const className = `inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${sourceTone(row.source_type)}`;
    const content = <><span className={`h-2 w-2 rounded-full ${dotClass}`} /><span>{t(sourceTypeLabel(row.source_type))}</span></>;
    if (!option || option.source_type === 'manual') return <span className={`${className} cursor-default`} title={row.source}>{content}</span>;
    const title = row.source_type === 'manual' ? `Manual input. Switch to ${sourceTypeLabel(option.source_type)} pricing from ${option.source}.` : `${row.source}. Switch back to manual input.`;
    return <button onClick={() => toggleRowSource(row.id)} title={title} className={className}>{content}</button>;
  }

  function priceField(row: CalculatorRow) {
    const locked = row.source_type !== 'manual';
    return (
      <div className="flex flex-none items-center gap-2">
        <span className="text-xs text-slate-600">$</span>
        <input type="number" step="0.01" min="0" value={toDisplay(row.price_per_lb).toFixed(2)} readOnly={locked} onChange={(event) => !locked && updateRow(row.id, { price_per_lb: toInternal(Number(event.target.value)) })} className={`input-base w-32 text-right font-mono ${priceTone(row.source_type)} ${locked ? 'cursor-not-allowed' : ''}`} />
        <span className="text-xs text-slate-600">{fmtLabel}</span>
      </div>
    );
  }

  function renderElectroMaterialCard(label: string, material: MaterialItem | null, fallback: string) {
    return (
      <div className="rounded-[24px] border border-slate-900/8 bg-white/72 p-4">
        <div className="cp-subtle-label">{t(label)}</div>
        <div className="mt-2 font-semibold text-[#191f28]">{material?.name ?? t(fallback)}</div>
        <div className="mt-1 text-sm text-slate-600">{material ? materialQuoteLabel(material) : t('Select a library record to lock pricing.')}</div>
        {material ? (
          <div className="mt-2 space-y-2">
            <div className="text-xs leading-6 text-slate-600">
              {priceScopeLabel(material.price_scope)} / {pricingBasisDisplay(material.pricing_basis)}
              {material.quote_year ? ` / ${material.quote_year}` : ''}
              {material.quote_source ? ` / ${material.quote_source}` : ''}
            </div>
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
              material.reference_url ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}>
              {materialSourceTrust(material)}
            </span>
            {material.reference_url ? (
              <a
                href={material.reference_url}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-sky-700 underline underline-offset-2"
              >
                {t('Open source')}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderElectrocatalystPanel() {
    return (
      <div className="space-y-4">
        <div className="surface-ghost p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
            <div>
              <div className="cp-subtle-label">{t('Electrode assembly')}</div>
              <div className="cp-heading-lg mt-2">{t('Set the electrode assembly first, then price the preparation method.')}</div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {t('Catalyst powder, ionomer, membrane, and substrate each keep their own source record.')}
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                {t('Defaults prefer higher-confidence literature or sourced vendor rows when they exist.')}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-900/8 bg-white/72 p-4">
              <div className="cp-subtle-label">{t('Application family')}</div>
              <div className="mt-3 grid gap-2">
                {ELECTRO_APPLICATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setApplicationFamily(option.value)}
                    className={`rounded-[18px] border px-3 py-3 text-left transition ${
                      applicationFamily === option.value
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold">{t(option.label)}</div>
                    <div className={`mt-1 text-xs leading-5 ${applicationFamily === option.value ? 'text-slate-300' : 'text-slate-600'}`}>
                      {t(option.detail)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="surface-ghost p-4">
            <div className="cp-subtle-label">{t('Material list')}</div>
            <div className="mt-3 grid gap-3">
              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Catalyst powder')}</div>
                <select value={electrocatalystConfig.catalystMaterialKey} onChange={(event) => updateElectroConfig({ catalystMaterialKey: event.target.value })} className="input-base mt-2">
                  <option value="">{t('Select catalyst powder')}</option>
                  {catalystPowders.map((material) => (
                    <option key={String(material.id)} value={String(material.id)}>
                      {calculatorMaterialLabel(material)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Ionomer')}</div>
                <select value={electrocatalystConfig.ionomerMaterialKey} onChange={(event) => updateElectroConfig({ ionomerMaterialKey: event.target.value })} className="input-base mt-2">
                  <option value="">{t('Select ionomer')}</option>
                  {ionomerOptions.map((material) => (
                    <option key={String(material.id)} value={String(material.id)}>
                      {calculatorMaterialLabel(material)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Membrane')}</div>
                <select value={electrocatalystConfig.membraneMaterialKey} onChange={(event) => updateElectroConfig({ membraneMaterialKey: event.target.value })} className="input-base mt-2">
                  <option value="">{t('Select membrane')}</option>
                  {membraneOptions.map((material) => (
                    <option key={String(material.id)} value={String(material.id)}>
                      {calculatorMaterialLabel(material)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Substrate / GDL')}</div>
                <select value={electrocatalystConfig.substrateMaterialKey} onChange={(event) => updateElectroConfig({ substrateMaterialKey: event.target.value })} className="input-base mt-2">
                  <option value="">{t('Select substrate / GDL')}</option>
                  {substrateOptions.map((material) => (
                    <option key={String(material.id)} value={String(material.id)}>
                      {calculatorMaterialLabel(material)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="surface-ghost p-4">
            <div className="cp-subtle-label">{t('Electrode geometry')}</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Active area')}</div>
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" min="1" step="0.1" value={electrocatalystConfig.activeAreaCm2} onChange={(event) => updateElectroConfig({ activeAreaCm2: Number(event.target.value) })} className="input-base text-right font-mono" />
                  <span className="text-xs text-slate-600">cm²</span>
                </div>
              </label>

              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Catalyst loading')}</div>
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" min="0.01" step="0.01" value={electrocatalystConfig.catalystLoadingMgCm2} onChange={(event) => updateElectroConfig({ catalystLoadingMgCm2: Number(event.target.value) })} className="input-base text-right font-mono" />
                  <span className="text-xs text-slate-600">mg/cm²</span>
                </div>
              </label>

              <label className="block sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Ionomer / catalyst ratio')}</div>
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" min="0" step="0.05" value={electrocatalystConfig.ionomerToCatalystRatio} onChange={(event) => updateElectroConfig({ ionomerToCatalystRatio: Number(event.target.value) })} className="input-base max-w-[180px] text-right font-mono" />
                  <span className="text-xs text-slate-600">{t('dry ionomer mass / catalyst powder mass')}</span>
                </div>
              </label>

              <label className="block sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Manufacturing scenario')}</div>
                <select value={electrocatalystConfig.manufacturingScenario} onChange={(event) => updateElectroConfig({ manufacturingScenario: event.target.value as ElectrocatalystDraft['manufacturingScenario'] })} className="input-base mt-2">
                  <option value="">{t('Materials only (no line cost)')}</option>
                  <option value="rnd_batch">{t('R&D batch line — $0.123/cm² (Hog 2026)')}</option>
                  <option value="pilot_roll_to_roll">{t('Pilot roll-to-roll — $0.006/cm² (Hog 2026)')}</option>
                </select>
                <div className="mt-1 text-xs text-slate-600">{t('Adds equipment, labor, and facility cost per cm² of active area. EUR→USD at 1.1306 (2025 avg).')}</div>
              </label>

              <label className="block sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Preparation template')}</div>
                <select value={electrocatalystConfig.templateId} onChange={(event) => updateElectroConfig({ templateId: event.target.value })} className="input-base mt-2">
                  {electroTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-4">
          {renderElectroMaterialCard('Catalyst powder', selectedCatalystMaterial, 'Choose a catalyst powder')}
          {renderElectroMaterialCard('Ionomer', selectedIonomerMaterial, 'Choose an ionomer')}
          {renderElectroMaterialCard('Membrane', selectedMembraneMaterial, 'Choose a membrane')}
          {renderElectroMaterialCard('Substrate / GDL', selectedSubstrateMaterial, 'Choose a substrate or GDL')}
        </div>

        {activeElectroTemplate ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-4">
            <div className="cp-subtle-label !text-emerald-700">{t('Selected preparation template')}</div>
            <div className="mt-2 cp-heading-sm">{activeElectroTemplate.name}</div>
            <div className="mt-2 text-sm leading-6 text-emerald-900">{activeElectroTemplate.description}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="cp-chip">{t(applicationFamilyLabel(applicationFamily))}</span>
              {activeElectroTemplate.manufacturing_mode ? <span className="cp-chip">{activeElectroTemplate.manufacturing_mode}</span> : null}
              <span className="cp-chip">{activeElectroTemplate.steps.length} {t("steps")}</span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div>
                <div className="cp-subtle-label !text-emerald-700">{t('Pre-treatment')}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(activeElectroTemplate.preprocess ?? []).map((item) => <span key={item} className="cp-chip">{item}</span>)}
                </div>
              </div>
              <div>
                <div className="cp-subtle-label !text-emerald-700">{t('Synthesis / coating')}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(activeElectroTemplate.synthesis ?? []).map((item) => <span key={item} className="cp-chip">{item}</span>)}
                </div>
              </div>
              <div>
                <div className="cp-subtle-label !text-emerald-700">{t('Post-treatment')}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(activeElectroTemplate.postprocess ?? []).map((item) => <span key={item} className="cp-chip">{item}</span>)}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderRows(role: 'active_metal' | 'promoter') {
    const items = rows.filter((row) => row.role === role);
    const selectionOptions = role === 'active_metal' ? activeMetalOptions : promoterOptions;
    const copy = role === 'active_metal'
      ? { title: 'Active metals', description: 'Pick exchange-quoted metals or library-backed materials.', accent: 'bg-[#0d9488]', button: 'Add active metal', placeholder: 'At least one active metal is required.' }
      : { title: 'Promoters', description: 'Optional promoter rows use the same DB-backed thermal material bank.', accent: 'bg-[#8b95a1]', button: 'Add promoter', placeholder: 'No promoters added yet.' };

    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${copy.accent}`} /><h3 className="cp-heading-sm">{t(copy.title)}</h3></div>
            <p className="mt-1 text-xs leading-6 text-slate-600">{t(copy.description)}</p>
          </div>
          <button onClick={() => addRow(role)} disabled={thermalRows.length >= maxThermalComponents} className="cp-button-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-45">{t(copy.button)}</button>
        </div>
        {items.length === 0 ? <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/44 px-4 py-4 text-sm text-slate-600">{t(copy.placeholder)}</div> : (
          <div className="space-y-3">
            {items.map((row) => (
              <div key={row.id} className="surface-ghost p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <select value={row.selection_key ?? ''} onChange={(event) => selectThermalOption(row.id, event.target.value)} className="input-base min-w-[220px] flex-[1.6_1_320px] pr-10">
                    <option value="">{role === 'active_metal' ? t('Select active metal or precursor') : t('Select promoter material')}</option>
                    {selectionOptions.map((option) => <option key={option.selection_key} value={option.selection_key}>{compactThermalOptionLabel(option, lang)}</option>)}
                  </select>
                  <div className="flex flex-none items-center gap-2"><input type="number" step="0.1" min="0" max="100" value={row.wt_pct} onChange={(event) => updateRow(row.id, { wt_pct: Number(event.target.value) })} className="input-base w-28 text-right font-mono" /><span className="text-xs text-slate-600">wt%</span></div>
                  {sourceChip(row)}
                  {priceField(row)}
                  <button onClick={() => removeRow(row.id)} className="flex h-10 w-10 flex-none items-center justify-center rounded-[18px] border border-slate-300 bg-white/74 text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700" aria-label={t("Remove row")}>x</button>
                </div>
                <div className="mt-3 text-xs text-slate-600">{row.name || 'Select a material record.'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderWorkspaceSummary() {
    const latestGenerated = latestSnapshotForCurrentCase
      ? new Date(latestSnapshotForCurrentCase.generatedAt).toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : null;
    const manualOverrideCount = catalystDomain === 'electrocatalyst'
      ? 0
      : rows.filter((row) => row.source_type === 'manual' && row.name.trim().length > 0).length;
    const recipeSummary = catalystDomain === 'electrocatalyst'
      ? `${selectedCatalystMaterial?.name ?? 'Catalyst'}, ${selectedIonomerMaterial?.name ?? 'Ionomer'}, ${selectedMembraneMaterial?.name ?? 'Membrane'}`
      : lang === 'ko'
        ? `활성 금속 ${activeMetalCount}종 / 담체 ${supportRows.length}행 / 담체 ${supportWtPct.toFixed(1)} wt%`
        : `${activeMetalCount} active metal${activeMetalCount === 1 ? '' : 's'} / ${supportRows.length} support row${supportRows.length === 1 ? '' : 's'} / ${supportWtPct.toFixed(1)} wt% support`;
    const preparationSummary =
      catalystDomain === 'electrocatalyst'
        ? activeElectroTemplate?.name ?? t('Select a preparation template')
        : thermalRouteLabel;
    const recoverySummary = catalystDomain === 'thermal'
      ? includeSpentValue
        ? `${t('Recovery credit on')} / ${reactorType === 'fixed' ? t('Fixed bed') : t('Slurry')} / ${catalystBulkDensity.toFixed(1)} lb/ft³`
        : t('Recovery credit off')
      : t(applicationFamilyLabel(applicationFamily));

    return (
      <section className="surface-card p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[22px] border border-slate-900/8 bg-white/62 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="cp-subtle-label">{t('Price basis')}</div>
              <button onClick={syncPrices} disabled={refreshing} className="cp-button-secondary px-3 py-2 text-xs">
                <span className={`mr-2 inline-flex h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? t('Refreshing') : t('Refresh')}
              </button>
            </div>
            <div className="mt-3 space-y-1">
              <CompactValueRow
                label={t('Status')}
                value={
                  refreshing
                    ? t('Refreshing')
                    : pricesLoading
                      ? t('Loading live prices')
                      : pricesError
                        ? t('Live prices unavailable')
                        : pricesUpdatedAt
                          ? t('Ready')
                          : t('Pending')
                }
                detail={
                  pricesLoading
                    ? t('Waiting for the local backend to publish live quotes.')
                    : pricesError
                      ? t('Indexed and manual prices still apply. Refresh to retry the live sources.')
                      : pricesUpdatedAt
                        ? lang === 'ko'
                          ? `실시간 ${liveFeedCount}건 / 지수 보정 ${indexedFeedCount}건, 시세 갱신 ${pricesUpdatedAt.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}`
                          : `${liveFeedCount} live / ${indexedFeedCount} indexed prices updated ${pricesUpdatedAt.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}`
                        : t('Indexed and manual rows stay usable before the next live refresh.')
                }
              />
              <CompactValueRow
                label={t('Basis')}
                value={basis === 'reference' ? t('Academic (monthly averages)') : t('Practical (live quotes)')}
                detail={basis === 'reference'
                  ? t('IMF PCPS and Johnson Matthey monthly averages; the latest published month prices the estimate.')
                  : t('Switch the basis from the sidebar.')}
              />
              <CompactValueRow label={t('Manual overrides')} value={String(manualOverrideCount)} detail={t('Materials priced by hand instead of a tracked source.')} />
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-900/8 bg-white/62 p-4">
            <div className="cp-subtle-label">{t('Current case')}</div>
            <div className="mt-2 text-base font-semibold text-[#191f28]">{t(catalystDomainLabel(catalystDomain))}</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">{recipeSummary}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="cp-chip">{t(catalystDomainLabel(catalystDomain))}</span>
              {catalystDomain === 'electrocatalyst' ? <span className="cp-chip">{t(applicationFamilyLabel(applicationFamily))}</span> : null}
              {activeBenchmark ? <span className="cp-chip">{activeBenchmark.title}</span> : null}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-900/8 bg-white/62 p-4">
            <div className="cp-subtle-label">{t('Preparation basis')}</div>
            <div className="mt-2 text-base font-semibold text-[#191f28]">{preparationSummary}</div>
            <div className="mt-2 space-y-1">
              <CompactValueRow label={t('Production scale')} value={lang === 'ko' ? `${orderSize}톤` : `${orderSize} tons`} detail={lang === 'ko' ? `${t(scale.label)} / ${scale.rate}` : `${scale.label} scale / ${scale.rate}`} />
              <CompactValueRow
                label={t('Steps')}
                value={String(steps.length)}
                detail={steps.length > 0 ? `${t(formatStepLabel(steps[0]!))}${steps.length > 1 ? ` +${steps.length - 1}` : ''}` : t('Choose at least one preparation step')}
              />
              <CompactValueRow
                label={catalystDomain === 'thermal' ? t('Recovery') : t('Application')}
                value={recoverySummary}
                detail={
                  catalystDomain === 'thermal'
                    ? t('Optional spent-catalyst recovery credit for recovery-sensitive screening.')
                    : t('Application family currently selected.')
                }
              />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#191f28] bg-[#191f28] p-4 text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div className="cp-subtle-label !text-slate-400">{t('Latest result')}</div>
              <button onClick={() => navigate('/calculator/result')} disabled={!latestSnapshotForCurrentCase} className="cp-button-ink px-3 py-2 text-xs">
                {t('Open')}
              </button>
            </div>
            <div className="mt-3 flex items-end gap-2">
              {latestSnapshotForCurrentCase ? (
                <FitPriceText
                  size="md"
                  text={formatPrice(toDisplay(latestSnapshotForCurrentCase.result.summary.estimated_price_per_lb))}
                  className="min-w-0 text-white"
                />
              ) : (
                <div className="font-display text-[1.6rem] leading-none text-white">{t('Pending')}</div>
              )}
              <div className="pb-1 text-sm text-slate-300">{latestSnapshotForCurrentCase ? fmtLabel : ''}</div>
            </div>
            <div className="mt-2 text-xs leading-6 text-slate-300">
              {latestSnapshotForCurrentCase
                ? lang === 'ko'
                  ? `${latestGenerated} 계산. 담체 ${latestSnapshotForCurrentCase.selectedSupportName ?? '미지정'} 기준.`
                  : `Generated ${latestGenerated}. ${latestSnapshotForCurrentCase.selectedSupportName ?? 'Support'} remained the active basis.`
                : t('No result for this catalyst class yet. Run the estimate once to populate this summary.')}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderSetupSection() {
    return (
      <section className="surface-card p-5">
        <div>
          <div className="cp-subtle-label">{t('Catalyst type')}</div>
          <h2 className="cp-heading-lg mt-2">{t('Choose the catalyst class before you build the formulation.')}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            {t('Thermocatalyst keeps bulk composition and support balance together. Electrocatalyst separates catalyst powder, ionomer, membrane, and substrate.')}
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {([
            {
              value: 'thermal' as const,
              title: 'Thermocatalyst',
              note: 'Use bulk composition, support share, and plant-style preparation steps in one estimate.',
              detail: 'Best for supported metal catalysts, mixed oxides, zeolites, and reforming or cracking routes.',
            },
            {
              value: 'electrocatalyst' as const,
              title: 'Electrocatalyst',
              note: 'Split the electrode assembly into catalyst powder, ionomer, membrane, and substrate.',
              detail: 'Best for PEMFC, PEMWE, DMFC, and other electrode fabrication routes.',
            },
          ]).map((option) => {
            const active = catalystDomain === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleCatalystDomainChange(option.value)}
                className={`rounded-[22px] border px-4 py-4 text-left transition ${
                  active
                    ? 'border-slate-950 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                    : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="cp-heading-sm">{t(option.title)}</div>
                  <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                    active ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {active ? t('Selected') : t('Choose')}
                  </span>
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-700">{t(option.note)}</div>
                <div className="mt-2 text-xs leading-6 text-slate-600">{t(option.detail)}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-6 text-slate-600">
              {t('Selected:')} <span className="font-semibold text-[#191f28]">{t(catalystDomainLabel(catalystDomain))}</span>. {t('Switching the catalyst class does not advance to the next step.')}
            </div>
            <button
              type="button"
              onClick={handleEstimateNext}
              className="cp-button-primary flex-none px-4 py-2 text-xs"
            >
              {t('Next: Composition →')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderInputsSection() {
    if (catalystDomain === 'electrocatalyst') {
      return (
        <section className="surface-card p-5">
          <div>
            <div className="cp-subtle-label">{t('Composition')}</div>
            <h2 className="cp-heading-lg mt-2">{t('Build the electrode assembly.')}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t('Choose the stored material records first, then tune the geometric inputs used for area-based costing.')}
            </p>
          </div>
          {!isElectroValid ? (
            <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              {electrocatalystValidationMessage}
            </div>
          ) : null}
          <div className="mt-5">{renderElectrocatalystPanel()}</div>
        </section>
      );
    }

    return (
      <section className="surface-card p-5">
        <div>
          <div className="cp-subtle-label">{t('Composition')}</div>
          <h2 className="cp-heading-lg mt-2">{t('Define the catalyst formulation.')}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {t('Keep active metals and promoters explicit. A single support row auto-balances the formulation, and multiple support rows enable promoted-support formulations up to four total components.')}
          </p>
        </div>
        {!isThermalValid ? (
          <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            {thermalValidationMessage}
          </div>
        ) : null}

        <div className="mt-5 space-y-3.5">
        {renderRows('active_metal')}
        {renderRows('promoter')}
        <div className="surface-ghost p-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#0d9488]" /><h3 className="cp-heading-sm">{t('Support')}</h3></div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {supportIsSplit
                  ? t('Promoted support is on. Enter each support wt% explicitly so the total formulation closes at 100 wt%.')
                  : t('Single-support mode stays auto-balanced. Add a second support to split the support bed explicitly.')}
              </p>
            </div>
            <button onClick={() => addRow('support')} disabled={thermalRows.length >= maxThermalComponents} className="cp-button-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-45">{t('Add support')}</button>
          </div>
          {supportRows.map((row) => (
            <div key={row.id} className="mt-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <select value={row.selection_key ?? ''} onChange={(event) => selectThermalOption(row.id, event.target.value)} className="input-base min-w-[220px] flex-[1.5_1_320px] pr-10">
                  <option value="">{t('Select support')}</option>
                  {supportSelectionOptions.map((support) => <option key={support.selection_key} value={support.selection_key}>{compactThermalOptionLabel(support, lang)}</option>)}
                </select>
                {supportIsSplit ? (
                  <div className="flex flex-none items-center gap-2">
                    <input type="number" step="0.1" min="0" max="100" value={row.wt_pct} onChange={(event) => updateRow(row.id, { wt_pct: Number(event.target.value) })} className="input-base w-28 text-right font-mono" />
                    <span className="text-xs text-slate-600">wt%</span>
                  </div>
                ) : (
                  <div className="input-base flex min-w-[170px] flex-none items-center justify-between gap-3 bg-white/76"><span className="text-xs text-slate-600">{t('Auto share')}</span><span className="font-mono text-[#191f28]">{supportWtPct.toFixed(1)} wt%</span></div>
                )}
                {sourceChip(row)}
                {priceField(row)}
                {supportRows.length > 1 ? <button onClick={() => removeRow(row.id)} className="flex h-10 w-10 flex-none items-center justify-center rounded-[18px] border border-slate-300 bg-white/74 text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700" aria-label={t("Remove support")}>x</button> : null}
              </div>
              <div className="mt-3 text-xs text-slate-600">{row.name || t('Select a support record.')}</div>
            </div>
          ))}
          <div className="mt-3 rounded-[18px] border border-slate-200 bg-white/76 px-4 py-3 text-xs leading-6 text-slate-600">
            {t('Total components:')} <span className="font-semibold text-[#191f28]">{thermalRows.length}</span> / {maxThermalComponents}.
            {supportIsSplit
              ? (lang === 'ko' ? ` 현재 조성 합계: ${totalThermalWt.toFixed(1)} wt%.` : ` Current formulation total: ${totalThermalWt.toFixed(1)} wt%.`)
              : (lang === 'ko' ? ` 담체가 ${supportWtPct.toFixed(1)} wt%로 자동으로 채워집니다.` : ` Support closes automatically at ${supportWtPct.toFixed(1)} wt%.`)}
          </div>
        </div>
        </div>
      </section>
    );
  }

  function renderManufacturingSection() {
    const visibleSteps = catalystDomain === 'electrocatalyst'
      ? [...ALL_STEPS]
      : ALL_STEPS.filter((step) => !ELECTRO_ONLY_STEPS.has(step.key));
    const visibleCategories = [...new Set(visibleSteps.map((step) => step.category))];
    const selectedCategoryCount = visibleCategories.filter(
      (category) => selectedStepKeysForCategory(category, steps).length > 0,
    ).length;

    return (
      <section className="surface-card p-5">
        <div>
          <div className="cp-subtle-label">{t('Preparation method')}</div>
          <h2 className="cp-heading-lg mt-2">{t('Choose the preparation basis.')}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {catalystDomain === 'electrocatalyst'
              ? t('Templates add pretreatment, coating, drying, lamination, and break-in steps. Adjust them if the lab route differs.')
              : t('Pick the industrial steps that best approximate the synthesis route, then let the production scale set the equipment basis.')}
          </p>
        </div>

        <div className="mt-5 space-y-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-[20px] border border-slate-200 bg-white/82 px-4 py-3">
            <div className="cp-subtle-label">{t('Route building')}</div>
            <div className="mt-2 text-sm font-semibold text-[#191f28]">{t('Select every preparation step that applies')}</div>
            <div className="mt-1 text-xs leading-6 text-slate-600">
              {t('You are assembling the full preparation route, not choosing a single option.')}
            </div>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-white/82 px-4 py-3">
            <div className="cp-subtle-label">{t('Operation groups')}</div>
            <div className="mt-2 text-sm font-semibold text-[#191f28]">{t('One group can hold several preparation steps')}</div>
            <div className="mt-1 text-xs leading-6 text-slate-600">
              {t('Saved thermal and electrochemical routes often include several operations from the same group.')}
            </div>
          </div>
          <div className="rounded-[20px] border border-[#0d9488] bg-[#e6f5f2] px-4 py-3">
            <div className="cp-subtle-label !text-[#0f766e]">{t('Current route')}</div>
            <div className="mt-2 text-sm font-semibold text-[#191f28]">
              {lang === 'ko'
                ? `${selectedCategoryCount}개 그룹에서 제조 단계 ${steps.length}개 선택됨`
                : `${steps.length} preparation step${steps.length === 1 ? '' : 's'} across ${selectedCategoryCount} group${selectedCategoryCount === 1 ? '' : 's'}`}
            </div>
            <div className="mt-1 text-xs leading-6 text-slate-600">
              {t('Add or remove operations until the route matches the actual lab or pilot procedure.')}
            </div>
          </div>
        </div>
        {activeBenchmark ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-sm text-emerald-900">
            <div className="cp-subtle-label !text-emerald-700">{t('Loaded reference baseline')}</div>
            <div className="mt-2 font-semibold">{activeBenchmark.route.name}</div>
            <div className="mt-2 leading-6">{activeBenchmark.screening_summary}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="cp-chip">{catalystDomainLabel(activeBenchmark.catalyst_domain)}</span>
              <span className="cp-chip">{t(applicationFamilyLabel(activeBenchmark.application_family))}</span>
            </div>
          </div>
        ) : null}
        {catalystDomain === 'thermal' && thermalTemplates.length > 0 ? (
          <div className="surface-ghost p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="cp-subtle-label">{t('Start from a standard method')}</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {lang === 'ko' ? `제조법 ${thermalTemplates.length}개` : `${thermalTemplates.length} ${t('methods')}`}
              </div>
            </div>
            <div className="mt-2 text-xs leading-6 text-slate-600">
              {t('Loads the full unit-operation sequence for a named preparation method — co-precipitation, sol-gel, impregnation, zeolite synthesis and more. Operations stay editable afterward.')}
              {' '}
              {t('Each card shows the processing cost of the route alone at the current production scale, before materials.')}
            </div>
            {[...new Set(thermalTemplates.map((template) => template.category || 'Other'))].map((category) => (
              <div key={category} className="mt-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t(category)}</div>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {thermalTemplates.filter((template) => (template.category || 'Other') === category).map((template) => {
                    const cost = templateCosts[template.id];
                    const routeSteps = cost?.steps_fitted?.length ? cost.steps_fitted : template.steps;
                    const active = matchedThermalTemplate?.id === template.id;
                    const uncosted = cost?.uncosted_operations ?? template.uncosted_operations ?? [];
                    const substitutions = cost?.substitutions ?? [];
                    const costLabel = cost?.processing_cost_per_lb != null
                      ? `${formatPrice(toDisplay(cost.processing_cost_per_lb))}${fmtLabel}`
                      : null;
                    return (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedThermalTemplateId(template.id);
                          setSteps([...routeSteps]);
                        }}
                        title={[
                          template.description,
                          routeSteps.map(formatStepLabel).join(' → '),
                          substitutions.length ? `${t('Scale-fitted')}: ${substitutions.map((s) => `${formatStepLabel(s.from)} → ${formatStepLabel(s.to)}`).join(', ')}` : '',
                          uncosted.length ? `${t('Not costed')}: ${uncosted.join('; ')}` : '',
                        ].filter(Boolean).join('\n')}
                        className={`rounded-[16px] border px-3 py-2.5 text-left transition ${
                          active
                            ? 'border-[#0d9488] bg-[#e6f5f2]'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className={`text-sm font-semibold ${active ? 'text-[#0f766e]' : 'text-[#191f28]'}`}>{template.name}</div>
                          {costLabel ? <div className="whitespace-nowrap font-mono text-sm text-[#191f28]">{costLabel}</div> : null}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {template.example_catalysts.slice(0, 3).join(', ')}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                          <span>{routeSteps.length} {t('steps')}</span>
                          {substitutions.length ? <span className="rounded-full border border-slate-200 px-1.5">{t('Scale-fitted')}</span> : null}
                          {uncosted.length ? <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 text-amber-700">{t('Partly costed')}</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="surface-ghost p-3.5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div><div className="cp-subtle-label">{t('Production scale')}</div><div className="mt-3 flex flex-wrap items-center gap-3"><input type="number" min="1" step="1" value={orderSize} onChange={(event) => setOrderSize(Math.max(1, Number(event.target.value) || 1))} className="input-base w-32 text-center font-mono" title={t('Order size in tons; sets the Small, Medium or Large equipment basis.')} /><span className="text-sm text-slate-600">{t('tons')}</span><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${scale.classes}`}>{t(scale.label)} / {scale.rate}</span></div></div>
            <div className="cp-toolbar">{QUICK_ORDER_SIZES.map((size) => <button key={size} onClick={() => setOrderSize(size)} className={`rounded-[16px] px-3 py-2 text-xs font-semibold transition ${orderSize === size ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>{lang === 'ko' ? `${size}톤` : `${size} tons`}</button>)}</div>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {visibleCategories.map((category) => {
            const selectedInCategory = selectedStepKeysForCategory(category, steps);
            return (
              <div key={category} className="surface-ghost p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="cp-subtle-label">{t(category)}</div>
                  <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    selectedInCategory.length > 0
                      ? 'border-[#0d9488] bg-[#e6f5f2] text-[#0f766e]'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}>
                    {lang === 'ko' ? `${selectedInCategory.length}개 선택` : `${selectedInCategory.length} selected`}
                  </div>
                </div>
                <div className="mt-2 text-xs leading-6 text-slate-600">{t('Select every operation your route uses in this group.')}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {visibleSteps.filter((step) => step.category === category).map((step) => {
                    const available = (step.scales as readonly Scale[]).includes(currentScale);
                    const checked = steps.includes(step.key);
                    const availabilityLabel = step.scales.length === 3 ? null : step.scales.map((item) => item.charAt(0).toUpperCase()).join('/');
                    return <button key={step.key} onClick={() => available && toggleStep(step.key)} disabled={!available} title={available ? t(step.label) : `${t('Unavailable at this production scale')}: ${t(scale.label)}`} className={`rounded-[16px] border px-3 py-2 text-left text-sm transition ${!available ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : checked ? 'border-[#0d9488] bg-[#e6f5f2] text-[#0f766e]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}><div className="flex items-center justify-between gap-3"><div className="font-medium">{t(step.label)}</div>{checked ? <span className="rounded-full border border-[#0d9488] bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">{t("On")}</span> : null}</div>{availabilityLabel ? <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{availabilityLabel}</div> : null}</button>;
                  })}
                </div>
                {selectedInCategory.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedInCategory.map((stepKey) => (
                      <span key={stepKey} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                        {t(formatStepLabel(stepKey))}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {catalystDomain === 'thermal' ? (
          <div className="rounded-[24px] border border-slate-900/8 bg-white/72 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="cp-subtle-label">{t('Recovery scenario')}</div>
                <div className="cp-heading-sm mt-2">{t('Optional spent-catalyst recovery credit')}</div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {t('Use this when the catalyst contains recoverable metal and end-of-life value matters to the screening decision.')}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  {t('Current engine includes support loss, reactor-type loss, refining loss, and recovery cost. Full deactivation and regeneration-cycle modeling is not yet included.')}
                </p>
              </div>
              <button
                onClick={() => setIncludeSpentValue((previous) => !previous)}
                className={`rounded-[18px] border px-4 py-2.5 text-sm font-semibold transition ${
                  includeSpentValue
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {includeSpentValue ? t('Recovery on') : t('Recovery off')}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Reactor type')}</div>
                <select
                  value={reactorType}
                  onChange={(event) => setReactorType(event.target.value as 'fixed' | 'slurry')}
                  className="input-base mt-2"
                >
                  <option value="fixed">{t('Fixed bed')}</option>
                  <option value="slurry">{t('Slurry')}</option>
                </select>
              </label>

              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Bulk density')}</div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={catalystBulkDensity}
                    onChange={(event) => setCatalystBulkDensity(Math.max(1, Number(event.target.value) || 1))}
                    className="input-base w-full text-right font-mono"
                  />
                  <span className="text-xs text-slate-600">lb/ft³</span>
                </div>
              </label>

              <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="cp-subtle-label">{t('Screening use')}</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">
                  {t('Best for Pt, Pd, Rh, Ru, Ir, Ni, and Co routes where salvage value changes the commercial basis.')}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        </div>
      </section>
    );
  }

  const validationMessage = catalystDomain === 'electrocatalyst'
    ? isValid
      ? (lang === 'ko'
        ? `전극 조립체가 준비되었습니다: ${selectedCatalystMaterial?.name ?? 'catalyst'}, ${selectedIonomerMaterial?.name ?? 'ionomer'}, ${selectedMembraneMaterial?.name ?? 'membrane'}, ${selectedSubstrateMaterial?.name ?? 'GDL'} 모두 라이브러리에서 선택되었습니다.`
        : `Electrocatalyst stack is ready: ${selectedCatalystMaterial?.name ?? 'catalyst'}, ${selectedIonomerMaterial?.name ?? 'ionomer'}, ${selectedMembraneMaterial?.name ?? 'membrane'}, and ${selectedSubstrateMaterial?.name ?? 'GDL'} are all sourced from the library.`)
      : electrocatalystValidationMessage
    : isValid
      ? (lang === 'ko'
        ? `조성 균형이 유효합니다: 활성 금속·조촉매 ${nonSupportWt.toFixed(1)} wt%, 담체 ${supportWtPct.toFixed(1)} wt%.`
        : `Formulation balance is valid: ${nonSupportWt.toFixed(1)} wt% actives and promoters, ${supportWtPct.toFixed(1)} wt% support.`)
      : thermalValidationMessage;

  const activeWorkspaceSection = sectionState.activeSection.id === 'type'
    ? renderSetupSection()
    : sectionState.activeSection.id === 'composition'
      ? renderInputsSection()
      : sectionState.activeSection.id === 'manufacturing'
        ? renderManufacturingSection()
        : (
          <section className="surface-card p-4">
            <div className={`rounded-[24px] border px-4 py-4 text-sm ${isValid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{validationMessage}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricTile label={t('Catalyst type')} value={t(catalystDomainLabel(catalystDomain))} detail={t('Current case basis')} />
              <MetricTile label={t('Preparation steps')} value={String(steps.length)} detail={steps.length > 0 ? t('Ready to run') : t('Choose at least one preparation step')} />
              <MetricTile label={t('Production scale')} value={lang === 'ko' ? `${orderSize}톤` : `${orderSize} tons`} detail={`${t(scale.label)} / ${scale.rate}`} />
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button onClick={handleCalculate} disabled={loading || !isValid || steps.length === 0} className="cp-button-primary min-w-[250px]">{loading ? <><span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />{t('Running estimate')}</> : t('Run estimate')}</button>
              <div className="text-xs leading-6 text-slate-600">{t('The result screen opens separately and keeps these inputs intact.')}</div>
            </div>
            {error ? <div className="mt-4 rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700"><span className="font-semibold">{t('Calculation failed.')}</span> {t(error)}</div> : null}
            {loadedSavedName ? (
              <div className="mt-4 rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {lang === 'ko'
                  ? <>저장된 계산 <span className="font-semibold">{loadedSavedName}</span>을(를) 현재 입력으로 불러왔습니다. 라이브러리 링크가 없는 행은 저장된 가격을 수동 입력값으로 복원했습니다.</>
                  : <>{t("Loaded saved estimate")} <span className="font-semibold">{loadedSavedName}</span> {t("into the draft. Rows without a library link were restored with their saved prices as manual inputs.")}</>}
              </div>
            ) : null}
            {savedEstimates.length > 0 ? (
              <div className="mt-4 surface-ghost p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="cp-subtle-label">{t('Saved estimates')}</div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {lang === 'ko' ? `${savedEstimates.length}개 저장됨` : `${savedEstimates.length} ${t('saved')}`}
                  </div>
                </div>
                <div className="mt-2 text-xs leading-6 text-slate-600">
                  {t('Named cases saved from the result screen. Load restores the composition, unit operations, and production scale into this draft.')}
                </div>
                <div className="mt-3 space-y-2">
                  {savedEstimates.map((saved) => {
                    const busy = savedBusyId === saved.id;
                    const loadable = true;
                    return (
                      <div key={saved.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-white px-3.5 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[#191f28]">{saved.name}</div>
                          <div className="mt-0.5 text-xs text-slate-600">
                            {saved.metal_symbol ? `${saved.metal_loading_wt_pct}% ${saved.metal_symbol}` : saved.catalyst_domain}
                            {saved.support_name ? ` / ${saved.support_name}` : ''} · {saved.order_size_tons} {t("tons ·")}{' '}
                            {formatPrice(toDisplay(saved.estimated_price_per_lb))}{fmtLabel} · {saved.created_at.slice(0, 10)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleLoadSaved(saved)}
                            disabled={busy || !loadable}
                            title={t("Restore this case into the draft")}
                            className={`rounded-[14px] border px-3 py-1.5 text-xs font-semibold transition ${
                              loadable
                                ? 'border-[#0d9488] bg-[#e6f5f2] text-[#0f766e] hover:bg-[#d3efe9]'
                                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                            }`}
                          >
                            {busy ? t('Working…') : t('Load')}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteSaved(saved.id)}
                            disabled={busy}
                            className="rounded-[14px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            {t('Delete')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 px-1 pt-1">
        <div>
          <h2 className="cp-heading-xl">{t('Cost Estimate')}</h2>
          <p className="mt-1 text-sm text-[#68727f]">
            {catalystDomain === 'electrocatalyst'
              ? t('Choose the catalyst class, build the electrode assembly, set the preparation basis, then run the estimate.')
              : t('Choose the catalyst class, define the formulation, set the preparation basis, then run the estimate.')}
          </p>
        </div>
      </div>

      <WorkspaceSectionNav
        sections={ESTIMATE_SECTIONS}
        activeSectionId={sectionState.activeSectionId}
        activeIndex={sectionState.activeIndex}
        onSelect={handleEstimateSectionSelect}
        disabledSectionIds={disabledEstimateSections}
      />

      {sectionState.activeSectionId !== 'type' ? renderWorkspaceSummary() : null}

      <div className="flex flex-1 flex-col gap-4">{activeWorkspaceSection}</div>

      <WorkspaceSectionFooter
        activeSection={sectionState.activeSection}
        activeIndex={sectionState.activeIndex}
        totalSections={ESTIMATE_SECTIONS.length}
        onPrevious={sectionState.goPrevious}
        onNext={handleEstimateNext}
        canGoPrevious={sectionState.canGoPrevious}
        canGoNext={sectionState.canGoNext && canAdvanceCurrentSection}
      />
    </div>
  );
}
