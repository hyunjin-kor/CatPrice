import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FitPriceText } from '../components/shared/FitPriceText';
import { SkeletonListRows, SkeletonTile } from '../components/shared/Skeleton';
import { WorkspaceSectionFooter, WorkspaceSectionNav, useWorkspaceSections, type WorkspaceSection } from '../components/shared/WorkspaceSections';
import {
  fetchPriceHistory,
  fetchPrices,
  fetchPriceTrends,
  fetchPriceUsage,
  fetchSupportPrices,
  refreshPrices,
  type MetalPrice,
  type PriceTrend,
  type SupportPriceSeries,
  type PriceUsageEntry,
} from '../lib/api';
import { LB_PER_KG, TROY_OZ_PER_KG, TROY_OZ_PER_LB, type Unit } from '../lib/unit-conversion';
import { useLang } from '../lib/i18n';
import { useBasis } from '../lib/use-basis';
import { useUnit } from '../lib/use-unit';

const MetalTrendChart = lazy(() => import('../components/charts/MetalTrendChart'));
const MetalCompareChart = lazy(() => import('../components/charts/MetalCompareChart'));

type HistoryPoint = { date: string; price: number; open: number; high: number; low: number };
type Period = '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';

const PERIOD_LABELS: Record<Period, string> = {
  '1mo': '1M',
  '3mo': '3M',
  '6mo': '6M',
  '1y': '1Y',
  '2y': '2Y',
  '5y': '5Y',
};

const GROUP_ORDER = ['PGM', 'Precious', 'Base'];
const GROUPS: Record<string, { title: string; symbols: string[] }> = {
  PGM: { title: 'Platinum Group Metals', symbols: ['Pt', 'Pd', 'Rh', 'Ru', 'Ir'] },
  Precious: { title: 'Precious Metals', symbols: ['Au', 'Ag'] },
  Base: { title: 'Industrial Metals', symbols: ['Ni', 'Co', 'Cu', 'Al', 'Zn', 'Sn', 'Mo', 'W', 'V', 'Re', 'Fe'] },
};

// Data palette: brand teal for Pt, then visually distinct hues so PGM
// trend lines and avatars stay tellable apart.
const METAL_COLORS: Record<string, string> = {
  Pt: '#0f766e',
  Pd: '#0067ff',
  Rh: '#b82f89',
  Ru: '#e8590c',
  Ir: '#7da7ff',
  Au: '#ffa800',
  Ag: '#8b95a1',
  Ni: '#22c55e',
  Co: '#0099ff',
  Cu: '#cf2233',
  Al: '#b0b8c1',
  Mo: '#7950f2',
  W: '#4e5968',
  Fe: '#fb6f5f',
};

/* Swatch colours span the luminance range, so the symbol needs whichever ink
   reads on the one it lands on. 0.21 is where the two cross over. */
function readableInk(background: string): string {
  const channel = (offset: number) => {
    const value = parseInt(background.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.21 ? '#191f28' : '#ffffff';
}

const FEED_SECTIONS: WorkspaceSection[] = [
  { id: 'quotes', label: 'Prices', summary: 'Choose the metal price to inspect.' },
  { id: 'history', label: 'History', summary: 'Read source quality, quote age, and trend.' },
];

function convertTrackedPrice(price: number, rawUnit: string, displayUnit: Unit) {
  if (rawUnit === '$/lb') return displayUnit === 'kg' ? price * LB_PER_KG : price;
  if (rawUnit === '$/kg') return displayUnit === 'lb' ? price / LB_PER_KG : price;
  if (rawUnit === '$/troy_oz') return displayUnit === 'kg' ? price * TROY_OZ_PER_KG : price * TROY_OZ_PER_LB;
  return price;
}

function displayTrackedUnit(rawUnit: string, displayUnit: Unit) {
  if (rawUnit === '$/lb' || rawUnit === '$/kg' || rawUnit === '$/troy_oz') return `$/${displayUnit}`;
  return rawUnit;
}

function formatSyncStamp(value: string | null, locale = 'en-US') {
  if (!value) return 'Awaiting live refresh';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Awaiting live refresh';

  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function fmtConverted(value: number | null) {
  if (value == null) return 'N/A';
  if (Math.abs(value) >= 1) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

function fmtPrice(price: number | null, rawUnit: string, displayUnit: Unit) {
  if (price == null) return 'N/A';
  return fmtConverted(convertTrackedPrice(price, rawUnit, displayUnit));
}

function sourceDescription(row: MetalPrice) {
  if (row.source_type === 'live') return row.source;
  if (row.basis_month) return `${row.source}, ${row.basis_month}`;
  if (row.source_type === 'indexed') return 'Published reference price, brought to this year with a price index';
  return 'Manual price input';
}

type TrendPeriod = '1mo' | '3mo' | '6mo' | '1y';
const TREND_PERIODS: TrendPeriod[] = ['1mo', '3mo', '6mo', '1y'];
// Change figures only get reported once a series has real depth — DB-cache
// series for non-exchange metals start at a couple of snapshots.
const MIN_TREND_POINTS = 5;

// A "DB cache" series is only our own snapshot log — the days the app happened
// to be open — so it must never be read as a market trend.
const isMarketTrend = (trend: PriceTrend) =>
  trend.source !== 'DB cache' && trend.count >= MIN_TREND_POINTS && trend.change_pct != null;

function fmtChangePct(pct: number) {
  const sign = pct >= 0 ? '+' : '−';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

function changeTone(pct: number, dark = false) {
  if (dark) {
    return pct >= 0
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
      : 'border-rose-300/30 bg-rose-400/10 text-rose-100';
  }
  return pct >= 0
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-rose-200 bg-rose-50 text-rose-700';
}

function fmtQuoteAge(ageHours: number | null, lang: 'en' | 'ko') {
  if (ageHours == null) return null;
  if (ageHours < 1) {
    const minutes = Math.max(1, Math.round(ageHours * 60));
    return lang === 'ko' ? `${minutes}분 전` : `${minutes}m ago`;
  }
  if (ageHours < 48) {
    const hours = ageHours < 10 ? ageHours.toFixed(1) : String(Math.round(ageHours));
    return lang === 'ko' ? `${hours}시간 전` : `${hours}h ago`;
  }
  const days = Math.round(ageHours / 24);
  return lang === 'ko' ? `${days}일 전` : `${days}d ago`;
}

// Annualized volatility from daily log returns (√252 trading days). Needs a
// real daily series, so it is only shown for exchange-backed histories.
function annualizedVolatilityPct(prices: number[]): number | null {
  if (prices.length < 20) return null;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i += 1) {
    const previous = prices[i - 1]!;
    const current = prices[i]!;
    if (previous > 0 && current > 0) returns.push(Math.log(current / previous));
  }
  if (returns.length < 19) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function Sparkline({ points, color }: { points: Array<{ price: number }>; color: string }) {
  const width = 96;
  const height = 30;
  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const path = prices
    .map((price, index) => {
      const x = (index / (prices.length - 1)) * (width - 2) + 1;
      const y = height - 2 - ((price - min) / span) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
      <polyline points={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function RangePositionBar({ low, high, current, color }: { low: number; high: number; current: number; color: string }) {
  const span = high - low;
  const position = span > 0 ? Math.min(1, Math.max(0, (current - low) / span)) : 0.5;
  return (
    <div className="relative mt-3 h-2 rounded-full bg-white/12">
      <div
        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#191f28]"
        style={{ left: `${position * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}

function SourceBadge({ sourceType }: { sourceType: MetalPrice['source_type'] }) {
  const badge =
    sourceType === 'live'
      ? { label: 'Live', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' }
      : sourceType === 'indexed'
        ? { label: 'Indexed', classes: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' }
        : { label: 'Manual', classes: 'border-slate-200 bg-white text-slate-600', dot: 'bg-slate-500' };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badge.classes}`}>
      <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
      {badge.label}
    </span>
  );
}

function StatusTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="cp-metric-tile">
      <div className="cp-subtle-label">{label}</div>
      <div className="mt-1.5 text-2xl font-display text-[#191f28]">{value}</div>
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

function DarkChartFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-[28px] border border-white/10 bg-white/4 text-center">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0d9488] border-t-transparent" />
      <div className="text-sm text-slate-300">{label}</div>
    </div>
  );
}

export default function Prices() {
  const { unit } = useUnit();
  const { lang, t } = useLang();
  const { basis } = useBasis();
  const {
    activeSection,
    activeSectionId,
    activeIndex,
    canGoNext,
    canGoPrevious,
    goNext,
    goPrevious,
    setActiveSection,
  } = useWorkspaceSections(FEED_SECTIONS, 'feed');
  const [prices, setPrices] = useState<MetalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historySource, setHistorySource] = useState<string | null>(null);
  const [histLoading, setHistLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('1y');
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('3mo');
  const [trends, setTrends] = useState<Record<string, PriceTrend> | null>(null);
  const [usage, setUsage] = useState<Record<string, PriceUsageEntry[]> | null>(null);
  const [supportSeries, setSupportSeries] = useState<SupportPriceSeries[] | null>(null);
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const navigate = useNavigate();

  const load = useCallback((options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    fetchPrices(basis)
      .then((rows) => {
        setPrices(rows);
        setSelected((current) => current ?? rows[0]?.symbol ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load metal prices');
      })
      .finally(() => {
        if (!options?.silent) setLoading(false);
      });
  }, [basis]);

  useEffect(() => {
    load();
  }, [load]);

  // Two-tier live polling while the page is open, using only free sources:
  //   - every 5 min: Yahoo Finance quotes (primary-source protection is server-side)
  //   - every 5 min: full refresh — also pulls Kitco / Johnson Matthey /
  //     Markets Insider so Rh, Ru, Ir, Ni, Co, Mo, W, Fe stay current
  //     without any paid API. The slower cadence keeps the scrapers polite.
  useEffect(() => {
    const yahooTick = async () => {
      try {
        await refreshPrices('yahoo');
        load({ silent: true });
      } catch {
        // Transient network blips shouldn't disturb the displayed quotes.
      }
    };
    const fullTick = async () => {
      try {
        await refreshPrices();
        load({ silent: true });
      } catch {
        // Transient network blips shouldn't disturb the displayed quotes.
      }
    };
    const yahooId = window.setInterval(yahooTick, 5 * 60_000);
    const fullId = window.setInterval(fullTick, 5 * 60_000);
    return () => {
      window.clearInterval(yahooId);
      window.clearInterval(fullId);
    };
  }, [load]);

  useEffect(() => {
    if (!selected) return;

    let cancelled = false;
    setHistLoading(true);
    fetchPriceHistory(selected, { period, basis })
      .then((payload) => {
        if (cancelled) return;
        setHistory(payload.history ?? []);
        setHistorySource(payload.source ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setHistory([]);
        setHistorySource(null);
      })
      .finally(() => {
        if (!cancelled) setHistLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected, period, basis]);

  useEffect(() => {
    let cancelled = false;
    fetchPriceTrends(trendPeriod, basis)
      .then((payload) => {
        if (!cancelled) setTrends(payload.trends);
      })
      .catch(() => {
        if (!cancelled) setTrends(null);
      });
    return () => {
      cancelled = true;
    };
  }, [trendPeriod, basis]);

  useEffect(() => {
    if (basis !== 'reference') return;
    let cancelled = false;
    fetchSupportPrices(basis)
      .then((payload) => {
        if (!cancelled) setSupportSeries(payload.series);
      })
      .catch(() => {
        if (!cancelled) setSupportSeries(null);
      });
    return () => {
      cancelled = true;
    };
  }, [basis]);

  useEffect(() => {
    let cancelled = false;
    fetchPriceUsage()
      .then((payload) => {
        if (!cancelled) setUsage(payload.usage);
      })
      .catch(() => {
        if (!cancelled) setUsage(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      await refreshPrices();
      // Re-fetch silently — keep the current quote list visible so the user
      // doesn't see the whole page collapse to a skeleton during refresh.
      // The refresh button itself stays in its own spinner state.
      load({ silent: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh metal prices');
    } finally {
      setRefreshing(false);
    }
  };

  const priceMap = Object.fromEntries(prices.map((row) => [row.symbol, row]));
  const selectedRow = selected ? priceMap[selected] : null;
  const displayHistory = selectedRow
    ? history.map((point) => ({
        ...point,
        price: convertTrackedPrice(point.price, selectedRow.unit, unit),
        open: convertTrackedPrice(point.open, selectedRow.unit, unit),
        high: convertTrackedPrice(point.high, selectedRow.unit, unit),
        low: convertTrackedPrice(point.low, selectedRow.unit, unit),
      }))
    : history;
  const selectedDisplayUnit = selectedRow ? displayTrackedUnit(selectedRow.unit, unit) : '';
  const pctChange =
    history.length >= 2 && history[0]!.price !== 0
      ? ((history[history.length - 1]!.price - history[0]!.price) / history[0]!.price) * 100
      : null;
  const isUp = pctChange != null && pctChange >= 0;
  const latestFetchedAt = prices.reduce<string | null>((latest, row) => {
    if (!row.fetched_at) return latest;
    const time = new Date(row.fetched_at).getTime();
    if (Number.isNaN(time)) return latest;
    if (latest == null) return row.fetched_at;
    return time > new Date(latest).getTime() ? row.fetched_at : latest;
  }, null);
  const liveQuoteCount = prices.filter((row) => row.source_type === 'live').length;
  const indexedQuoteCount = prices.filter((row) => row.source_type === 'indexed').length;
  const manualQuoteCount = prices.filter((row) => row.source_type === 'manual').length;
  const monthlyQuoteCount = prices.filter((row) => row.basis_month).length;
  const basisMonth = prices.reduce<string | null>(
    (latest, row) => (row.basis_month && (!latest || row.basis_month > latest) ? row.basis_month : latest),
    null,
  );
  const reviewFlagCount = prices.filter(
    (row) => row.needs_review,
  ).length;
  const trendFor = (symbol: string): PriceTrend | null => {
    const trend = trends?.[symbol];
    return trend && isMarketTrend(trend) ? trend : null;
  };
  const movers = useMemo(() => {
    if (!trends) return null;
    const rows = Object.values(trends).filter(isMarketTrend);
    if (rows.length < 2) return null;
    const sorted = [...rows].sort((a, b) => b.change_pct! - a.change_pct!);
    return { top: sorted[0]!, bottom: sorted[sorted.length - 1]! };
  }, [trends]);
  const comparableSymbols = useMemo(
    () =>
      trends
        ? Object.values(trends)
            .filter(isMarketTrend)
            .map((trend) => trend.symbol)
        : [],
    [trends],
  );
  const activeCompareSymbols = useMemo(() => {
    const base = selected && comparableSymbols.includes(selected) ? [selected] : [];
    const extras = compareSymbols.filter(
      (symbol) => symbol !== selected && comparableSymbols.includes(symbol),
    );
    return [...base, ...extras];
  }, [selected, compareSymbols, comparableSymbols]);

  if (loading) {
    return (
      <section className="surface-card cp-enter overflow-hidden px-5 py-6 sm:px-6">
        <div className="mb-5 flex flex-col gap-2">
          <div className="cp-subtle-label">{t("Live Metal Prices")}</div>
          <div className="h-9 w-2/3 max-w-md rounded-[10px] bg-[rgba(229,232,235,0.55)] cp-skeleton" />
          <div className="h-3 w-3/4 max-w-xl rounded-[8px] bg-[rgba(229,232,235,0.45)] cp-skeleton" />
        </div>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, idx) => (
            <SkeletonTile key={idx} />
          ))}
        </div>
        <div className="space-y-4">
          {['Platinum Group Metals', 'Precious Metals', 'Industrial Metals'].map((title, idx) => (
            <div key={title} className="surface-ghost overflow-hidden p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="cp-subtle-label">{title}</div>
                <span className="cp-chip">{t("Loading…")}</span>
              </div>
              <SkeletonListRows count={idx === 2 ? 5 : 3} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderQuotesInspector() {
    if (!selectedRow) {
      return (
        <div className="cp-inspector-rail">
          <section className="cp-rail-panel">
            <div className="cp-subtle-label">{t("Evidence Surface")}</div>
            <div className="mt-2 text-lg font-semibold text-[#191f28]">{t("Choose a tracked symbol.")}</div>
            <div className="mt-2 text-xs leading-6 text-slate-600">{t("The inspector keeps source quality, freshness, and normalization context visible.")}</div>
          </section>
        </div>
      );
    }

    return (
      <div className="cp-inspector-rail">
        <section className="surface-ink overflow-hidden p-4">
          <div className="cp-subtle-label !text-slate-400">{t('Selected Quote')}</div>
          <div className="mt-2 text-sm text-slate-300">{t(selectedRow.name)}</div>
          <div className="mt-3 flex items-end gap-3">
            <FitPriceText
              size="lg"
              text={fmtPrice(selectedRow.price, selectedRow.unit, unit)}
              className="min-w-0 text-white"
            />
            <div className="pb-1 text-sm text-slate-300">{displayTrackedUnit(selectedRow.unit, unit)}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <SourceBadge sourceType={selectedRow.source_type} />
            <span className="cp-chip-dark">{t(selectedRow.evidence.label)}</span>
          </div>
          <button onClick={() => setActiveSection('history')} className="cp-button-ink mt-4 px-3 py-2 text-xs">
            {t('Open trend view')}
          </button>
        </section>

        <section className="cp-rail-panel">
          <div className="cp-subtle-label">{t('Source Basis')}</div>
          <div className="mt-2 text-lg font-semibold text-[#191f28]">{t('Inspect trust before you read the number.')}</div>
          <div className="mt-3 space-y-1">
            <InspectorRow label={t('Acquisition')} value={selectedRow.evidence.acquisition_mode} detail={t(sourceDescription(selectedRow))} />
            <InspectorRow label={t('Confidence')} value={String(selectedRow.evidence.confidence_score)} detail={selectedRow.evidence.transparency} />
            <InspectorRow label={t('Quote age')} value={selectedRow.evidence.freshness_status} detail={selectedRow.evidence.note} />
            <InspectorRow label={t('Refresh target')} value={selectedRow.evidence.freshness_target_hours != null ? `${selectedRow.evidence.freshness_target_hours} h` : 'N/A'} detail={t('Expected refresh horizon for this source type.')} />
          </div>
        </section>

        {usage && selected && (usage[selected]?.length ?? 0) > 0 ? (
          <section className="cp-rail-panel">
            <div className="cp-subtle-label">{t('Used in reaction families')}</div>
            <div className="mt-2 text-xs leading-5 text-slate-600">
              {t('Benchmark families whose candidate compositions name this metal.')}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {usage[selected]!.slice(0, 10).map((entry) => (
                <button
                  key={entry.family}
                  onClick={() => navigate(`/benchmarks/${entry.family}`)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:border-[#0d9488] hover:bg-[#e6f5f2] hover:text-[#0f766e]"
                >
                  {entry.title.replace(/ reference family$/i, '')}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="cp-rail-panel">
          <div className="cp-subtle-label">{t('Price Coverage')}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <StatusTile label={t('Tracked metals')} value={String(prices.length)} detail={t('Metals with a stored price basis.')} />
            <StatusTile label={t('Needs review')} value={String(reviewFlagCount)} detail={basis === 'reference' ? t('Monthly quotes behind the latest stored publication month. Anchors retain their source confidence.') : t('Stale quotes or low-confidence sources worth checking.')} />
          </div>
        </section>
      </div>
    );
  }

  function renderQuotes() {
    return (
      <div className="cp-split-workspace">
        <section className="surface-card cp-enter overflow-hidden px-5 py-6 sm:px-6" style={{ animationDelay: '0.06s' }}>
          <div className="mb-5 flex flex-col gap-4 border-b border-slate-900/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="cp-heading-xl">{t('Live Metal Prices')}</h2>
              <p className="cp-body-copy mt-1.5 max-w-2xl">
                {t('Scan the tracked metals, then inspect the evidence, quote age, and source quality for the selected metal.')}
              </p>
            </div>

            <div className="flex min-w-[280px] flex-col gap-2 rounded-[22px] border border-slate-200 bg-white/76 px-4 py-3 sm:items-end">
              <div className="cp-subtle-label">{t('Quote Status')}</div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[#191f28]">
                  {basis === 'reference'
                    ? t('Academic basis loaded')
                    : refreshing ? t('Refreshing live quotes') : latestFetchedAt ? t('Live quotes loaded') : t('Stored pricing basis')}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-600">
                  {basis === 'reference'
                    ? (lang === 'ko'
                      ? `IMF PCPS·Johnson Matthey 월평균, 금속 ${monthlyQuoteCount}종${basisMonth ? `, 최근 월 ${basisMonth}` : ''}`
                      : `IMF PCPS and Johnson Matthey monthly averages, ${monthlyQuoteCount} metals${basisMonth ? `, latest month ${basisMonth}` : ''}`)
                    : latestFetchedAt
                      ? (lang === 'ko' ? `금속 ${liveQuoteCount}종 실시간 갱신 ${formatSyncStamp(latestFetchedAt, 'ko-KR')}` : `${liveQuoteCount} metals updated live ${formatSyncStamp(latestFetchedAt)}`)
                      : t('Indexed and manual prices are available even before a live refresh.')}
                </div>
              </div>
              <button onClick={handleRefresh} disabled={refreshing} className="cp-button-secondary px-4 py-2.5 text-sm">
                <span className={`mr-2 inline-flex h-4 w-4 rounded-full border-2 border-current border-t-transparent ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? t('Refreshing now') : t('Refresh quotes')}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              {t(error)}
            </div>
          ) : null}

          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatusTile label={t('Tracked metals')} value={String(prices.length)} detail={t('Metals with a stored price basis.')} />
            {basis === 'reference'
              ? <StatusTile label={t('Monthly-average coverage')} value={`${monthlyQuoteCount}/${prices.length}`} detail={t('Metals with a stored monthly average.')} />
              : <StatusTile label={t('Live coverage')} value={`${liveQuoteCount}/${prices.length}`} detail={t('Metals backed by current live sources.')} />}
            <StatusTile label={t('Indexed & manual quotes')} value={String(indexedQuoteCount + manualQuoteCount)} detail={lang === 'ko' ? `지수 보정 ${indexedQuoteCount}건, 수동 ${manualQuoteCount}건 시세를 계속 쓸 수 있습니다.` : `${indexedQuoteCount} indexed and ${manualQuoteCount} manual quotes remain usable.`} />
            <StatusTile label={t('Needs review')} value={String(reviewFlagCount)} detail={basis === 'reference' ? t('Monthly quotes behind the latest stored publication month. Anchors retain their source confidence.') : t('Stale quotes or low-confidence sources worth checking.')} />
          </div>

          {basis === 'reference' && supportSeries ? (
            <div className="mb-5 rounded-[22px] border border-slate-200 bg-white/76 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="cp-subtle-label">{t('Support materials')}</div>
                <div className="text-xs text-slate-600">
                  {supportSeries.some((row) => row.price != null)
                    ? t('UN Comtrade monthly import unit values, all grades combined.')
                    : t('No Comtrade key configured, so supports keep their library prices.')}
                </div>
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {supportSeries.map((row) => (
                  <div key={row.id} className="flex items-baseline justify-between gap-3 rounded-[14px] border border-slate-100 bg-white px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[#191f28]" title={row.name}>{row.material}</div>
                      <div className="truncate text-xs text-slate-500" title={row.note}>HS {row.hs}{row.basis_month ? `, ${row.basis_month}` : ''}</div>
                    </div>
                    <div className="whitespace-nowrap font-mono text-sm text-[#191f28]">
                      {row.price != null ? `$${row.price.toFixed(2)}/kg` : t('No data')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white/76 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="cp-subtle-label">{t('Change basis')}</span>
              <div className="flex gap-1 rounded-full bg-[#f2f4f6] p-1">
                {TREND_PERIODS.map((value) => (
                  <button
                    key={value}
                    onClick={() => setTrendPeriod(value)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      trendPeriod === value ? 'bg-white text-[#191f28] shadow-[0_1px_3px_rgba(15,23,42,0.08)]' : 'text-slate-600 hover:text-slate-700'
                    }`}
                  >
                    {PERIOD_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>
            {movers ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-600">{t('Biggest movers')}</span>
                <button
                  onClick={() => setSelected(movers.top.symbol)}
                  className={`rounded-full border px-3 py-1 font-mono text-xs font-semibold transition hover:opacity-80 ${changeTone(movers.top.change_pct!)}`}
                >
                  ▲ {movers.top.symbol} {fmtChangePct(movers.top.change_pct!)}
                </button>
                <button
                  onClick={() => setSelected(movers.bottom.symbol)}
                  className={`rounded-full border px-3 py-1 font-mono text-xs font-semibold transition hover:opacity-80 ${changeTone(movers.bottom.change_pct!)}`}
                >
                  ▼ {movers.bottom.symbol} {fmtChangePct(movers.bottom.change_pct!)}
                </button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {GROUP_ORDER.map((groupKey) => {
              const group = GROUPS[groupKey];
              if (!group) return null;
              const rows = group.symbols
                .map((symbol) => priceMap[symbol])
                .filter((row): row is MetalPrice => row !== undefined);
              if (!rows.length) return null;

              return (
                <div key={groupKey} className="surface-ghost overflow-hidden p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="cp-subtle-label">{t(group.title)}</div>
                    <span className="cp-chip">{lang === 'ko' ? `${rows.length}종` : `${rows.length} metals`}</span>
                  </div>

                  <div className="space-y-2">
                    {rows.map((row) => {
                      const active = selected === row.symbol;
                      const trend = trendFor(row.symbol);
                      const quoteAge = fmtQuoteAge(row.evidence.age_hours, lang);
                      return (
                        <button
                          key={row.symbol}
                          onClick={() => {
                            setSelected(row.symbol);
                          }}
                          className={`grid w-full gap-3 px-4 py-3 text-left transition sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center ${active ? 'cp-list-row cp-list-row-active' : 'cp-list-row'}`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="flex h-10 w-10 items-center justify-center rounded-[18px] text-sm font-semibold"
                              style={{
                                backgroundColor: METAL_COLORS[row.symbol] || '#0f766e',
                                color: readableInk(METAL_COLORS[row.symbol] || '#0f766e'),
                              }}
                            >
                              {row.symbol}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-[#191f28]">{t(row.name)}</div>
                              <div className="truncate text-xs text-slate-600">
                                {t(sourceDescription(row))} / {t(row.evidence.label)}
                              </div>
                            </div>
                          </div>

                          <div className="hidden min-w-[168px] items-center justify-end gap-2 lg:flex">
                            {trend ? (
                              <>
                                <Sparkline points={trend.points} color={trend.change_pct! >= 0 ? '#059669' : '#f04452'} />
                                <span className={`rounded-full border px-2 py-0.5 font-mono text-xs font-semibold ${changeTone(trend.change_pct!)}`}>
                                  {fmtChangePct(trend.change_pct!)}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-slate-600">
                                {row.source_type === 'live' ? t('History accumulating') : t('No market trend')}
                              </span>
                            )}
                          </div>

                          <SourceBadge sourceType={row.source_type} />

                          <div className="text-left sm:text-right">
                            <div className="text-lg font-display text-[#191f28]">{fmtPrice(row.price, row.unit, unit)}</div>
                            <div className="text-xs text-slate-600">
                              {displayTrackedUnit(row.unit, unit)}
                              {row.unit === '$/troy_oz' && row.price != null
                                ? ` · $${row.price.toLocaleString('en-US', { maximumFractionDigits: row.price >= 100 ? 0 : 2 })}/ozt`
                                : ''}
                            </div>
                            {quoteAge ? <div className="mt-0.5 text-xs text-slate-600">{quoteAge}</div> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <div>{renderQuotesInspector()}</div>
      </div>
    );
  }

  function renderHistoryRail() {
    if (!selectedRow) {
      return (
        <div className="cp-inspector-rail">
          <section className="cp-rail-panel">
            <div className="cp-subtle-label">{t('Source Evidence')}</div>
            <div className="mt-2 text-lg font-semibold text-[#191f28]">{t('Choose a metal to inspect its history.')}</div>
          </section>
        </div>
      );
    }

    const currentValue = displayHistory.length > 0 ? displayHistory[displayHistory.length - 1]!.price : null;
    const periodHigh = displayHistory.length > 0 ? Math.max(...displayHistory.map((point) => point.high ?? point.price)) : null;
    const periodLow = displayHistory.length > 0 ? Math.min(...displayHistory.map((point) => point.low ?? point.price)) : null;

    return (
      <div className="cp-inspector-rail">
        <section className="cp-rail-panel">
          <div className="cp-subtle-label">{t('Trend Evidence')}</div>
          <div className="mt-2 text-lg font-semibold text-[#191f28]">{t(selectedRow.name)}</div>
          <div className="mt-3 space-y-1">
            <InspectorRow label={t("Current")} value={fmtConverted(currentValue)} detail={displayTrackedUnit(selectedRow.unit, unit)} />
            <InspectorRow label={t('Period high')} value={fmtConverted(periodHigh)} />
            <InspectorRow label={t('Period low')} value={fmtConverted(periodLow)} detail={historySource || t('Stored metal price series')} />
            <InspectorRow label={t('Direction')} value={pctChange != null ? `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%` : 'N/A'} detail={lang === 'ko' ? `${PERIOD_LABELS[period]} 구간` : `${PERIOD_LABELS[period]} window`} />
          </div>
        </section>

        <section className="cp-rail-panel">
          <div className="cp-subtle-label">{t('Source Audit')}</div>
          <div className="mt-3 space-y-1">
            <InspectorRow label={t('Source reliability')} value={t(selectedRow.evidence.label)} detail={selectedRow.evidence.note} />
            <InspectorRow label={t('Transparency')} value={selectedRow.evidence.transparency} detail={selectedRow.evidence.acquisition_mode} />
            <InspectorRow label={t('Quote age')} value={selectedRow.evidence.freshness_status} detail={selectedRow.evidence.age_hours != null ? (lang === 'ko' ? `${selectedRow.evidence.age_hours.toFixed(1)}시간 경과` : `${selectedRow.evidence.age_hours.toFixed(1)} h old`) : t('Age not stored')} />
          </div>
        </section>
      </div>
    );
  }

  function renderTrend() {
    return (
      <div className="cp-split-workspace">
        <section className="surface-card cp-enter overflow-hidden px-5 py-6 sm:px-6" style={{ animationDelay: '0.1s' }}>
          <div className="surface-ink overflow-hidden p-5">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="cp-subtle-label !text-slate-400">{t('Selected Metal')}</div>
              <h2 className="font-display mt-2 text-[clamp(1.75rem,2.4vw,2.35rem)] leading-[1.0] text-white">{selectedRow ? t(selectedRow.name) : t('Choose a metal')}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {selectedRow ? <SourceBadge sourceType={selectedRow.source_type} /> : null}
                {pctChange != null ? (
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      isUp ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : 'border-rose-300/30 bg-rose-400/10 text-rose-100'
                    }`}
                  >
                    {isUp ? '+' : '-'}
                    {Math.abs(pctChange).toFixed(1)}%
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex gap-2 rounded-[18px] border border-white/10 bg-white/6 p-1">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={`rounded-[16px] px-3 py-2 text-xs font-semibold transition ${
                    period === value ? 'bg-[#0f766e] text-white' : 'text-slate-300 hover:bg-white/8'
                  }`}
                >
                  {PERIOD_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            {histLoading ? (
              <div className="flex h-[320px] items-center justify-center gap-3 text-slate-300">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0d9488] border-t-transparent" />
                {t("Loading history...")}
              </div>
            ) : displayHistory.length === 0 ? (
              <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-white/10 bg-white/4 text-center">
                <div className="font-display text-2xl text-white">{t("No stored price history")}</div>
                <div className="max-w-md text-sm leading-7 text-slate-400">
                  {t("Refresh quotes or choose a symbol that already has stored history.")}
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="cp-button-ink mt-2 px-4 py-2 text-xs"
                >
                  {refreshing ? t('Refreshing now…') : t('Refresh quotes')}
                </button>
              </div>
            ) : (
              <>
                <div className="h-[320px]">
                  <Suspense fallback={<DarkChartFallback label={t("Loading trend chart...")} />}>
                    <MetalTrendChart
                      data={displayHistory}
                      period={period}
                      selectedDisplayUnit={selectedDisplayUnit}
                      selectedColor={METAL_COLORS[selected || 'Pt'] || '#0d9488'}
                    />
                  </Suspense>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="cp-metric-tile-dark">
                    <div className="cp-subtle-label !text-slate-400">{t('Current')}</div>
                    <div className="mt-2 text-xl font-display text-white">{fmtConverted(displayHistory[displayHistory.length - 1]!.price)}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">{selectedDisplayUnit}</div>
                  </div>
                  <div className="cp-metric-tile-dark">
                    <div className="cp-subtle-label !text-slate-400">{t('Period high')}</div>
                    <div className="mt-2 text-xl font-display text-white">
                      {fmtConverted(Math.max(...displayHistory.map((point) => point.high ?? point.price)))}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">{t('Maximum observed value')}</div>
                  </div>
                  <div className="cp-metric-tile-dark">
                    <div className="cp-subtle-label !text-slate-400">{t('Period low')}</div>
                    <div className="mt-2 text-xl font-display text-white">
                      {fmtConverted(Math.min(...displayHistory.map((point) => point.low ?? point.price)))}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">{historySource || 'Stored metal price series'}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/6 p-3">
                    <div className="cp-subtle-label !text-slate-400">{t('Period return')}</div>
                    <div className={`mt-2 font-mono text-xl font-semibold ${pctChange == null ? 'text-white' : pctChange >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {pctChange != null ? fmtChangePct(pctChange) : 'N/A'}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">{lang === 'ko' ? `${PERIOD_LABELS[period]} 구간 변동률` : `Over the ${PERIOD_LABELS[period]} window`}</div>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/6 p-3">
                    <div className="cp-subtle-label !text-slate-400">{t('Annualized volatility')}</div>
                    <div className="mt-2 font-mono text-xl font-semibold text-white">
                      {(() => {
                        const volatility = annualizedVolatilityPct(history.map((point) => point.price));
                        return volatility != null ? `${volatility.toFixed(1)}%` : 'N/A';
                      })()}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">{t('Std dev of daily returns, annualized (√252).')}</div>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/6 p-3">
                    <div className="cp-subtle-label !text-slate-400">{t('Position in period range')}</div>
                    <RangePositionBar
                      low={Math.min(...displayHistory.map((point) => point.low ?? point.price))}
                      high={Math.max(...displayHistory.map((point) => point.high ?? point.price))}
                      current={displayHistory[displayHistory.length - 1]!.price}
                      color={METAL_COLORS[selected || 'Pt'] || '#0d9488'}
                    />
                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                      <span>{fmtConverted(Math.min(...displayHistory.map((point) => point.low ?? point.price)))}</span>
                      <span>{fmtConverted(Math.max(...displayHistory.map((point) => point.high ?? point.price)))}</span>
                    </div>
                  </div>
                </div>

                {selectedRow ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] border border-white/10 bg-white/6 p-3">
                      <div className="cp-subtle-label !text-slate-400">{t('Source reliability')}</div>
                      <div className="mt-2 text-sm font-semibold text-white">{t(selectedRow.evidence.label)}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-400">{selectedRow.evidence.note}</div>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/6 p-3">
                      <div className="cp-subtle-label !text-slate-400">{t('Confidence')}</div>
                      <div className="mt-2 text-sm font-semibold text-white">{selectedRow.evidence.confidence_score}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-400">{selectedRow.evidence.transparency}</div>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/6 p-3">
                      <div className="cp-subtle-label !text-slate-400">{t('Quote age')}</div>
                      <div className="mt-2 text-sm font-semibold text-white">{selectedRow.evidence.freshness_status}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-400">{selectedRow.evidence.acquisition_mode}</div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
          </div>

          {comparableSymbols.length >= 2 ? (
            <div className="mt-4 rounded-[24px] border border-slate-900/8 bg-white/58 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="cp-subtle-label">{t('Relative performance')}</div>
                  <div className="cp-heading-sm mt-2">{t('Compare metals rebased to 100')}</div>
                  <div className="mt-1 text-xs leading-6 text-slate-600">
                    {t('Every series starts at 100 at the window open, so metals with very different absolute prices stay comparable.')}
                  </div>
                </div>
                <div className="flex gap-1 rounded-full bg-[#f2f4f6] p-1">
                  {TREND_PERIODS.map((value) => (
                    <button
                      key={value}
                      onClick={() => setTrendPeriod(value)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        trendPeriod === value ? 'bg-white text-[#191f28] shadow-[0_1px_3px_rgba(15,23,42,0.08)]' : 'text-slate-600 hover:text-slate-700'
                      }`}
                    >
                      {PERIOD_LABELS[value]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {comparableSymbols.map((symbol) => {
                  const isBase = symbol === selected;
                  const isOn = activeCompareSymbols.includes(symbol);
                  return (
                    <button
                      key={symbol}
                      disabled={isBase}
                      onClick={() =>
                        setCompareSymbols((current) =>
                          current.includes(symbol)
                            ? current.filter((item) => item !== symbol)
                            : [...current, symbol],
                        )
                      }
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        isOn
                          ? 'border-transparent text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      } ${isBase ? 'cursor-default' : ''}`}
                      style={isOn ? { backgroundColor: METAL_COLORS[symbol] || '#0d9488' } : undefined}
                    >
                      {symbol}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 h-[260px]">
                <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-slate-400">…</div>}>
                  <MetalCompareChart
                    series={activeCompareSymbols.map((symbol) => ({
                      symbol,
                      color: METAL_COLORS[symbol] || '#0d9488',
                      points: trends?.[symbol]?.points ?? [],
                    }))}
                  />
                </Suspense>
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-400">
                {t('Only metals with enough stored history appear here; non-exchange metals join as local snapshots accumulate.')}
              </div>
            </div>
          ) : null}
        </section>
        <div>{renderHistoryRail()}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <WorkspaceSectionNav
        sections={FEED_SECTIONS}
        activeSectionId={activeSectionId}
        activeIndex={activeIndex}
        onSelect={setActiveSection}
      />
      {activeSection.id === 'quotes' ? renderQuotes() : activeSection.id === 'history' ? renderTrend() : null}
      <WorkspaceSectionFooter
        activeSection={activeSection}
        activeIndex={activeIndex}
        totalSections={FEED_SECTIONS.length}
        onPrevious={goPrevious}
        onNext={goNext}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
      />
    </div>
  );
}
