import type { Manager, HeadToHeadStats } from '@/types';
import { calculateManagerScore, formatScore } from '@/score';
import { computeManagerClutchMetrics } from './econometrics';
import { computeTailRiskProfile } from './tailRisk';
import { computeStabilityProfile } from './badges';

export interface RadarAxisMetadata {
  key: 'prestige' | 'gci' | 'ki' | 'cr' | 'stability' | 'nti';
  label: string;
  shortTitle: string;
  acronym: string;
  description: string;
}

export const RADAR_CANONICAL_AXES: readonly RadarAxisMetadata[] = [
  {
    key: 'prestige',
    label: 'Prestigio',
    shortTitle: 'PRESTIGIO',
    acronym: 'PT',
    description: 'Rating All-Time cumulativo normalizzato sul benchmark di lega'
  },
  {
    key: 'gci',
    label: 'Freddezza (GCI)',
    shortTitle: 'FREDDEZZA',
    acronym: 'GCI',
    description: 'Global Clutch Index nei momenti decisivi (0..100)'
  },
  {
    key: 'ki',
    label: 'Killer Instinct',
    shortTitle: 'KILLER INST.',
    acronym: 'KI',
    description: 'Percentuale podi convertiti in oro (1° su top-3)'
  },
  {
    key: 'cr',
    label: 'Conversione Coppe',
    shortTitle: 'CONV. COPPE',
    acronym: 'FINALI',
    description: 'Percentuale finali di coppa vinte su finali giocate'
  },
  {
    key: 'stability',
    label: 'Stabilità Classifica',
    shortTitle: 'STABILITÀ',
    acronym: 'RANK',
    description: 'Costanza di rendimento (inverso della deviazione standard del rank)'
  },
  {
    key: 'nti',
    label: 'Sicurezza (Anti-Baratro)',
    shortTitle: 'RISCHIO CODA',
    acronym: 'NTI',
    description: 'Net Tail Index contro i piazzamenti di coda e cucchiai'
  }
] as const;

export const MULTI_MANAGER_PALETTE: readonly string[] = [
  '#f59e0b', // Amber / Gold (Rivale 1)
  '#06b6d4', // Cyan (Rivale 2)
  '#f43f5e', // Rose / Red (Rivale 3)
  '#10b981', // Emerald (Rivale 4)
  '#8b5cf6', // Violet / Purple (Rivale 5)
  '#3b82f6'  // Blue (Fallback / 6)
] as const;

export const H2H_CONTENDER_A_COLOR = '#f59e0b';
export const H2H_CONTENDER_B_COLOR = '#06b6d4';

export interface SingleRadarAxisValue {
  key: string;
  label: string;
  shortTitle: string;
  acronym: string;
  val: number; // Intervallo [0, 100]
  raw: string; // Valore grezzo formattato
}

export interface H2HAxisData {
  key: string;
  label: string;
  shortTitle: string;
  acronym: string;
  valA: number; // 0..100
  valB: number; // 0..100
  rawA: string;
  rawB: string;
}

/**
 * Computes individual 6-axis metric profile for a single manager normalized to benchmarkScore
 */
export function computeSingleManagerRadarAxes(
  manager: Manager,
  benchmarkScore: number
): SingleRadarAxisValue[] {
  const clutchMetrics = computeManagerClutchMetrics(manager);
  const score = calculateManagerScore(manager);
  const risk = computeTailRiskProfile(manager);
  const stability = computeStabilityProfile(manager);

  const safeBenchmark = Math.max(benchmarkScore, 10);
  const prestigeVal = Math.min(100, Math.max(0, Math.round((score / safeBenchmark) * 100)));
  const gciVal = Math.min(100, Math.max(0, Math.round(clutchMetrics.gci)));
  const kiVal = Math.min(100, Math.max(0, Math.round(clutchMetrics.kiPct)));
  const crVal = Math.min(100, Math.max(0, Math.round(clutchMetrics.crPct)));
  const stabilityVal = Math.min(100, Math.max(0, Math.round(Math.max(0, 100 - stability.stdDevRank * 18))));
  const ntiVal = Math.min(100, Math.max(0, Math.round(50 + risk.nti * 50)));

  return [
    {
      key: RADAR_CANONICAL_AXES[0].key,
      label: RADAR_CANONICAL_AXES[0].label,
      shortTitle: RADAR_CANONICAL_AXES[0].shortTitle,
      acronym: RADAR_CANONICAL_AXES[0].acronym,
      val: prestigeVal,
      raw: `${formatScore(score)} PT`
    },
    {
      key: RADAR_CANONICAL_AXES[1].key,
      label: RADAR_CANONICAL_AXES[1].label,
      shortTitle: RADAR_CANONICAL_AXES[1].shortTitle,
      acronym: RADAR_CANONICAL_AXES[1].acronym,
      val: gciVal,
      raw: `${clutchMetrics.clutch.label} (${Math.round(clutchMetrics.gci)})`
    },
    {
      key: RADAR_CANONICAL_AXES[2].key,
      label: RADAR_CANONICAL_AXES[2].label,
      shortTitle: RADAR_CANONICAL_AXES[2].shortTitle,
      acronym: RADAR_CANONICAL_AXES[2].acronym,
      val: kiVal,
      raw: `${clutchMetrics.kiPct}%`
    },
    {
      key: RADAR_CANONICAL_AXES[3].key,
      label: RADAR_CANONICAL_AXES[3].label,
      shortTitle: RADAR_CANONICAL_AXES[3].shortTitle,
      acronym: RADAR_CANONICAL_AXES[3].acronym,
      val: crVal,
      raw: `${clutchMetrics.crPct}%`
    },
    {
      key: RADAR_CANONICAL_AXES[4].key,
      label: RADAR_CANONICAL_AXES[4].label,
      shortTitle: RADAR_CANONICAL_AXES[4].shortTitle,
      acronym: RADAR_CANONICAL_AXES[4].acronym,
      val: stabilityVal,
      raw: stability.category
    },
    {
      key: RADAR_CANONICAL_AXES[5].key,
      label: RADAR_CANONICAL_AXES[5].label,
      shortTitle: RADAR_CANONICAL_AXES[5].shortTitle,
      acronym: RADAR_CANONICAL_AXES[5].acronym,
      val: ntiVal,
      raw: risk.label
    }
  ];
}

/**
 * Computes paired 6-axis data for Head-to-Head 1vs1 comparison
 * Maintains backward compatibility with HeadToHeadRadar and Duel Bars
 */
export function computeH2HAxes(
  stats: HeadToHeadStats,
  maxLeagueScore = 40
): H2HAxisData[] {
  const { metricsA, metricsB } = stats;

  const benchmarkScore = Math.max(metricsA.score, metricsB.score, maxLeagueScore, 10);
  const prestigeValA = Math.min(100, Math.max(0, Math.round((metricsA.score / benchmarkScore) * 100)));
  const prestigeValB = Math.min(100, Math.max(0, Math.round((metricsB.score / benchmarkScore) * 100)));

  const stabilityValA = Math.min(100, Math.max(0, Math.round(Math.max(0, 100 - metricsA.stdDevRank * 18))));
  const stabilityValB = Math.min(100, Math.max(0, Math.round(Math.max(0, 100 - metricsB.stdDevRank * 18))));

  const ntiValA = Math.min(100, Math.max(0, Math.round(50 + metricsA.nti * 50)));
  const ntiValB = Math.min(100, Math.max(0, Math.round(50 + metricsB.nti * 50)));

  return [
    {
      key: RADAR_CANONICAL_AXES[0].key,
      label: RADAR_CANONICAL_AXES[0].label,
      shortTitle: RADAR_CANONICAL_AXES[0].shortTitle,
      acronym: RADAR_CANONICAL_AXES[0].acronym,
      valA: prestigeValA,
      valB: prestigeValB,
      rawA: `${formatScore(metricsA.score)} PT`,
      rawB: `${formatScore(metricsB.score)} PT`
    },
    {
      key: RADAR_CANONICAL_AXES[1].key,
      label: RADAR_CANONICAL_AXES[1].label,
      shortTitle: RADAR_CANONICAL_AXES[1].shortTitle,
      acronym: RADAR_CANONICAL_AXES[1].acronym,
      valA: Math.min(100, Math.max(0, Math.round(metricsA.gci))),
      valB: Math.min(100, Math.max(0, Math.round(metricsB.gci))),
      rawA: `${metricsA.clutchLabel} (${Math.round(metricsA.gci)})`,
      rawB: `${metricsB.clutchLabel} (${Math.round(metricsB.gci)})`
    },
    {
      key: RADAR_CANONICAL_AXES[2].key,
      label: RADAR_CANONICAL_AXES[2].label,
      shortTitle: RADAR_CANONICAL_AXES[2].shortTitle,
      acronym: RADAR_CANONICAL_AXES[2].acronym,
      valA: Math.min(100, Math.max(0, Math.round(metricsA.kiPct))),
      valB: Math.min(100, Math.max(0, Math.round(metricsB.kiPct))),
      rawA: `${metricsA.kiPct}%`,
      rawB: `${metricsB.kiPct}%`
    },
    {
      key: RADAR_CANONICAL_AXES[3].key,
      label: RADAR_CANONICAL_AXES[3].label,
      shortTitle: RADAR_CANONICAL_AXES[3].shortTitle,
      acronym: RADAR_CANONICAL_AXES[3].acronym,
      valA: Math.min(100, Math.max(0, Math.round(metricsA.crPct))),
      valB: Math.min(100, Math.max(0, Math.round(metricsB.crPct))),
      rawA: `${metricsA.crPct}%`,
      rawB: `${metricsB.crPct}%`
    },
    {
      key: RADAR_CANONICAL_AXES[4].key,
      label: RADAR_CANONICAL_AXES[4].label,
      shortTitle: RADAR_CANONICAL_AXES[4].shortTitle,
      acronym: RADAR_CANONICAL_AXES[4].acronym,
      valA: stabilityValA,
      valB: stabilityValB,
      rawA: `${metricsA.stabilityCategory}`,
      rawB: `${metricsB.stabilityCategory}`
    },
    {
      key: RADAR_CANONICAL_AXES[5].key,
      label: RADAR_CANONICAL_AXES[5].label,
      shortTitle: RADAR_CANONICAL_AXES[5].shortTitle,
      acronym: RADAR_CANONICAL_AXES[5].acronym,
      valA: ntiValA,
      valB: ntiValB,
      rawA: `${metricsA.polarityLabel}`,
      rawB: `${metricsB.polarityLabel}`
    }
  ];
}
