// Port 8765 must match BACKEND_PORT in electron/main.js (single source of truth).
const API_ROOT =
  typeof window !== 'undefined' && window.location.protocol === 'file:'
    ? 'http://127.0.0.1:8765/api'
    : '/api';

export function apiUrl(path: string): string {
  return `${API_ROOT}${path}`;
}

function buildRequestInit(options?: RequestInit): RequestInit {
  const headers = new Headers(options?.headers);
  const body = options?.body;
  if (!(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return {
    ...options,
    headers,
  };
}

function formatApiErrorDetail(detail: unknown): string {
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const msg = typeof record.msg === 'string' ? record.msg : '';
          const loc = Array.isArray(record.loc)
            ? record.loc.filter((part) => part !== 'body').map(String).join(' -> ')
            : '';
          if (loc && msg) return `${loc}: ${msg}`;
          if (msg) return msg;
        }
        return formatApiErrorDetail(item);
      })
      .filter(Boolean);

    return messages.join(' | ');
  }

  if (detail && typeof detail === 'object') {
    const record = detail as Record<string, unknown>;
    if ('detail' in record) {
      return formatApiErrorDetail(record.detail);
    }
    if (typeof record.msg === 'string' && record.msg.trim()) {
      return record.msg;
    }
  }

  return '';
}

async function ensureOk(res: Response): Promise<Response> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(formatApiErrorDetail(err.detail ?? err) || res.statusText);
  }
  return res;
}

// The packaged FastAPI sidecar can take up to ~60s to boot on first launch
// (Windows Defender scan, PyInstaller cold start). Retry network failures
// (fetch TypeError = couldn't reach the server) until the backend responds
// at least once, so initial page loads keep showing skeletons instead of
// flashing "Failed to fetch". After confirmed-ready, fail fast so a
// mid-session backend failure surfaces immediately. HTTP error responses
// (4xx/5xx) are never retried — the server answered, just not how we wanted.
let backendConfirmedReady = false;
const BOOT_RETRY_MAX_ATTEMPTS = 30;
const BOOT_RETRY_DELAY_MS = 2000;

async function fetchWithBootRetry(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const maxAttempts = backendConfirmedReady ? 1 : BOOT_RETRY_MAX_ATTEMPTS;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(input, init);
      backendConfirmedReady = true;
      return res;
    } catch (err) {
      lastError = err;
      if (!(err instanceof TypeError)) throw err;
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, BOOT_RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await ensureOk(await fetchWithBootRetry(apiUrl(path), buildRequestInit(options)));
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error(`Expected JSON from ${path} but got non-JSON response (status ${res.status}).`);
  }
}

async function requestText(path: string, options?: RequestInit): Promise<string> {
  const res = await ensureOk(await fetchWithBootRetry(apiUrl(path), buildRequestInit(options)));
  return res.text();
}

// Calculator
export type CatalystDomain = 'thermal' | 'electrocatalyst' | 'general' | 'both';
// 'live': daily quotes the app shows day to day. 'reference': institutional
// monthly averages (IMF PCPS, Johnson Matthey) used as the academic basis.
export type PriceBasis = 'live' | 'reference';
export type ApplicationFamily = 'general' | 'fuel_cell' | 'direct_methanol_fuel_cell' | 'electrolyzer';

export interface ComponentInput {
  role: 'active_metal' | 'active_catalyst' | 'promoter' | 'support';
  material_key?: string;
  name?: string;
  wt_pct: number;
  price_per_lb?: number;
  precursor_markup?: number;
}

export interface ElectrodeCostInput {
  application_family?: ApplicationFamily;
  catalyst_material_key?: string;
  ionomer_material_key?: string;
  substrate_material_key?: string;
  membrane_material_key?: string;
  active_area_cm2: number;
  catalyst_loading_mg_cm2: number;
  ionomer_to_catalyst_ratio: number;
  ionomer_price_per_ml?: number;
  ionomer_price_per_kg_solids?: number;
  ionomer_density_g_ml?: number;
  ionomer_solids_fraction?: number;
  substrate_cost_per_cm2?: number;
  membrane_cost_per_cm2?: number;
  manufacturing_scenario?: 'rnd_batch' | 'pilot_roll_to_roll';
}

export interface CostInput {
  components?: ComponentInput[];
  steps: string[];
  catalyst_domain?: Extract<CatalystDomain, 'thermal' | 'electrocatalyst'>;
  application_family?: ApplicationFamily;
  template_id?: string;
  order_size_tons: number;
  ga_overhead_pct?: number;
  sard_pct?: number;
  basis_year?: number;
  target_year?: number;
  include_spent_value?: boolean;
  reactor_type?: string;
  catalyst_bulk_density?: number;
  electrode_input?: ElectrodeCostInput;
  price_basis?: PriceBasis;
}

export interface ComponentBreakdown {
  role: string;
  name: string;
  wt_pct: number;
  wt_frac: number;
  price_per_lb: number;
  precursor_markup: number;
  cost_per_lb_cat: number;
  cost_pct: number;
}

export interface CostResult {
  warnings?: string[];
  input_summary: Record<string, unknown>;
  materials: {
    components: ComponentBreakdown[];
    total_materials_cost_per_lb: number;
  };
  step_method: {
    scale: string;
    campaign_days: number;
    processing_cost_per_lb: number;
    estimated_price_per_lb: number;
    estimated_price_per_kg: number;
    margin_pct: number;
    [key: string]: unknown;
  };
  electrode_model?: {
    application_family: string;
    active_area_cm2: number;
    catalyst_loading_mg_cm2: number;
    catalyst_mass_g: number;
    catalyst_cost_usd: number;
    ionomer_to_catalyst_ratio: number;
    ionomer_pricing_mode: string;
    ionomer_solids_mass_g: number;
    ionomer_dispersion_volume_ml: number;
    ionomer_cost_usd: number;
    substrate_cost_usd: number;
    membrane_cost_usd: number;
    manufacturing_cost_usd?: number;
    manufacturing?: {
      scenario: string;
      label: string;
      usd_per_cm2: number;
      eur_per_m2: number;
      eur_to_usd: number;
      fx_basis: string;
      source: string;
      reference_url: string;
      confidence: string;
    } | null;
    total_cost_usd: number;
    cost_per_cm2_usd: number;
    cost_per_m2_usd: number;
    breakdown: Array<{ label: string; cost_usd: number }>;
  } | null;
  route_summary?: {
    template_id: string;
    name: string;
    catalyst_domain: string;
    application_family: string;
    manufacturing_mode: string;
    preprocess: string[];
    synthesis: string[];
    postprocess: string[];
    quality_gates: string[];
    steps: string[];
    route_note: string;
    source: string;
    reference_urls: string[];
  } | null;
  spent_catalyst?: {
    metal_symbol: string;
    metal_loading_lb_per_lb: number;
    loss_use_pct: number;
    loss_refining_pct: number;
    V_metal_per_lb: number;
    C_recovery_per_lb: number;
    V_reclaimed_per_lb: number;
  } | null;
  resolved_materials?: Array<{
    material_key: string;
    used_for: string;
    name: string;
    category: string;
    catalyst_domain: string;
    application_family: string;
    price: number;
    price_unit: string;
    price_scope: string;
    pack_quantity: number | null;
    pack_unit: string | null;
    quote_year: number | null;
    quote_source: string;
    pricing_basis: string;
    reference_url: string;
    notes: string;
    normalized_price_per_lb?: number;
    normalized_price_per_ml?: number;
    normalized_price_per_cm2?: number;
    normalized_price_per_kg_solids?: number;
    raw_price_per_lb?: number;
    escalation_factor?: number;
    escalation_basis_year?: number | null;
    escalation_target_year?: number;
    live_override?:
      | {
          applied: true;
          live_price: number;
          live_price_unit: string;
          live_source: string;
          live_fetched_at: string | null;
          fallback_price: number;
          fallback_price_unit: string;
          fallback_source: string;
          fallback_quote_year: number | null;
        }
      | {
          applied: false;
          reason: string;
        };
  }>;
  lca?: LcaResult;
  summary: {
    estimated_price_per_lb: number;
    estimated_price_per_kg: number;
    net_cost_per_lb: number;
    net_cost_per_kg: number;
    materials_pct: number;
    processing_pct: number;
    gwp_kg_co2eq_per_kg_catalyst?: number | null;
    ced_mj_per_kg_catalyst?: number | null;
    lca_coverage_pct?: number;
  };
}

export interface LcaPerComponent {
  name: string;
  role: string | null;
  wt_pct: number;
  matched_key: string | null;
  factor_status: 'matched' | 'matched_alias' | 'no_factor_in_dataset' | 'explicitly_unsupported';
  gwp_kg_co2eq_per_kg_material?: number;
  ced_mj_per_kg_material?: number;
  gwp_contribution_kg_co2eq_per_kg_catalyst: number | null;
  ced_contribution_mj_per_kg_catalyst: number | null;
  process_name?: string;
  data_origin?: string;
}

export interface LcaReference {
  citation: string;
  doi: string;
  url: string;
  license: string;
  table_of_origin: string;
  underlying_lci_database: string;
  uncertainty_basis: string;
  notes: string;
}

export interface LcaResult {
  gwp_kg_co2eq_per_kg_catalyst: number | null;
  ced_mj_per_kg_catalyst: number | null;
  per_component: LcaPerComponent[];
  data_gap_pct: number;
  coverage_pct: number;
  warnings: string[];
  reference: LcaReference;
  impact_categories: Record<string, { label: string; unit: string; characterization: string }>;
}

export const fetchLcaFactors = () => request<{ primary_reference: LcaReference; factors: Record<string, unknown> }>(
  '/lca/factors',
);

export const calculateLca = (components: Array<{ name: string; wt_pct: number; role?: string }>) =>
  request<LcaResult>('/lca/calculate', {
    method: 'POST',
    body: JSON.stringify({ components }),
  });

export const calculateCost = (input: CostInput) =>
  request<CostResult>('/calculate', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export interface SavedEstimateResponse {
  id: number;
  result: CostResult;
}

export const saveEstimate = (input: CostInput, name = 'Untitled') =>
  request<SavedEstimateResponse>(`/calculate/save?name=${encodeURIComponent(name)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export interface SavedEstimateSummary {
  id: number;
  name: string;
  description: string;
  catalyst_domain: string;
  application_family: string;
  calculation_model: string;
  metal_symbol: string;
  metal_loading_wt_pct: number;
  support_name: string;
  order_size_tons: number;
  estimated_price_per_lb: number;
  created_at: string;
}

export interface SavedEstimateDetail extends SavedEstimateSummary {
  input: Record<string, unknown>;
  result: CostResult;
}

export interface SavedEstimateQuery {
  q?: string;
  catalystDomain?: CatalystDomain;
  limit?: number;
}

export const fetchSavedEstimates = (query: SavedEstimateQuery = {}) => {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.catalystDomain) params.set('catalyst_domain', query.catalystDomain);
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return request<SavedEstimateSummary[]>(`/estimates${qs ? `?${qs}` : ''}`);
};

export const fetchSavedEstimate = (estimateId: number) =>
  request<SavedEstimateDetail>(`/estimates/${estimateId}`);

export const deleteSavedEstimate = (estimateId: number) =>
  request<DeleteResponse>(`/estimates/${estimateId}`, {
    method: 'DELETE',
  });

// Prices
export interface MetalPrice {
  symbol: string;
  name: string;
  price: number;
  unit: string;
  source: string;
  source_type: 'live' | 'indexed' | 'manual';
  is_live: boolean;
  fetched_at: string | null;
  basis: PriceBasis;
  basis_month: string | null;
  needs_review: boolean;
  evidence: {
    tier: string;
    confidence_score: number;
    transparency: string;
    acquisition_mode: string;
    freshness_target_hours: number | null;
    freshness_status: string;
    age_hours: number | null;
    label: string;
    note: string;
  };
}

export const fetchPrices = (basis: PriceBasis = 'live') => request<MetalPrice[]>(`/prices?basis=${basis}`);
export const fetchPrice = (symbol: string, basis: PriceBasis = 'live') =>
  request<MetalPrice>(`/prices/${symbol}?basis=${basis}`);

export interface PriceHistoryPoint {
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
}

export interface PriceHistoryResponse {
  symbol: string;
  period: string;
  source: string;
  count: number;
  history: PriceHistoryPoint[];
}

export interface PriceHistoryQuery {
  period?: '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';
  from?: string;
  to?: string;
  basis?: PriceBasis;
}

export const fetchPriceHistory = (symbol: string, query: PriceHistoryQuery = {}) => {
  const params = new URLSearchParams();
  params.set('period', query.period ?? '1y');
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.basis) params.set('basis', query.basis);
  return request<PriceHistoryResponse>(`/prices/${symbol}/history?${params.toString()}`);
};

export interface PriceTrend {
  symbol: string;
  source: string;
  count: number;
  first: number | null;
  last: number | null;
  high: number | null;
  low: number | null;
  change_pct: number | null;
  points: Array<{ date: string; price: number }>;
}

export interface PriceTrendsResponse {
  period: string;
  basis?: PriceBasis;
  trends: Record<string, PriceTrend>;
}

export const fetchPriceTrends = (
  period: NonNullable<PriceHistoryQuery['period']> = '3mo',
  basis: PriceBasis = 'live',
) => request<PriceTrendsResponse>(`/prices/trends?period=${period}&basis=${basis}`);

export interface SupportPriceSeries {
  id: string;
  hs: string;
  name: string;
  material: string;
  library_keys: string[];
  note: string;
  unit: string;
  price: number | null;
  basis_month: string | null;
  source: string | null;
  months: number;
}

export interface SupportPricesResponse {
  basis: PriceBasis;
  source: string;
  series: SupportPriceSeries[];
}

export const fetchSupportPrices = (basis: PriceBasis = 'reference') =>
  request<SupportPricesResponse>(`/prices/supports?basis=${basis}`);

export interface PriceUsageEntry {
  family: string;
  title: string;
  reaction: string;
}

export const fetchPriceUsage = () =>
  request<{ usage: Record<string, PriceUsageEntry[]> }>('/prices/usage');

// Materials
export interface MaterialItem {
  id: string | number;
  name: string;
  symbol: string | null;
  formula: string | null;
  category: string;
  catalyst_domain: CatalystDomain;
  application_family: string;
  mw: number | null;
  density: number | null;
  concentration_pct: number | null;
  price: number | null;
  price_unit: string | null;
  price_scope: string;
  pack_quantity: number | null;
  pack_unit: string | null;
  quote_year: number | null;
  quote_source: string;
  notes: string;
  has_lab_data: boolean;
  pricing_basis: string;
  reference_url: string;
  is_custom: boolean;
  is_calculator_usable: boolean;
  normalized_price_per_lb: number | null;
}

export interface MaterialCreateInput {
  name: string;
  formula?: string | null;
  category: string;
  symbol?: string | null;
  mw?: number | null;
  density?: number | null;
  concentration_pct?: number | null;
  price?: number;
  price_unit?: string;
  price_scope?: string;
  pack_quantity?: number | null;
  pack_unit?: string | null;
  source?: string;
  quote_year?: number | null;
  notes?: string;
  has_lab_data?: boolean;
  catalyst_domain?: CatalystDomain;
  application_family?: string;
  pricing_basis?: string;
  reference_url?: string;
}

export interface MaterialUpdateInput {
  name?: string;
  formula?: string | null;
  category?: string;
  symbol?: string | null;
  mw?: number | null;
  density?: number | null;
  concentration_pct?: number | null;
  price?: number;
  price_unit?: string;
  price_scope?: string;
  pack_quantity?: number | null;
  pack_unit?: string | null;
  source?: string;
  quote_year?: number | null;
  notes?: string;
  has_lab_data?: boolean;
  catalyst_domain?: CatalystDomain;
  application_family?: string;
  pricing_basis?: string;
  reference_url?: string;
}

export interface DeleteResponse {
  status: string;
  id: string | number;
}

export const fetchMaterials = (
  category?: string,
  q?: string,
  catalystDomain?: CatalystDomain,
  applicationFamily?: string,
  limit?: number,
) => {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (q) params.set('q', q);
  if (catalystDomain) params.set('catalyst_domain', catalystDomain);
  if (applicationFamily) params.set('application_family', applicationFamily);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return request<MaterialItem[]>(`/materials${qs ? `?${qs}` : ''}`);
};

export const fetchMaterialCategories = () =>
  request<string[]>('/materials/categories');

export const fetchMaterialDomains = () =>
  request<string[]>('/materials/domains');

export const fetchMaterialApplicationFamilies = () =>
  request<string[]>('/materials/applications');

export const fetchMaterial = (materialId: number) =>
  request<MaterialItem>(`/materials/${materialId}`);

export const createMaterial = (input: MaterialCreateInput) =>
  request<MaterialItem>('/materials', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateMaterial = (materialId: number, input: MaterialUpdateInput) =>
  request<MaterialItem>(`/materials/${materialId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteMaterial = (materialId: number) =>
  request<DeleteResponse>(`/materials/${materialId}`, {
    method: 'DELETE',
  });

export interface ThermalCompositionOption {
  material_key: string;
  name: string;
  display_name: string;
  symbol: string | null;
  formula: string | null;
  category: string;
  price_per_lb: number;
  price_unit: string;
  price_scope: string;
  quote_source: string;
  quote_year: number | null;
  reference_url: string;
  source_type: 'indexed' | 'manual';
  selection_key: string;
  label: string;
}

export interface ThermalCompositionOptions {
  max_components: number;
  active_metal_options: ThermalCompositionOption[];
  promoter_options: ThermalCompositionOption[];
  support_options: ThermalCompositionOption[];
}

export const fetchThermalCompositionOptions = () =>
  request<ThermalCompositionOptions>('/materials/composition-options?catalyst_domain=thermal');

// Templates
export interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  catalyst_domain: CatalystDomain;
  application_family?: ApplicationFamily;
  manufacturing_mode?: string;
  example_catalysts: string[];
  preprocess?: string[];
  synthesis?: string[];
  postprocess?: string[];
  quality_gates?: string[];
  steps: string[];
  route_note?: string;
  source?: string;
  reference_urls?: string[];
  uncosted_operations?: string[];
}

export interface TemplateCost {
  id: string;
  name: string;
  category: string;
  catalyst_domain: CatalystDomain;
  steps: string[];
  steps_fitted: string[];
  substitutions: Array<{ from: string; to: string }>;
  dropped_steps: string[];
  uncosted_operations: string[];
  processing_cost_per_lb: number | null;
  processing_cost_per_kg: number | null;
  step_cost_per_hr: number | null;
  campaign_days: number | null;
}

export interface TemplateCostsResponse {
  order_size_tons: number;
  scale: 'small' | 'medium' | 'large';
  basis_year: number;
  target_year: number;
  chemppi_escalation: number;
  templates: TemplateCost[];
}

export const fetchTemplateCosts = (orderSizeTons: number, catalystDomain?: CatalystDomain) => {
  const params = new URLSearchParams({ order_size_tons: String(orderSizeTons) });
  if (catalystDomain) params.set('catalyst_domain', catalystDomain);
  return request<TemplateCostsResponse>(`/templates/costs?${params.toString()}`);
};

export const fetchTemplates = (catalystDomain?: CatalystDomain) =>
  request<ProcessTemplate[]>(`/templates${catalystDomain ? `?catalyst_domain=${catalystDomain}` : ''}`);

export const fetchTemplateDetail = (templateId: string) =>
  request<ProcessTemplate>(`/templates/${templateId}`);

export interface EquipmentItem {
  id?: string | number;
  category: string;
  name: string;
  size_units: string | null;
  s_lower: number | null;
  s_upper: number | null;
  a: number | null;
  b: number | null;
  n: number | null;
  c: number | null;
  d: number | null;
  function_type: string | null;
  source: string | null;
  cepci_basis: number | null;
  nf_refinery_basis: number | null;
  year: number | null;
  pricing_basis: string | null;
  installation_factor: number | null;
  labor_factor: number | null;
  note: string | null;
  materials: string[];
  material_factors: number[];
  is_custom?: boolean;
}

export interface EquipmentCreateInput {
  category: string;
  name: string;
  size_units: string;
  s_lower?: number | null;
  s_upper?: number | null;
  a?: number | null;
  b?: number | null;
  n?: number | null;
  c?: number | null;
  d?: number | null;
  function_type: string;
  source?: string;
  cepci_basis?: number | null;
  nf_refinery_basis?: number | null;
  year?: number | null;
  pricing_basis?: string;
  installation_factor?: number;
  labor_factor?: number;
  note?: string;
  materials?: string[];
  material_factors?: number[];
}

export interface EquipmentUpdateInput {
  category?: string;
  name?: string;
  size_units?: string;
  s_lower?: number | null;
  s_upper?: number | null;
  a?: number | null;
  b?: number | null;
  n?: number | null;
  c?: number | null;
  d?: number | null;
  function_type?: string;
  source?: string;
  cepci_basis?: number | null;
  nf_refinery_basis?: number | null;
  year?: number | null;
  pricing_basis?: string;
  installation_factor?: number;
  labor_factor?: number;
  note?: string;
  materials?: string[];
  material_factors?: number[];
}

export const fetchEquipment = (category?: string, q?: string, limit?: number) => {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (q) params.set('q', q);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return request<EquipmentItem[]>(`/equipment${qs ? `?${qs}` : ''}`);
};

export const fetchEquipmentDetail = (equipmentId: string | number) =>
  request<EquipmentItem>(`/equipment/${equipmentId}`);

export const createEquipment = (input: EquipmentCreateInput) =>
  request<EquipmentItem>('/equipment', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateEquipment = (equipmentId: number, input: EquipmentUpdateInput) =>
  request<EquipmentItem>(`/equipment/${equipmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteEquipment = (equipmentId: number) =>
  request<DeleteResponse>(`/equipment/${equipmentId}`, {
    method: 'DELETE',
  });

export interface ChemPPIIndexPayload {
  version: string;
  source: string;
  series_id: string;
  description: string;
  annual: Record<string, number>;
}

export interface CEPCIAnnualRecord {
  CEPCI: number | null;
  MS: number | null;
  NF: number | null;
  ENR: number | null;
  CEPCI_equip: number | null;
}

export interface CEPCIIndexPayload {
  version: string;
  source: string;
  description: string;
  annual: Record<string, CEPCIAnnualRecord>;
}

export const fetchChemPPIIndex = () => request<ChemPPIIndexPayload>('/indices/chemppi');
export const fetchCEPCIIndex = () => request<CEPCIIndexPayload>('/indices/cepci');

// Steps
export interface StepLibraryItem {
  name: string;
  key: string;
  cost_small: number | null;
  cost_medium: number | null;
  cost_large: number | null;
  note: string;
  basis: string;
}

export const fetchSteps = () =>
  request<StepLibraryItem[]>('/materials/steps');

export interface CompareCompositionInput {
  label?: string;
  metal_symbol: string;
  metal_price: number;
  metal_price_unit?: string;
  metal_loading_wt_pct: number;
  support_name?: string;
  support_price_per_lb?: number;
  steps?: string[];
  order_size_tons?: number;
}

export interface CompareCompositionResult {
  index: number;
  label: string;
  metal_symbol: string;
  metal_loading_wt_pct: number;
  support_name: string;
  order_size_tons: number;
  estimated_price_per_lb: number;
  estimated_price_per_kg: number;
  materials_cost_per_lb: number;
  processing_cost_per_lb: number;
  materials_pct: number;
  processing_pct: number;
  scale: string;
}

export const compareCompositions = (compositions: CompareCompositionInput[]) =>
  request<{ compositions: CompareCompositionResult[] }>('/compare', {
    method: 'POST',
    body: JSON.stringify({ compositions }),
  });

export interface CatCostImportResponse {
  status: string;
  normalized_input: {
    metal_symbol: string;
    metal_price: number;
    metal_price_unit: string;
    metal_loading_wt_pct: number;
    support_name: string;
    support_price_per_lb: number;
    steps: string[];
    order_size_tons: number;
  };
  raw_keys: string[];
}

export const importCatCostJson = async (file: File): Promise<CatCostImportResponse> => {
  const formData = new FormData();
  formData.append('file', file, file.name);
  return request<CatCostImportResponse>('/import/catcost', {
    method: 'POST',
    body: formData,
  });
};

export interface EstimateExportJson {
  name: string;
  created_at: string;
  input: Record<string, unknown>;
  result: CostResult;
}

export const exportEstimateJson = (estimateId: number) =>
  request<EstimateExportJson>(`/export/${estimateId}`);

export const exportEstimateCsv = (estimateId: number) =>
  requestText(`/export/${estimateId}?format=csv`);

// Health
export const checkHealth = () =>
  request<{ status: string; version: string; last_price_update: string | null; scheduler_running: boolean }>('/health');

// Refresh prices. Pass 'yahoo' for the fast Yahoo Finance-only path that
// the Prices page uses for live polling — undefined runs the full refresh.
export const refreshPrices = (source?: 'yahoo') => {
  const path = source ? `/prices/refresh?source=${source}` : '/prices/refresh';
  return request<{ status: string; prices_fetched: number; updated_at: string }>(path, { method: 'POST' });
};

export interface EstimateRangeResult {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
  n_simulations: number;
  n_successful: number;
  unit: string;
  baseline_price_per_lb: number;
  baseline_price_per_kg: number;
  composition: string;
  catalyst_domain: Extract<CatalystDomain, 'thermal' | 'electrocatalyst'>;
  application_family: ApplicationFamily;
  uncertainties_applied: Record<string, [number, number]>;
}

export const runEstimateRange = (
  calculationInput: CostInput,
  nSimulations: number,
  uncertainties: Record<string, [number, number]>,
) =>
  request<EstimateRangeResult>('/uncertainty', {
    method: 'POST',
    body: JSON.stringify({
      calculation_input: calculationInput,
      n_simulations: nSimulations,
      uncertainties,
    }),
  });

export interface BenchmarkFamilySummary {
  family: string;
  title: string;
  catalyst_domain: Extract<CatalystDomain, 'thermal' | 'electrocatalyst'>;
  application_family: ApplicationFamily;
  reaction: string;
  objective: string;
  citation_count: number;
  candidate_count: number;
}

export interface DecisionCitation {
  id: string;
  label: string;
  url: string;
  kind: string;
  note: string;
}

export interface CatalogQuote {
  id: string;
  supplier: string;
  material: string;
  sku: string;
  pack_size: string;
  price_usd: number;
  normalized_price_per_lb: number;
  url: string;
  note: string;
}

export interface DecisionComponent {
  role: string;
  name: string;
  wt_pct: number;
  wt_frac: number;
  price_per_lb: number;
  precursor_markup: number;
  cost_per_lb_cat: number;
  cost_pct: number;
  source_type: string;
  source: string;
  price_basis: string;
  pricing_note: string;
  evidence: MetalPrice['evidence'];
  catalog_quotes: CatalogQuote[];
}

export interface DecisionCandidate {
  slug: string;
  title: string;
  archetype: string;
  screening_basis: string;
  screening_summary: string;
  catalyst_domain: Extract<CatalystDomain, 'thermal' | 'electrocatalyst'>;
  application_family: ApplicationFamily;
  summary: {
    base_estimated_price_per_lb: number;
    landed_cost_per_lb: number;
    landed_cost_per_kg: number;
    route_extra_cost_per_lb: number;
    materials_cost_per_lb: number;
    processing_cost_per_lb: number;
    scale: string;
    temperature_window_c: [number, number];
    dominant_cost_driver: string;
    electrode_cost_per_cm2?: number | null;
    electrode_cost_per_m2?: number | null;
    economics_basis_value: number;
    economics_basis_unit: string;
    economics_basis_label: string;
  };
  scores: {
    economics: number;
    evidence: number;
    route: number;
    performance: number;
    total: number;
  };
  route: {
    name: string;
    manufacturing_mode: string;
    calculator_template_id?: string | null;
    preprocess: string[];
    synthesis: string[];
    postprocess: string[];
    quality_gates: string[];
    steps: string[];
    route_note: string;
  };
  evidence_summary: {
    weighted_confidence_score: number;
    live_component_count: number;
    fixed_component_count: number;
    indexed_component_count: number;
  };
  components: DecisionComponent[];
  electrode_defaults?: ElectrodeCostInput | null;
  decision_notes: string[];
  literature_basis: DecisionCitation[];
  catalog_quotes: CatalogQuote[];
  estimate: CostResult;
}

export interface DecisionBenchmark {
  family: string;
  title: string;
  catalyst_domain: Extract<CatalystDomain, 'thermal' | 'electrocatalyst'>;
  application_family: ApplicationFamily;
  reaction: string;
  objective: string;
  decision_profile: {
    id: 'balanced' | 'cost-first' | 'evidence-first';
    label: string;
    description: string;
    weights: {
      economics: number;
      evidence: number;
      route: number;
      performance: number;
    };
  };
  price_basis: PriceBasis | 'supplied';
  price_basis_updated_at: string | null;
  winner: DecisionCandidate | null;
  candidates: DecisionCandidate[];
  citations: DecisionCitation[];
}

export const fetchBenchmarkFamilies = () => request<{ families: BenchmarkFamilySummary[] }>('/decision/benchmarks');

export const fetchDecisionBenchmark = (
  family: string,
  profile: 'balanced' | 'cost-first' | 'evidence-first' = 'balanced',
  basis: PriceBasis = 'live',
) =>
  request<DecisionBenchmark>(`/decision/benchmarks/${family}?profile=${profile}&basis=${basis}`);

// CapEx & OpEx Factors workspace
export interface EquipmentScalingItem {
  name: string;
  base_cost_usd: number;
  base_size: number;
  target_size: number;
  exponent: number;
  quantity: number;
}

export interface OpExInputs {
  direct_labor_cost_usd: number;
  raw_materials_cost_usd: number;
  utilities_cost_usd: number;
}

export interface CapExRequest {
  purchased_equipment_cost_usd?: number;
  equipment?: EquipmentScalingItem[];
  opex_inputs?: OpExInputs;
}

export interface EquipmentResolution {
  name: string;
  base_cost_usd: number;
  base_size: number;
  target_size: number;
  exponent: number;
  quantity: number;
  scaled_unit_cost_usd: number;
  line_total_usd: number;
}

export interface CapExBreakdown {
  purchased_equipment: number;
  installation: number;
  instrumentation: number;
  piping: number;
  electrical: number;
  buildings: number;
  yard_improvements: number;
  service_facilities: number;
  land: number;
  engineering_supervision: number;
  construction: number;
  legal: number;
  contractors_fee: number;
  contingency: number;
  direct_capital: number;
  indirect_capital: number;
  fixed_capital_investment: number;
  working_capital: number;
  total_capital_investment: number;
}

export interface OpExBreakdown {
  raw_materials: number;
  direct_labor: number;
  supervisory_clerical: number;
  utilities: number;
  laboratory: number;
  maintenance_repair: number;
  operating_supplies: number;
  direct_operating_total: number;
  local_taxes: number;
  insurance: number;
  rent: number;
  plant_overhead: number;
  fixed_operating_total: number;
  administration: number;
  distribution_marketing: number;
  rnd: number;
  general_expenses_total: number;
  total_annual_opex: number;
}

export interface CapExResult {
  purchased_equipment_cost_usd: number;
  equipment_resolution: EquipmentResolution[];
  capex: CapExBreakdown;
  opex: OpExBreakdown | null;
  summary: {
    purchased_equipment_cost_usd: number;
    fixed_capital_investment_usd: number;
    total_capital_investment_usd: number;
    fci_to_purchased_equipment_ratio: number;
    tci_to_purchased_equipment_ratio: number;
    annual_opex_usd: number | null;
  };
}

export const fetchCapEx = (input: CapExRequest) =>
  request<CapExResult>('/capex', {
    method: 'POST',
    body: JSON.stringify(input),
  });
