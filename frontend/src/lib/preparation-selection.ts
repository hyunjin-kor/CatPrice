import type { ProcessTemplate, TemplateCost } from './api';

export function sameSteps(left: string[], right: string[]) {
  const orderedRight = [...right].sort();
  return left.length === right.length && [...left].sort().every((key, index) => key === orderedRight[index]);
}

export function isThermalTemplateReady(
  selectedId: string | null,
  costs: Record<string, TemplateCost>,
  steps: string[],
  orderSize: number,
  costOrderSize: number | null,
) {
  if (!selectedId) return true;
  const fitted = costs[selectedId]?.steps_fitted;
  return orderSize === costOrderSize && !!fitted?.length && sameSteps(fitted, steps);
}

export function matchThermalTemplate(
  templates: ProcessTemplate[],
  costs: Record<string, TemplateCost>,
  steps: string[],
  selectedId: string | null,
) {
  const matches = templates.filter((template) => {
    const fitted = costs[template.id]?.steps_fitted;
    return sameSteps(fitted?.length ? fitted : template.steps, steps);
  });
  return matches.find((template) => template.id === selectedId) ?? (matches.length === 1 ? matches[0] : null);
}
