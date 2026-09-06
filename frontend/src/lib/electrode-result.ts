import type { CostResult } from './api';

export function electrodeCostRows(result: CostResult) {
  const electrode = result.electrode_model;
  if (!electrode) return null;
  return electrode.breakdown.map((item) => ({
    label: item.label,
    costPerCm2: item.cost_usd / electrode.active_area_cm2,
    share: electrode.total_cost_usd > 0 ? 100 * item.cost_usd / electrode.total_cost_usd : 0,
  }));
}
