import type { Manager } from '@/types';

/**
 * Computes asymmetric disaster mass with Spoon priority:
 * Spoon = 1.00, Cartonato = 0.75
 */
export function computeDisasterMass(spoon: number, cartonato: number): number {
  return (spoon || 0) * 1.0 + (cartonato || 0) * 0.75;
}

/**
 * Computes asymmetric feast mass:
 * Gold = 1.00, CupGold = 0.50
 */
export function computeFeastMass(gold: number, cupGold: number): number {
  return (gold || 0) * 1.0 + (cupGold || 0) * 0.5;
}

/**
 * Computes Bayesian-smoothed Feast-or-Famine ratio using Empirical Bayes prior
 */
export function computeSmoothedFF(tailMass: number, years: number, k: number = 2.0, priorFF: number = 0.30): number {
  return parseFloat(((tailMass + k * priorFF) / (years + k)).toFixed(2));
}

/**
 * Computes regularized Net Tail Skew with shrinkage prior M = 1.5
 */
export function computeNetTailSkew(feastMass: number, disasterMass: number, mPrior: number = 1.5): number {
  const total = feastMass + disasterMass;
  if (total === 0) return 0;
  return parseFloat(((feastMass - disasterMass) / (total + mPrior)).toFixed(2));
}

/**
 * Resolves qualitative polarity label, color, and icon for a given NTI value
 */
export function getNTIPolarity(nti: number): { label: string; color: string; icon: string } {
  if (nti >= 0.30) {
    return { label: 'Cannibale Assoluto', color: '#10b981', icon: 'fa-bolt' };
  } else if (nti >= 0.08) {
    return { label: 'Attaccante Efficace', color: '#34d399', icon: 'fa-crosshairs' };
  } else if (nti <= -0.30) {
    return { label: 'Bersaglio Mobile', color: '#ef4444', icon: 'fa-bullseye' };
  } else if (nti <= -0.08) {
    return { label: 'Vulnerabile', color: '#f59e0b', icon: 'fa-shield-halved' };
  }
  return { label: 'Neutro / Bilanciato', color: '#94a3b8', icon: 'fa-scale-balanced' };
}

/**
 * Computes unified tail-risk profile for an individual manager
 */
export function computeTailRiskProfile(m: Manager, leagueAvgFF: number = 0.30): {
  feastMass: number;
  disasterMass: number;
  totalTailMass: number;
  rawFF: number;
  smoothedFF: number;
  nts: number;
  nti: number;
  label: string;
  color: string;
  icon: string;
} {
  const feastMass = computeFeastMass(m.gold || 0, m.cup_gold || 0);
  const disasterMass = computeDisasterMass(m.spoon || 0, m.cartonato || 0);
  const totalTailMass = feastMass + disasterMass;
  const rawFF = m.years > 0 ? parseFloat((totalTailMass / m.years).toFixed(2)) : 0;
  const smoothedFF = computeSmoothedFF(totalTailMass, m.years, 2.0, leagueAvgFF);
  const nts = computeNetTailSkew(feastMass, disasterMass, 1.5);
  const nti = parseFloat((smoothedFF * nts).toFixed(2));
  const polarity = getNTIPolarity(nti);

  return {
    feastMass,
    disasterMass,
    totalTailMass,
    rawFF,
    smoothedFF,
    nts,
    nti,
    label: polarity.label,
    color: polarity.color,
    icon: polarity.icon
  };
}
