import { useMemo, useState } from 'react';
import {
  fetchCapEx,
  type CapExRequest,
  type CapExResult,
  type EquipmentScalingItem,
} from '../lib/api';
import { useLang } from '../lib/i18n';

type InputMode = 'lump_sum' | 'equipment_list';

const DEFAULT_EQUIPMENT: EquipmentScalingItem[] = [
  { name: 'Slurry mixer', base_cost_usd: 35000, base_size: 5, target_size: 20, exponent: 0.6, quantity: 1 },
  { name: 'Rotary kiln', base_cost_usd: 250000, base_size: 10, target_size: 40, exponent: 0.65, quantity: 1 },
];

function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `eq-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function formatUSD(value: number): string {
  if (!Number.isFinite(value)) return '-';
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
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

function RailRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
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

export default function CapEx() {
  const { t } = useLang();
  const [mode, setMode] = useState<InputMode>('lump_sum');
  const [lumpCost, setLumpCost] = useState<number>(1_000_000);
  const [equipmentRows, setEquipmentRows] = useState<Array<{ id: string } & EquipmentScalingItem>>(
    () => DEFAULT_EQUIPMENT.map((row) => ({ id: uid(), ...row })),
  );
  const [includeOpEx, setIncludeOpEx] = useState<boolean>(false);
  const [directLabor, setDirectLabor] = useState<number>(250_000);
  const [rawMaterials, setRawMaterials] = useState<number>(800_000);
  const [utilities, setUtilities] = useState<number>(120_000);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CapExResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const equipmentSubtotal = useMemo(
    () =>
      equipmentRows.reduce((sum, row) => {
        if (row.base_size <= 0 || row.target_size <= 0 || row.base_cost_usd <= 0) return sum;
        const scaled = row.base_cost_usd * Math.pow(row.target_size / row.base_size, row.exponent);
        return sum + scaled * row.quantity;
      }, 0),
    [equipmentRows],
  );

  function updateRow(id: string, patch: Partial<EquipmentScalingItem>) {
    setEquipmentRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setEquipmentRows((rows) => [
      ...rows,
      { id: uid(), name: `Equipment ${rows.length + 1}`, base_cost_usd: 50000, base_size: 5, target_size: 20, exponent: 0.6, quantity: 1 },
    ]);
  }

  function removeRow(id: string) {
    setEquipmentRows((rows) => (rows.length > 1 ? rows.filter((row) => row.id !== id) : rows));
  }

  async function handleCalculate() {
    setLoading(true);
    setError(null);
    setResult(null);

    const request: CapExRequest = {};
    if (mode === 'lump_sum') {
      if (!Number.isFinite(lumpCost) || lumpCost <= 0) {
        setError('Purchased equipment cost must be a positive number.');
        setLoading(false);
        return;
      }
      request.purchased_equipment_cost_usd = lumpCost;
    } else {
      if (equipmentRows.length === 0) {
        setError('Add at least one equipment line.');
        setLoading(false);
        return;
      }
      request.equipment = equipmentRows.map((row) => ({
        name: row.name,
        base_cost_usd: row.base_cost_usd,
        base_size: row.base_size,
        target_size: row.target_size,
        exponent: row.exponent,
        quantity: row.quantity,
      }));
    }

    if (includeOpEx) {
      request.opex_inputs = {
        direct_labor_cost_usd: directLabor,
        raw_materials_cost_usd: rawMaterials,
        utilities_cost_usd: utilities,
      };
    }

    try {
      const data = await fetchCapEx(request);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to calculate CapEx.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="surface-card cp-enter overflow-hidden px-5 py-6 sm:px-6" style={{ animationDelay: '0.06s' }}>
        <div className="flex flex-col gap-4 border-b border-slate-900/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="cp-heading-xl">{t('Capital & OpEx')}</h2>
            <p className="cp-body-copy mt-1.5 max-w-2xl">
              {t('Factor purchased equipment into FCI and TCI using Peters & Timmerhaus Lang factors, then optionally layer annual OpEx on top.')}
            </p>
          </div>
          <span className="cp-chip">CatCost Ch.7</span>
        </div>

        <div className="mt-5 inline-flex rounded-full border border-slate-900/8 bg-white/60 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode('lump_sum')}
            className={`rounded-full px-4 py-1.5 transition ${mode === 'lump_sum' ? 'bg-[#191f28] text-white' : 'text-slate-600 hover:text-[#191f28]'}`}
          >
            {t('Lump-sum equipment cost')}
          </button>
          <button
            type="button"
            onClick={() => setMode('equipment_list')}
            className={`rounded-full px-4 py-1.5 transition ${mode === 'equipment_list' ? 'bg-[#191f28] text-white' : 'text-slate-600 hover:text-[#191f28]'}`}
          >
            {t('Equipment list (six-tenths rule)')}
          </button>
        </div>

        {mode === 'lump_sum' ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <label className="block">
              <div className="cp-subtle-label">{t('Purchased equipment cost (USD)')}</div>
              <div className="mt-2">
                <input
                  type="number"
                  min={0}
                  value={lumpCost}
                  onChange={(event) => setLumpCost(Number(event.target.value))}
                  className="input-base"
                />
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-600">
                {t('Already-summed value of all purchased equipment. Use this when you have a vendor quote or a high-level scaling already done.')}
              </div>
            </label>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs leading-6 text-slate-600">
              {t('Each equipment line is scaled as Cost = base cost × (target size / base size)^exponent. Exponent 0.6 (six-tenths rule) is the usual default.')}{' '}
              {t('Live preview total:')} <span className="font-semibold text-[#191f28]">{formatUSD(equipmentSubtotal)}</span>.
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">{t('Name')}</th>
                    <th className="px-3 py-2 font-semibold">{t('Base cost ($)')}</th>
                    <th className="px-3 py-2 font-semibold">{t('Base size')}</th>
                    <th className="px-3 py-2 font-semibold">{t('Target size')}</th>
                    <th className="px-3 py-2 font-semibold">{t('Exponent')}</th>
                    <th className="px-3 py-2 font-semibold">{t('Qty')}</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <input
                          value={row.name}
                          onChange={(event) => updateRow(row.id, { name: event.target.value })}
                          className="input-base !py-1.5 !text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={row.base_cost_usd}
                          onChange={(event) => updateRow(row.id, { base_cost_usd: Number(event.target.value) })}
                          className="input-base !py-1.5 !text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.base_size}
                          onChange={(event) => updateRow(row.id, { base_size: Number(event.target.value) })}
                          className="input-base !py-1.5 !text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.target_size}
                          onChange={(event) => updateRow(row.id, { target_size: Number(event.target.value) })}
                          className="input-base !py-1.5 !text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.05"
                          min={0.1}
                          max={1.5}
                          value={row.exponent}
                          onChange={(event) => updateRow(row.id, { exponent: Number(event.target.value) })}
                          className="input-base !py-1.5 !text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={row.quantity}
                          onChange={(event) => updateRow(row.id, { quantity: Math.max(1, Math.floor(Number(event.target.value) || 1)) })}
                          className="input-base !py-1.5 !text-xs w-20"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={equipmentRows.length <= 1}
                          className="cp-button-secondary px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t('Remove')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addRow} className="cp-button-secondary px-3 py-2 text-xs">
              {t('+ Add equipment line')}
            </button>
          </div>
        )}

        <div className="mt-5 rounded-[18px] border border-slate-900/8 bg-white/60 px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-[#191f28]">
            <input
              type="checkbox"
              checked={includeOpEx}
              onChange={(event) => setIncludeOpEx(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0d9488] focus:ring-[#0d9488]"
            />
            <span className="font-semibold">{t('Layer annual OpEx on top')}</span>
          </label>
          {includeOpEx ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <div className="cp-subtle-label">{t('Direct labor ($/yr)')}</div>
                <div className="mt-2">
                  <input type="number" min={0} value={directLabor} onChange={(event) => setDirectLabor(Number(event.target.value))} className="input-base" />
                </div>
              </label>
              <label className="block">
                <div className="cp-subtle-label">{t('Raw materials ($/yr)')}</div>
                <div className="mt-2">
                  <input type="number" min={0} value={rawMaterials} onChange={(event) => setRawMaterials(Number(event.target.value))} className="input-base" />
                </div>
              </label>
              <label className="block">
                <div className="cp-subtle-label">{t('Utilities ($/yr)')}</div>
                <div className="mt-2">
                  <input type="number" min={0} value={utilities} onChange={(event) => setUtilities(Number(event.target.value))} className="input-base" />
                </div>
              </label>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            {t(error)}
          </div>
        ) : null}

        <div className="mt-5">
          <button onClick={handleCalculate} disabled={loading} className="cp-button-primary disabled:opacity-60">
            {loading ? t('Calculating...') : includeOpEx ? t('Calculate CapEx + OpEx') : t('Calculate CapEx')}
          </button>
        </div>
      </section>

      {result ? (
        <section className="surface-card cp-enter overflow-hidden p-4 sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_repeat(3,minmax(0,1fr))]">
            <div className="min-w-0 overflow-hidden rounded-[20px] border border-[#191f28] bg-[#191f28] p-4 text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
              <div className="cp-subtle-label !text-slate-400">{t('Total Capital Investment')}</div>
              <div className="mt-2 text-sm text-slate-300">{t('CatCost Ch.7 factored estimate')}</div>
              <div className="mt-4 text-3xl font-display">{formatUSD(result.summary.total_capital_investment_usd)}</div>
              <div className="mt-2 text-xs leading-6 text-slate-300">
                FCI {formatUSD(result.summary.fixed_capital_investment_usd)} + {t('working capital')}{' '}
                {formatUSD(result.capex.working_capital)}.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="cp-chip-dark">{t('PE basis')}</span>
                <span className="cp-chip-dark">{formatUSD(result.summary.purchased_equipment_cost_usd)}</span>
                <span className="cp-chip-dark">FCI/PE {result.summary.fci_to_purchased_equipment_ratio.toFixed(2)}x</span>
              </div>
            </div>
            <MetricTile
              label={t('Purchased equipment')}
              value={formatUSD(result.capex.purchased_equipment)}
              detail={t('Sum of equipment-line scaling, before factor expansion.')}
            />
            <MetricTile
              label={t('Fixed Capital Investment')}
              value={formatUSD(result.capex.fixed_capital_investment)}
              detail={`${t('Direct')} ${formatUSD(result.capex.direct_capital)} + ${t('indirect')} ${formatUSD(result.capex.indirect_capital)}`}
            />
            <MetricTile
              label={t('Working capital')}
              value={formatUSD(result.capex.working_capital)}
              detail={`${(result.capex.working_capital / Math.max(result.capex.purchased_equipment, 1) * 100).toFixed(0)}% ${t('of PE, typical 70-89%')}`}
            />
          </div>

          {result.equipment_resolution.length > 0 ? (
            <div className="mt-5 rounded-[24px] border border-slate-900/8 bg-white/58 p-4">
              <div className="cp-subtle-label">{t('Equipment scaling audit')}</div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">{t('Name')}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t('Base cost')}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t('Base size')}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t('Target size')}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t('Exponent')}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t('Qty')}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t('Scaled unit')}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t('Line total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.equipment_resolution.map((line, idx) => (
                      <tr key={`${line.name}-${idx}`} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-900">{line.name}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatUSD(line.base_cost_usd)}</td>
                        <td className="px-3 py-2 text-right">{line.base_size}</td>
                        <td className="px-3 py-2 text-right">{line.target_size}</td>
                        <td className="px-3 py-2 text-right">{line.exponent.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{line.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatUSD(line.scaled_unit_cost_usd)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatUSD(line.line_total_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[24px] border border-slate-900/8 bg-white/58 p-4">
              <div className="cp-subtle-label">{t('Direct capital')}</div>
              <div className="mt-2 cp-heading-sm">{t('Inside the battery limits')}</div>
              <div className="mt-3 space-y-1">
                <RailRow label={t('Purchased equipment')} value={formatUSD(result.capex.purchased_equipment)} />
                <RailRow label={t('Installation')} value={formatUSD(result.capex.installation)} />
                <RailRow label={t('Instrumentation & controls')} value={formatUSD(result.capex.instrumentation)} />
                <RailRow label={t('Piping')} value={formatUSD(result.capex.piping)} />
                <RailRow label={t('Electrical')} value={formatUSD(result.capex.electrical)} />
                <RailRow label={t('Buildings')} value={formatUSD(result.capex.buildings)} />
                <RailRow label={t('Yard improvements')} value={formatUSD(result.capex.yard_improvements)} />
                <RailRow label={t('Service facilities')} value={formatUSD(result.capex.service_facilities)} />
                <RailRow label={t('Land')} value={formatUSD(result.capex.land)} />
                <RailRow label={t('Direct subtotal')} value={formatUSD(result.capex.direct_capital)} detail={t('Sum of direct capital lines')} />
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-900/8 bg-white/58 p-4">
              <div className="cp-subtle-label">{t('Indirect capital')}</div>
              <div className="mt-2 cp-heading-sm">{t('Engineering, contractor, contingency')}</div>
              <div className="mt-3 space-y-1">
                <RailRow label={t('Engineering & supervision')} value={formatUSD(result.capex.engineering_supervision)} />
                <RailRow label={t('Construction')} value={formatUSD(result.capex.construction)} />
                <RailRow label={t('Legal')} value={formatUSD(result.capex.legal)} />
                <RailRow label={t("Contractor's fee")} value={formatUSD(result.capex.contractors_fee)} />
                <RailRow label={t('Contingency')} value={formatUSD(result.capex.contingency)} />
                <RailRow label={t('Indirect subtotal')} value={formatUSD(result.capex.indirect_capital)} detail={t('Sum of indirect capital lines')} />
                <RailRow label={t('Working capital')} value={formatUSD(result.capex.working_capital)} detail={t('Carried separate from FCI')} />
                <RailRow label={t('Total Capital Investment')} value={formatUSD(result.capex.total_capital_investment)} detail={t('FCI + working capital')} />
              </div>
            </div>
          </div>

          {result.opex ? (
            <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="cp-subtle-label !text-emerald-700">{t('Annual OpEx')}</div>
                  <div className="cp-heading-sm mt-2">
                    {formatUSD(result.opex.total_annual_opex)}{t("/yr")}
                  </div>
                  <div className="mt-1 text-xs leading-6 text-emerald-900">
                    {t('Layered on top of CapEx using your direct-labor / raw-material / utilities inputs and CatCost Ch.7 factors.')}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[18px] border border-slate-200 bg-white/72 p-3">
                  <div className="cp-subtle-label">{t('Direct operating')}</div>
                  <div className="mt-2 space-y-1">
                    <RailRow label={t('Raw materials')} value={formatUSD(result.opex.raw_materials)} />
                    <RailRow label={t('Direct labor')} value={formatUSD(result.opex.direct_labor)} />
                    <RailRow label={t('Supervisory & clerical')} value={formatUSD(result.opex.supervisory_clerical)} />
                    <RailRow label={t('Utilities')} value={formatUSD(result.opex.utilities)} />
                    <RailRow label={t('Laboratory')} value={formatUSD(result.opex.laboratory)} />
                    <RailRow label={t('Maintenance & repair')} value={formatUSD(result.opex.maintenance_repair)} />
                    <RailRow label={t('Operating supplies')} value={formatUSD(result.opex.operating_supplies)} />
                    <RailRow label={t('Direct subtotal')} value={formatUSD(result.opex.direct_operating_total)} />
                  </div>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-white/72 p-3">
                  <div className="cp-subtle-label">{t('Fixed operating')}</div>
                  <div className="mt-2 space-y-1">
                    <RailRow label={t('Local taxes')} value={formatUSD(result.opex.local_taxes)} />
                    <RailRow label={t('Insurance')} value={formatUSD(result.opex.insurance)} />
                    <RailRow label={t('Rent')} value={formatUSD(result.opex.rent)} />
                    <RailRow label={t('Plant overhead')} value={formatUSD(result.opex.plant_overhead)} />
                    <RailRow label={t('Fixed subtotal')} value={formatUSD(result.opex.fixed_operating_total)} />
                  </div>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-white/72 p-3">
                  <div className="cp-subtle-label">{t('General expenses')}</div>
                  <div className="mt-2 space-y-1">
                    <RailRow label={t('Administration')} value={formatUSD(result.opex.administration)} />
                    <RailRow label={t('Distribution & marketing')} value={formatUSD(result.opex.distribution_marketing)} />
                    <RailRow label={t('R&D')} value={formatUSD(result.opex.rnd)} />
                    <RailRow label={t('Overhead subtotal')} value={formatUSD(result.opex.general_expenses_total)} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
