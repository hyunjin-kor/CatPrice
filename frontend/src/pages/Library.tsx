import { useEffect, useMemo, useState } from 'react';
import { SkeletonListRows } from '../components/shared/Skeleton';
import { WorkspaceSectionFooter, WorkspaceSectionNav, useWorkspaceSections, type WorkspaceSection } from '../components/shared/WorkspaceSections';
import {
  type CatalystDomain,
  fetchMaterialCategories,
  fetchMaterials,
  fetchSteps,
  fetchTemplates,
  type MaterialItem,
  type ProcessTemplate,
  type StepLibraryItem,
} from '../lib/api';
import { formatPrice } from '../lib/format-price';
import { useLang } from '../lib/i18n';
import { useUnit } from '../lib/use-unit';

type Tab = 'materials' | 'steps' | 'templates';
type SortKey = 'name' | 'year_desc' | 'year_asc' | 'price_desc' | 'price_asc';

function sortOptions(fmtLabel: string, t: (key: string) => string): Array<{ value: SortKey; label: string }> {
  return [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'year_desc', label: 'Quote year (newest)' },
    { value: 'year_asc', label: 'Quote year (oldest)' },
    { value: 'price_desc', label: `${t('In-calculator price')} $${fmtLabel} (${t('high-low')})` },
    { value: 'price_asc', label: `${t('In-calculator price')} $${fmtLabel} (${t('low-high')})` },
  ];
}

function compareMaterials(a: MaterialItem, b: MaterialItem, key: SortKey): number {
  if (key === 'year_desc' || key === 'year_asc') {
    const ay = a.quote_year ?? Number.NEGATIVE_INFINITY;
    const by = b.quote_year ?? Number.NEGATIVE_INFINITY;
    if (ay !== by) return key === 'year_desc' ? by - ay : ay - by;
    return a.name.localeCompare(b.name);
  }
  if (key === 'price_desc' || key === 'price_asc') {
    const ap = a.normalized_price_per_lb ?? Number.NEGATIVE_INFINITY;
    const bp = b.normalized_price_per_lb ?? Number.NEGATIVE_INFINITY;
    if (ap !== bp) return key === 'price_desc' ? bp - ap : ap - bp;
    return a.name.localeCompare(b.name);
  }
  return a.name.localeCompare(b.name);
}

const FALLBACK_CATEGORIES = ['Precious Metal / PGM', 'Base Metal', 'Support', 'Chemical', 'Chemical / Solvent'];
const APPLICATION_OPTIONS = [
  { value: '', label: 'All applications' },
  { value: 'general', label: 'General' },
  { value: 'fuel_cell', label: 'Fuel Cell' },
  { value: 'direct_methanol_fuel_cell', label: 'DMFC' },
  { value: 'electrolyzer', label: 'Electrolyzer' },
];
const DOMAIN_OPTIONS: Array<{ value: '' | CatalystDomain; label: string }> = [
  { value: '', label: 'All domains' },
  { value: 'thermal', label: 'Thermocatalyst' },
  { value: 'electrocatalyst', label: 'Electrocatalyst' },
  { value: 'general', label: 'General' },
  { value: 'both', label: 'Both' },
];
const LIBRARY_SECTIONS: WorkspaceSection[] = [
  { id: 'materials', label: 'Materials', summary: 'Source rows with their quote year and reliability.' },
  { id: 'steps', label: 'Steps', summary: 'Hourly step rates by production scale.' },
  { id: 'templates', label: 'Templates', summary: 'Route templates and processing stages.' },
];

function categoryTone(category: string) {
  if (!category) return 'border-slate-200 bg-white text-slate-600';
  const value = category.toLowerCase();
  if (value.includes('pgm') || value.includes('precious')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (value.includes('support')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value.includes('metal')) return 'border-sky-200 bg-sky-50 text-sky-700';
  if (value.includes('solvent')) return 'border-violet-200 bg-violet-50 text-violet-700';
  return 'border-slate-200 bg-white text-slate-600';
}

function domainTone(domain: CatalystDomain | string) {
  const value = domain.toLowerCase();
  if (value === 'electrocatalyst') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (value === 'both') return 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700';
  if (value === 'general') return 'border-slate-200 bg-white text-slate-600';
  return 'border-orange-200 bg-orange-50 text-orange-700';
}

function domainLabel(domain: CatalystDomain | string) {
  if (domain === 'electrocatalyst') return 'Electrocatalyst';
  if (domain === 'both') return 'Both';
  if (domain === 'general') return 'General';
  return 'Thermocatalyst';
}

function applicationLabel(application: string) {
  if (application === 'fuel_cell') return 'Fuel Cell';
  if (application === 'direct_methanol_fuel_cell') return 'DMFC';
  if (application === 'electrolyzer') return 'Electrolyzer';
  return 'General';
}

function applicationTone(application: string) {
  if (application === 'fuel_cell') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (application === 'direct_methanol_fuel_cell') return 'border-lime-200 bg-lime-50 text-lime-700';
  if (application === 'electrolyzer') return 'border-indigo-200 bg-indigo-50 text-indigo-700';
  return 'border-slate-200 bg-white text-slate-600';
}

function formatPack(material: MaterialItem, lang: 'en' | 'ko' = 'en') {
  if (!material.pack_quantity || !material.pack_unit) return lang === 'ko' ? '포장 정보 없음' : 'Pack not stated';
  return lang === 'ko' ? `${material.pack_quantity} ${material.pack_unit} 포장` : `${material.pack_quantity} ${material.pack_unit} pack`;
}

function formatRawPrice(material: MaterialItem) {
  if (material.price == null || !material.price_unit) return 'N/A';
  return `${formatPrice(Number(material.price))} ${material.price_unit}`;
}

function priceScopeLabel(scope: string) {
  if (scope === 'literature_high_volume') return 'Bulk commodity';
  if (scope === 'vendor_lab') return 'Vendor pack price';
  return 'Historical archive';
}

function pricingBasisLabel(basis: string) {
  if (!basis) return 'basis not stated';
  return basis.replace(/_/g, ' ');
}

function sourceTrustLabel(material: MaterialItem) {
  if (material.reference_url) {
    if (material.price_scope === 'literature_high_volume') return 'Public commodity source';
    if (material.price_scope === 'vendor_lab') return 'Vendor product page';
    return 'Public link';
  }
  if (material.price_scope === 'historical_bulk') return 'Archive only (no public link)';
  return 'No link stored';
}

function sourceTrustTone(material: MaterialItem) {
  if (material.reference_url) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (material.price_scope === 'historical_bulk') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-white text-slate-600';
}

function usabilityLabel(material: MaterialItem) {
  if (material.is_calculator_usable) return 'Ready to cost';
  return 'Browse only';
}

function usabilityTone(material: MaterialItem) {
  if (material.is_calculator_usable) return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function usabilityHint(material: MaterialItem) {
  if (material.is_calculator_usable) return 'This row can be picked in the calculator.';
  if (material.price_unit && (material.price_unit.includes('cm2') || material.price_unit.includes('m2'))) {
    return 'Area-priced electrocatalyst row. Used in the electrode assembly model, not the thermal mass-based calculator.';
  }
  if (material.price_unit && material.price_unit.includes('mL')) {
    return 'Volume-priced ionomer / dispersion row without density. Used directly in the electrode assembly model.';
  }
  return 'Reference row only. Price unit is not yet mapped to the calculator.';
}

function quoteYearTone(year: number | null | undefined) {
  if (year == null) return 'border-slate-200 bg-slate-100 text-slate-600';
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;
  if (age <= 2) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (age <= 7) return 'border-sky-200 bg-sky-50 text-sky-700';
  if (age <= 15) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
}

function quoteYearLabel(year: number | null | undefined) {
  if (year == null) return 'Year unknown';
  return `${year} quote`;
}

function LibraryMetricTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[22px] border border-slate-900/8 bg-white/58 p-4">
      <div className="cp-subtle-label">{label}</div>
      <div className="mt-2 text-2xl font-display text-[#191f28]">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-600">{detail}</div>
    </div>
  );
}

function InspectorRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
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

export default function Library() {
  const { toDisplay, fmtLabel } = useUnit();
  const { lang, t } = useLang();
  const sectionState = useWorkspaceSections(LIBRARY_SECTIONS, 'library');
  const tab = sectionState.activeSection.id as Tab;
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [steps, setSteps] = useState<StepLibraryItem[]>([]);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catalystDomain, setCatalystDomain] = useState<'' | CatalystDomain>('');
  const [applicationFamily, setApplicationFamily] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [selectedStepKey, setSelectedStepKey] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const sortedMaterials = useMemo(() => {
    const copy = materials.slice();
    copy.sort((a, b) => compareMaterials(a, b, sortKey));
    return copy;
  }, [materials, sortKey]);
  const publicLinkCount = materials.filter((material) => Boolean(material.reference_url)).length;
  const historicalOnlyCount = materials.filter(
    (material) => material.price_scope === 'historical_bulk' && !material.reference_url,
  ).length;
  const usableCount = materials.filter((material) => material.is_calculator_usable).length;
  const browseOnlyCount = materials.length - usableCount;
  const selectedMaterial = sortedMaterials.find((material) => String(material.id) === selectedMaterialId) ?? sortedMaterials[0] ?? null;
  const selectedStep = steps.find((step) => step.key === selectedStepKey) ?? steps[0] ?? null;
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    fetchMaterialCategories()
      .then((values) => {
        if (!cancelled && values.length > 0) setCategories(values);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        if (tab === 'materials') {
          const data = await fetchMaterials(
            category || undefined,
            debouncedSearch || undefined,
            catalystDomain || undefined,
            applicationFamily || undefined,
            1000,
          );
          if (!cancelled) {
            setMaterials(data);
          }
          return;
        }

        if (tab === 'templates') {
          const data = await fetchTemplates(catalystDomain || undefined);
          if (!cancelled) setTemplates(data);
          return;
        }

        const data = await fetchSteps();
        if (!cancelled) setSteps(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setMaterials([]);
          setTemplates([]);
          setSteps([]);
          setError(err instanceof Error ? err.message : 'Failed to load library data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [tab, category, debouncedSearch, catalystDomain, applicationFamily]);

  useEffect(() => {
    if (sortedMaterials.length === 0) {
      setSelectedMaterialId(null);
      return;
    }
    if (!selectedMaterialId || !sortedMaterials.some((material) => String(material.id) === selectedMaterialId)) {
      setSelectedMaterialId(String(sortedMaterials[0]!.id));
    }
  }, [sortedMaterials, selectedMaterialId]);

  useEffect(() => {
    if (steps.length === 0) {
      setSelectedStepKey(null);
      return;
    }
    if (!selectedStepKey || !steps.some((step) => step.key === selectedStepKey)) {
      setSelectedStepKey(steps[0]!.key);
    }
  }, [selectedStepKey, steps]);

  useEffect(() => {
    if (templates.length === 0) {
      setSelectedTemplateId(null);
      return;
    }
    if (!selectedTemplateId || !templates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0]!.id);
    }
  }, [selectedTemplateId, templates]);

  return (
    <div className="flex flex-col gap-4">
      <section className="surface-card cp-enter overflow-hidden px-5 py-6 sm:px-6" style={{ animationDelay: '0.06s' }}>
        <div className="flex flex-col gap-4 border-b border-slate-900/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="cp-heading-xl">{t('Source Library')}</h2>
            <p className="cp-body-copy mt-1.5 max-w-2xl">
              {t('Material sources, step rates, and route templates in one place, with the quote basis behind every number.')}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <WorkspaceSectionNav
            sections={LIBRARY_SECTIONS}
            activeSectionId={sectionState.activeSectionId}
            activeIndex={sectionState.activeIndex}
            onSelect={sectionState.setActiveSection}
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            {t(error)}
          </div>
        ) : null}

        {tab === 'materials' && (
          <>
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(4,200px)]">
              <label className="block">
                <div className="cp-subtle-label">{t('Search')}</div>
                <div className="mt-2">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('Search by material, formula, or element')}
                    className="input-base"
                  />
                </div>
              </label>

              <label className="block">
                <div className="cp-subtle-label">{t('Category filter')}</div>
                <div className="mt-2">
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="input-base">
                    <option value="">{t('All categories')}</option>
                    {categories.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block">
                <div className="cp-subtle-label">{t('Catalyst domain')}</div>
                <div className="mt-2">
                  <select
                    value={catalystDomain}
                    onChange={(event) => setCatalystDomain(event.target.value as '' | CatalystDomain)}
                    className="input-base"
                  >
                    {DOMAIN_OPTIONS.map((option) => (
                      <option key={option.value || 'all'} value={option.value}>
                        {t(option.label)}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block">
                <div className="cp-subtle-label">{t('Application')}</div>
                <div className="mt-2">
                  <select
                    value={applicationFamily}
                    onChange={(event) => setApplicationFamily(event.target.value)}
                    className="input-base"
                  >
                    {APPLICATION_OPTIONS.map((option) => (
                      <option key={option.value || 'all'} value={option.value}>
                        {t(option.label)}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block">
                <div className="cp-subtle-label">{t('Sort by')}</div>
                <div className="mt-2">
                  <select
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as SortKey)}
                    className="input-base"
                  >
                    {sortOptions(fmtLabel, t).map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.label)}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <LibraryMetricTile label={t('Filtered rows')} value={String(materials.length)} detail={t('Material rows visible under the current filters.')} />
              <LibraryMetricTile label={t('Ready to cost')} value={String(usableCount)} detail={browseOnlyCount > 0 ? (lang === 'ko' ? `열람 전용 행 ${browseOnlyCount}건이 참고용으로 함께 표시됩니다.` : `${browseOnlyCount} more browse-only rows are listed for reference.`) : t('Every visible row plugs into the calculator.')} />
              <LibraryMetricTile label={t('Public source links')} value={String(publicLinkCount)} detail={t('Rows that open a source page directly.')} />
              <LibraryMetricTile label={t('Archive-only')} value={String(historicalOnlyCount)} detail={t('Older bulk quotes without a stable public URL.')} />
            </div>

            <div className="cp-split-workspace mt-5">
              <div className="flex max-h-[72vh] flex-col overflow-hidden rounded-[28px] border border-slate-900/8 bg-white/58 backdrop-blur-xl">
                <div className="border-b border-slate-900/8 bg-slate-50/80 px-5 py-3 text-xs leading-6 text-slate-600">
                  {t('Public URLs open directly when available. Historical bulk rows remain visible, but many do not have a stable public permalink.')}
                </div>

                {loading ? (
                  <div className="px-4 py-4">
                    <SkeletonListRows count={6} />
                  </div>
                ) : sortedMaterials.length === 0 ? (
                  <div className="flex flex-col items-start gap-3 px-5 py-8 text-sm text-slate-600">
                    <div>
                      <div className="font-semibold text-[#191f28]">{t("No materials match the current filters.")}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">
                        {t("Try clearing the search box or category filter to see the full library.")}
                      </div>
                    </div>
                    {(search || category) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setCategory('');
                        }}
                        className="cp-button-secondary px-3.5 py-2 text-xs"
                      >
                        {t("Clear filters")}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="min-h-0 flex-1 space-y-2 overflow-auto px-4 py-4">
                    {sortedMaterials.map((material) => {
                      const active = selectedMaterial?.id === material.id;
                      return (
                        <button
                          key={material.id}
                          type="button"
                          onClick={() => setSelectedMaterialId(String(material.id))}
                          aria-pressed={active}
                          className={`${active ? 'cp-list-row cp-list-row-active' : 'cp-list-row'} block w-full text-left`}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-[#191f28]">{material.name}</div>
                              <div className="truncate text-xs text-slate-600">{material.symbol || material.formula || (lang === 'ko' ? '기호 없음' : t('No symbol'))}</div>
                              {material.notes ? <div className="mt-1 text-xs leading-5 text-slate-600">{material.notes}</div> : null}
                            </div>
                            <div className="text-left lg:text-right">
                              {material.normalized_price_per_lb != null ? (
                                <>
                                  <div className="font-mono text-slate-900">
                                    {formatPrice(toDisplay(material.normalized_price_per_lb))}{fmtLabel}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    {formatRawPrice(material)} · {formatPack(material, lang)}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="font-mono text-slate-900">{formatRawPrice(material)}</div>
                                  <div className="mt-1 text-xs text-slate-600">{formatPack(material, lang)}</div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${usabilityTone(material)}`}>{t(usabilityLabel(material))}</span>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${quoteYearTone(material.quote_year)}`}>{material.quote_year == null ? t('Year unknown') : (lang === 'ko' ? `${material.quote_year}년 견적` : quoteYearLabel(material.quote_year))}</span>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${domainTone(material.catalyst_domain)}`}>{t(domainLabel(material.catalyst_domain))}</span>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${applicationTone(material.application_family)}`}>{t(applicationLabel(material.application_family))}</span>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${categoryTone(material.category)}`}>{material.category || 'Uncategorised'}</span>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${sourceTrustTone(material)}`}>{t(sourceTrustLabel(material))}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="cp-inspector-rail xl:max-h-[70vh] xl:overflow-auto">
                <section className="cp-rail-panel">
                  <div className="cp-subtle-label">{t('Source Detail')}</div>
                  <div className="mt-2 text-lg font-semibold text-[#191f28]">{selectedMaterial?.name ?? t('Choose a material row')}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMaterial ? <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${domainTone(selectedMaterial.catalyst_domain)}`}>{t(domainLabel(selectedMaterial.catalyst_domain))}</span> : null}
                    {selectedMaterial ? <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${applicationTone(selectedMaterial.application_family)}`}>{t(applicationLabel(selectedMaterial.application_family))}</span> : null}
                    {selectedMaterial ? <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${categoryTone(selectedMaterial.category)}`}>{selectedMaterial.category || 'Uncategorised'}</span> : null}
                  </div>
                  {selectedMaterial ? (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${usabilityTone(selectedMaterial)}`}>{t(usabilityLabel(selectedMaterial))}</span>
                      </div>
                      <div className="mt-3 text-xs leading-5 text-slate-600">{t(usabilityHint(selectedMaterial))}</div>
                      <div className="mt-4 space-y-1">
                        <InspectorRow label={t('Quote')} value={formatRawPrice(selectedMaterial)} detail={formatPack(selectedMaterial, lang)} />
                        {selectedMaterial.is_calculator_usable && selectedMaterial.normalized_price_per_lb != null ? (
                          <InspectorRow
                            label={t('In calculator')}
                            value={`${formatPrice(toDisplay(selectedMaterial.normalized_price_per_lb))}${fmtLabel}`}
                            detail={t('Normalized to a per-mass basis for the cost engine.')}
                          />
                        ) : null}
                        <InspectorRow label={t('Source type')} value={t(priceScopeLabel(selectedMaterial.price_scope))} detail={pricingBasisLabel(selectedMaterial.pricing_basis)} />
                        <InspectorRow label={t('Quote year')} value={selectedMaterial.quote_year ? String(selectedMaterial.quote_year) : 'N/A'} detail={selectedMaterial.quote_source || t('Source not stated')} />
                        <InspectorRow label={t('Public link')} value={t(sourceTrustLabel(selectedMaterial))} detail={selectedMaterial.reference_url ? t('Public URL available.') : t('Public URL not stored.')} />
                      </div>
                      {selectedMaterial.notes ? (
                        <div className="mt-3 rounded-[18px] border border-slate-900/8 bg-white/72 px-3 py-3 text-xs leading-6 text-slate-600">
                          {selectedMaterial.notes}
                        </div>
                      ) : null}
                      {selectedMaterial.reference_url ? (
                        <a href={selectedMaterial.reference_url} target="_blank" rel="noreferrer" className="cp-button-secondary mt-3 w-full px-3 py-2 text-xs">
                          {t('Open source')}
                        </a>
                      ) : null}
                    </>
                  ) : (
                    <div className="mt-3 text-xs leading-6 text-slate-600">{t('Choose a row from the record list to inspect its source basis here.')}</div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}

        {tab === 'steps' && (
          <div className="cp-split-workspace mt-5">
            <div className="overflow-hidden rounded-[28px] border border-slate-900/8 bg-white/58 backdrop-blur-xl">
              {loading ? (
                <div className="px-4 py-4">
                  <SkeletonListRows count={6} />
                </div>
              ) : steps.length === 0 ? (
                <div className="px-5 py-8 text-sm text-slate-600">
                  <div className="font-semibold text-[#191f28]">{t("No step rates loaded.")}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">{t("The step library is empty — backend may not have published rates yet.")}</div>
                </div>
              ) : (
                <div className="max-h-[68vh] space-y-2 overflow-auto px-4 py-4">
                  {steps.map((step) => {
                    const active = selectedStep?.key === step.key;
                    return (
                      <button
                        key={step.key}
                        onClick={() => setSelectedStepKey(step.key)}
                        className={`${active ? 'cp-list-row cp-list-row-active' : 'cp-list-row'} w-full text-left`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-[#191f28]">{step.name}</div>
                            <div className="mt-1 text-xs text-slate-600">{step.basis}</div>
                          </div>
                          <span className="cp-chip">{step.key}</span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <div className="rounded-[16px] border border-slate-900/8 bg-white/72 px-3 py-2 text-xs text-slate-600">{t('Small')}: {step.cost_small != null ? `${formatPrice(step.cost_small)}/hr` : 'N/A'}</div>
                          <div className="rounded-[16px] border border-slate-900/8 bg-white/72 px-3 py-2 text-xs text-slate-600">{t('Medium')}: {step.cost_medium != null ? `${formatPrice(step.cost_medium)}/hr` : 'N/A'}</div>
                          <div className="rounded-[16px] border border-slate-900/8 bg-white/72 px-3 py-2 text-xs text-slate-600">{t('Large')}: {step.cost_large != null ? `${formatPrice(step.cost_large)}/hr` : 'N/A'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="cp-inspector-rail xl:max-h-[70vh] xl:overflow-auto">
              <section className="cp-rail-panel">
                <div className="cp-subtle-label">{t("Step Detail")}</div>
                <div className="mt-2 text-lg font-semibold text-[#191f28]">{selectedStep?.name ?? 'Choose a step row'}</div>
                {selectedStep ? (
                  <>
                    <div className="mt-3 space-y-1">
                      <InspectorRow label={t("Small")} value={selectedStep.cost_small != null ? `${formatPrice(selectedStep.cost_small)}/hr` : 'N/A'} />
                      <InspectorRow label={t("Medium")} value={selectedStep.cost_medium != null ? `${formatPrice(selectedStep.cost_medium)}/hr` : 'N/A'} />
                      <InspectorRow label={t("Large")} value={selectedStep.cost_large != null ? `${formatPrice(selectedStep.cost_large)}/hr` : 'N/A'} />
                      <InspectorRow label={t("Basis")} value={selectedStep.basis || 'N/A'} detail={selectedStep.key} />
                    </div>
                    <div className="mt-3 rounded-[18px] border border-slate-900/8 bg-white/72 px-3 py-3 text-xs leading-6 text-slate-600">
                      {selectedStep.note || 'No additional note stored for this step.'}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-xs leading-6 text-slate-600">{t("Choose a step to inspect the hourly-rate basis here.")}</div>
                )}
              </section>
            </div>
          </div>
        )}

        {tab === 'templates' && (
          <div className="mt-5 space-y-4">
            <div className="flex justify-end">
              <label className="block min-w-[220px]">
                <div className="cp-subtle-label">{t('Catalyst domain')}</div>
                <div className="mt-2">
                  <select
                    value={catalystDomain}
                    onChange={(event) => setCatalystDomain(event.target.value as '' | CatalystDomain)}
                    className="input-base"
                  >
                    {DOMAIN_OPTIONS.map((option) => (
                      <option key={option.value || 'all'} value={option.value}>
                        {t(option.label)}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            <div className="cp-split-workspace">
              <div className="space-y-3">
                {loading ? (
                  <SkeletonListRows count={4} />
                ) : templates.length === 0 ? (
                  <div className="rounded-[20px] border border-slate-200 bg-white/58 px-5 py-6 text-sm text-slate-600">
                    <div className="font-semibold text-[#191f28]">{t("No route templates loaded.")}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-600">{t("No templates are stored for the current catalyst-domain filter. Switch to \"All domains\" to widen the search.")}</div>
                  </div>
                ) : (
                  templates.map((template) => {
                    const active = selectedTemplate?.id === template.id;
                    return (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`${active ? 'cp-list-row cp-list-row-active' : 'cp-list-row'} w-full text-left`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="cp-subtle-label">{template.category || 'Template'}</div>
                            <div className="cp-heading-sm mt-2">{template.name}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${domainTone(template.catalyst_domain)}`}>{domainLabel(template.catalyst_domain)}</span>
                            <span className="cp-chip">{lang === 'ko' ? `${template.steps.length}개 단계` : `${template.steps.length} steps`}</span>
                          </div>
                        </div>
                        <div className="mt-3 text-sm leading-7 text-slate-600">{template.description}</div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="cp-inspector-rail">
                <section className="cp-rail-panel">
                  <div className="cp-subtle-label">{t("Route Audit")}</div>
                  <div className="mt-2 text-lg font-semibold text-[#191f28]">{selectedTemplate?.name ?? 'Choose a template'}</div>
                  {selectedTemplate ? (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${domainTone(selectedTemplate.catalyst_domain)}`}>{domainLabel(selectedTemplate.catalyst_domain)}</span>
                        {selectedTemplate.application_family ? <span className="cp-chip">{applicationLabel(selectedTemplate.application_family)}</span> : null}
                        {selectedTemplate.manufacturing_mode ? <span className="cp-chip">{selectedTemplate.manufacturing_mode}</span> : null}
                      </div>
                      <div className="mt-3 space-y-1">
                        <InspectorRow label={t("Steps")} value={String(selectedTemplate.steps.length)} detail={selectedTemplate.source || t('Source not stated')} />
                        <InspectorRow label={t("Examples")} value={selectedTemplate.example_catalysts.length ? String(selectedTemplate.example_catalysts.length) : '0'} detail={t("Stored catalyst examples in this route.")} />
                      </div>
                      <div className="mt-3 rounded-[18px] border border-slate-900/8 bg-white/72 px-3 py-3 text-xs leading-6 text-slate-600">
                        {selectedTemplate.route_note || selectedTemplate.description}
                      </div>
                      {(selectedTemplate.preprocess?.length || selectedTemplate.synthesis?.length || selectedTemplate.postprocess?.length) ? (
                        <div className="mt-3 space-y-3">
                          {selectedTemplate.preprocess?.length ? <div><div className="cp-subtle-label">{t("Pre-treatment")}</div><div className="mt-2 flex flex-wrap gap-2">{selectedTemplate.preprocess.map((value) => <span key={value} className="cp-chip">{value}</span>)}</div></div> : null}
                          {selectedTemplate.synthesis?.length ? <div><div className="cp-subtle-label">{t("Synthesis")}</div><div className="mt-2 flex flex-wrap gap-2">{selectedTemplate.synthesis.map((value) => <span key={value} className="cp-chip">{value}</span>)}</div></div> : null}
                          {selectedTemplate.postprocess?.length ? <div><div className="cp-subtle-label">{t("Post-treatment")}</div><div className="mt-2 flex flex-wrap gap-2">{selectedTemplate.postprocess.map((value) => <span key={value} className="cp-chip">{value}</span>)}</div></div> : null}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="mt-3 text-xs leading-6 text-slate-600">{t("Choose a route template to inspect its preparation stages and audit fields here.")}</div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5">
          <WorkspaceSectionFooter
            activeSection={sectionState.activeSection}
            activeIndex={sectionState.activeIndex}
            totalSections={LIBRARY_SECTIONS.length}
            onPrevious={sectionState.goPrevious}
            onNext={sectionState.goNext}
            canGoPrevious={sectionState.canGoPrevious}
            canGoNext={sectionState.canGoNext}
          />
        </div>
      </section>
    </div>
  );
}
