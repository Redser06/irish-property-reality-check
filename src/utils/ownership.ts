/**
 * Turns a budget and a set of city costs into what the place actually costs to
 * buy and hold.
 *
 * Sticker price is a poor guide: US recurring property tax runs an order of
 * magnitude above Ireland's LPT, so two cities with the same headline number can
 * differ by six figures over a decade.
 */
import type { CityCosts, OwnershipCost, OwnershipCostLine, PropertyKind, PurchaseTax, RecurringTax } from '../types';

/**
 * Progressive band calculation. Each band's rate applies only to the slice of
 * value inside it — the classic bug here is applying the top rate to the whole
 * amount, which overstates a EUR 1,000,001 purchase enormously.
 */
export function purchaseTaxEur(priceEur: number, tax: PurchaseTax): number {
  if (tax.model === 'flat-pct') return (priceEur * tax.ratePct) / 100;

  let remaining = priceEur;
  let lower = 0;
  let total = 0;

  for (const band of tax.bands) {
    if (remaining <= 0) break;
    const upper = band.upToEur ?? Infinity;
    const slice = Math.max(0, Math.min(priceEur, upper) - lower);
    total += (slice * band.ratePct) / 100;
    remaining -= slice;
    lower = upper;
  }
  return total;
}

export function recurringTaxEur(priceEur: number, tax: RecurringTax): number {
  if (tax.model === 'none') return 0;
  if (tax.model === 'flat') return tax.annualEur;
  return (priceEur * tax.ratePct) / 100;
}

export function calculateOwnership(
  priceEur: number,
  floorAreaSqM: number,
  kind: PropertyKind | undefined,
  costs: CityCosts,
): OwnershipCost {
  const upfrontEur = Math.round(purchaseTaxEur(priceEur, costs.purchase.transferTax) + costs.purchase.fixedFeesEur);

  const propertyTax = Math.round(recurringTaxEur(priceEur, costs.holding.recurringPropertyTax));
  const energy = Math.round(floorAreaSqM * costs.holding.energy.typicalKWhPerSqMYear * costs.holding.energy.eurPerKWh);
  const insurance = Math.round(costs.holding.insuranceEurPerYear);

  // Service charge is an apartment cost. Applying it to a detached house would
  // be inventing a management company.
  const service =
    kind === 'apartment' && costs.holding.serviceChargeEurPerSqMYear
      ? Math.round(floorAreaSqM * costs.holding.serviceChargeEurPerSqMYear)
      : 0;

  const breakdown: OwnershipCostLine[] = [
    { label: 'Property tax', annualEur: propertyTax },
    { label: 'Energy', annualEur: energy },
    { label: 'Insurance', annualEur: insurance },
  ];
  if (service > 0) breakdown.push({ label: 'Service charge', annualEur: service });

  const annualEur = breakdown.reduce((sum, l) => sum + l.annualEur, 0);

  return {
    upfrontEur,
    annualEur,
    // Nominal and undiscounted. Modelling inflation and rate paths here would be
    // false precision on top of country-level tax averages.
    tenYearTotalEur: upfrontEur + annualEur * 10,
    breakdown,
    confidence: costs.confidence,
    source: costs.source,
  };
}
