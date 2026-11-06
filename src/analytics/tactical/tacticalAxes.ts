/**
 * src/analytics/tactical/tacticalAxes.ts
 * Raw Tactical Metrics Extraction, Z-Score Normalization and Radar Chart Geometry
 */

import type { Manager } from '@/types';
import { getActiveCompetitions } from '@/config';
import { getManagerTrophyCount, getManagerTotalTrophies } from '@/score';
import { computeStabilityProfile } from '../badges';
import { getCachedAnalyticsManagers } from '../analyticsCore';
import type { RawManagerTacticalValues } from './types';

export function extractManagerCupAndHonorMetrics(manager: Manager) {
  const activeComps = getActiveCompetitions();
  let finalsWon = 0;
  let finalsLost = 0;
  let dishonors = 0;

  for (const comp of activeComps) {
    if (comp.type === 'dishonor' || comp.type === 'banners') {
      dishonors += getManagerTrophyCount(manager, comp.id, 'gold');
    } else if (comp.id !== 'championship') {
      finalsWon += getManagerTrophyCount(manager, comp.id, 'gold');
      finalsLost += getManagerTrophyCount(manager, comp.id, 'silver');
    }
  }

  const totalMajor = getManagerTotalTrophies(manager, activeComps);
  const gold = getManagerTrophyCount(manager, 'championship', 'gold');
  const silver = getManagerTrophyCount(manager, 'championship', 'silver');
  const bronze = getManagerTrophyCount(manager, 'championship', 'bronze');
  const podiums = gold + silver + bronze;

  return { finalsWon, finalsLost, dishonors, totalMajor, gold, silver, bronze, podiums };
}

export function computeRawManagerValues(
  manager: Manager,
  analyticsManagers = getCachedAnalyticsManagers()
): RawManagerTacticalValues {
  const eloProfile = analyticsManagers ? analyticsManagers[manager.id] : null;
  const allStats = eloProfile?.seasonStats?.['all'];
  const { finalsWon, finalsLost, dishonors, gold, silver, bronze } = extractManagerCupAndHonorMetrics(manager);

  // 1. POT (Potenza Offensiva)
  const completedHistory = (manager.history || []).filter(
    h => !h.in_progress && h.status !== 'in_progress' && typeof h.rank === 'number' && h.rank > 0
  );
  let avgFP = allStats?.avgFP ?? 0;
  if (avgFP <= 0) {
    if (completedHistory.length > 0) {
      const avgRank = completedHistory.reduce((s, h) => s + (h.rank as number), 0) / completedHistory.length;
      avgFP = parseFloat((73.0 - (avgRank - 1) * 0.45 + Math.min(1.5, gold * 0.35)).toFixed(2));
    } else if (gold > 0) {
      avgFP = 71.0 + Math.min(2.5, gold * 0.6);
    } else if (manager.years <= 2 && (silver > 0 || bronze > 0)) {
      avgFP = 72.0;
    } else {
      avgFP = 70.0;
    }
  }
  const goalsPerMatch = allStats && allStats.played > 0
    ? (allStats.gf / allStats.played)
    : Math.max(0.8, 1.35 + (avgFP - 70.0) * 0.12);
  const rawPOT = 0.70 * avgFP + 0.30 * (goalsPerMatch * 48.0);

  // 2. CIN (Cinismo Corto Muso)
  let closeWinRate = 50.0;
  if (eloProfile?.flat?.trajectory && eloProfile.flat.trajectory.length > 0) {
    const trajectory = eloProfile.flat.trajectory;
    const wins = trajectory.filter(m => m.result === 'W');
    if (wins.length >= 3) {
      const closeWins = wins.filter(m => {
        const goalDiff = (m.gf ?? 0) - (m.ga ?? 0);
        const lowScore = typeof m.fpFor === 'number' && m.fpFor > 0 && m.fpFor <= 68.0;
        return goalDiff === 1 || lowScore;
      });
      closeWinRate = parseFloat(((closeWins.length / wins.length) * 100).toFixed(1));
    } else {
      closeWinRate = 50.0 + (gold * 5.0) - (silver * 3.0);
    }
  } else {
    closeWinRate = 50.0 + (gold * 6.0) - (silver * 2.5);
  }
  const rawCIN = Math.min(95, Math.max(20, closeWinRate));

  // 3. LUK (Fattore Fortuna)
  const luckDelta = allStats?.luckDelta ?? 0.0;
  const rawLUK = luckDelta;

  // 4. KOC (Freddezza da Coppe) - Monotonic Bayesian Shrinkage
  const finalsPlayed = finalsWon + finalsLost;
  const bayesianWinRate = (finalsWon + 0.5) / (finalsPlayed + 1.5);
  const rawKOC = (finalsWon * 22.0) + (finalsLost * 7.0) + (15.0 * bayesianWinRate);

  // 5. REG (Regolarità Metodica)
  const stability = computeStabilityProfile(manager);
  let rawREG = Math.max(15, 100 - (stability.stdDevRank * 14.0) - (dishonors * 12.0));
  if (manager.years <= 2) {
    // Shrink rookie stability toward neutral 55 so 1-2 seasons don't artificially distort career stability
    rawREG = 0.35 * rawREG + 0.65 * 55.0;
  }

  return {
    pot: rawPOT,
    cin: rawCIN,
    luk: rawLUK,
    koc: rawKOC,
    reg: rawREG,
    avgFP,
    closeWinRate,
    luckDelta,
    finalsPlayed,
    finalsWon,
    stdDevRank: stability.stdDevRank
  };
}

/**
 * Calculates SVG polygon points string for a 5-axis radar chart
 * Center (120, 110), Max Radius = 80
 * Angles: POT (-90°), CIN (-18°), LUK (54°), REG (126°), KOC (198°)
 */
export function calculateRadarSvgPoints(
  scores: { pot: number; cin: number; luk: number; reg: number; koc: number },
  cx = 120,
  cy = 110,
  maxRadius = 80
): string {
  const angles = [
    -Math.PI / 2,                  // 0: POT (top)
    -Math.PI / 2 + (2 * Math.PI) / 5, // 1: CIN (top right)
    -Math.PI / 2 + (4 * Math.PI) / 5, // 2: LUK (bottom right)
    -Math.PI / 2 + (6 * Math.PI) / 5, // 3: REG (bottom left)
    -Math.PI / 2 + (8 * Math.PI) / 5  // 4: KOC (top left)
  ];

  const axisValues = [scores.pot, scores.cin, scores.luk, scores.reg, scores.koc];

  const points = axisValues.map((score, idx) => {
    const fraction = Math.min(100, Math.max(5, score)) / 100;
    const r = fraction * maxRadius;
    const x = Math.round(cx + r * Math.cos(angles[idx]));
    const y = Math.round(cy + r * Math.sin(angles[idx]));
    return `${x},${y}`;
  });

  return points.join(' ');
}
