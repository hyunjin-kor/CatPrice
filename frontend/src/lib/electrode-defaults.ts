import type { ApplicationFamily, MaterialItem } from './api';

export function preferredScopeRank(material: MaterialItem) {
  switch (material.price_scope) {
    case 'literature_high_volume':
      return 0;
    case 'historical_bulk':
      return 1;
    case 'vendor_lab':
      return 2;
    default:
      return 3;
  }
}

export function electrocatalystTemplateRank(
  material: MaterialItem,
  category: string,
  applicationFamily: ApplicationFamily,
  templateId: string,
) {
  const text = `${material.name} ${material.formula ?? ''} ${material.symbol ?? ''}`.toLowerCase();
  const symbol = (material.symbol ?? '').toLowerCase();
  const exactFamilyRank =
    material.application_family === applicationFamily
      ? 0
      : material.application_family === 'general'
        ? 1
        : 2;

  const isPemElectrolyzer = templateId === 'pem_electrolyzer_ccm';
  const isDmfc = templateId === 'dmfc_gde_route';
  const isPemRoute = templateId === 'pem_fuel_cell_ccm' || isDmfc;

  if (applicationFamily !== 'electrolyzer' && !isPemRoute) {
    return exactFamilyRank;
  }
  const isPfsa = text.includes('pfsa') || text.includes('aquivion');
  const isAem = text.includes('aem') || text.includes('piperion') || text.includes('sustainion') || text.includes('pdt');
  const isTitanium = text.includes('titanium') || text.includes('ptl') || text.includes('frit');
  const isNickel = text.includes('nickel');
  const isCarbon = text.includes('carbon');

  if (category === 'Ionomer' || category === 'Membrane') {
    if (isPemElectrolyzer || isPemRoute) return isPfsa ? 0 : isAem ? 1 : 2;
    return isAem ? 0 : isPfsa ? 1 : 2;
  }

  if (category === 'Gas Diffusion Layer') {
    if (isPemElectrolyzer) return isTitanium ? 0 : isCarbon ? 1 : isNickel ? 2 : 3;
    if (isPemRoute) return isCarbon ? 0 : isTitanium ? 1 : isNickel ? 2 : 3;
    return isNickel ? 0 : isCarbon ? 1 : isTitanium ? 2 : 3;
  }

  if (category === 'Electrocatalyst Powder') {
    if (isPemElectrolyzer) {
      if (symbol === 'ir') return 0;
      if (symbol === 'ru') return 1;
      if (symbol === 'ptir') return 2;
      return 3;
    }
    if (isPemRoute) {
      if (symbol === 'ptru') return isDmfc ? 0 : 1;
      if (symbol === 'pt') return isDmfc ? 1 : 0;
      return 2;
    }
    if (symbol === 'ni') return 0;
    if (symbol === 'ag') return 1;
    if (symbol === 'ir' || symbol === 'ru') return 2;
    return 3;
  }

  return exactFamilyRank;
}

export function compareElectroPreference(
  left: MaterialItem,
  right: MaterialItem,
  category: string,
  applicationFamily: ApplicationFamily,
  templateId: string,
) {
  const templateDelta =
    electrocatalystTemplateRank(left, category, applicationFamily, templateId)
    - electrocatalystTemplateRank(right, category, applicationFamily, templateId);
  if (templateDelta !== 0) return templateDelta;
  const scopeDelta = preferredScopeRank(left) - preferredScopeRank(right);
  if (scopeDelta !== 0) return scopeDelta;
  const leftPrice = left.price ?? Number.POSITIVE_INFINITY;
  const rightPrice = right.price ?? Number.POSITIVE_INFINITY;
  if (leftPrice !== rightPrice) return leftPrice - rightPrice;
  return left.name.localeCompare(right.name);
}
