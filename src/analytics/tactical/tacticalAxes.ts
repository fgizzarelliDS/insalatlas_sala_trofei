/**
 * src/analytics/tactical/tacticalAxes.ts
 * Raw Tactical Metrics Extraction, Z-Score Normalization and Radar Chart Geometry
 */

import type { Manager, LiveSeasonDetails } from '@/types';
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
 * Computes raw tactical metrics for a manager exclusively within the current live season.
 * Returns null if the manager has not played in the live season.
 */
export function computeRawManagerSeasonalValues(
  manager: Manager,
  liveData?: LiveSeasonDetails | null,
  analyticsManagers = getCachedAnalyticsManagers()
): RawManagerTacticalValues | null {
  if (!liveData || !liveData.standings || liveData.standings.length === 0) {
    return null;
  }

  const standing = liveData.standings.find(
    s => s.managerId === manager.id || s.coach?.toLowerCase() === manager.name?.toLowerCase()
  );

  if (!standing) {
    return null;
  }

  // 1. Gather all played matches in the current live season
  const playedMatches: Array<{
    fantaPoints: number;
    goalsFor: number;
    goalsAgainst: number;
    outcome: string;
  }> = [];

  if (liveData.rounds && liveData.rounds.length > 0) {
    for (const round of liveData.rounds) {
      if (!round.matches) continue;
      for (const match of round.matches) {
        if (!match.isPlayed && !match.played) continue;
        const isHome = match.homeManagerId === manager.id || (standing.teamName && match.homeTeam === standing.teamName);
        const isAway = match.awayManagerId === manager.id || (standing.teamName && match.awayTeam === standing.teamName);
        if (isHome && typeof match.homeFantaPoints === 'number' && match.homeFantaPoints > 0) {
          playedMatches.push({
            fantaPoints: match.homeFantaPoints,
            goalsFor: match.homeScore ?? 0,
            goalsAgainst: match.awayScore ?? 0,
            outcome: match.homeOutcome || 'D'
          });
        } else if (isAway && typeof match.awayFantaPoints === 'number' && match.awayFantaPoints > 0) {
          playedMatches.push({
            fantaPoints: match.awayFantaPoints,
            goalsFor: match.awayScore ?? 0,
            goalsAgainst: match.homeScore ?? 0,
            outcome: match.awayOutcome || 'D'
          });
        }
      }
    }
  }

  const liveSeason = liveData.season;
  const eloProfile = analyticsManagers ? analyticsManagers[manager.id] : null;
  const seasonStats = standing.elo?.seasonStats?.[liveSeason] || eloProfile?.seasonStats?.[liveSeason];

  if (playedMatches.length === 0 && (!seasonStats || seasonStats.played === 0)) {
    return null;
  }

  // 1. POT (Potenza Offensiva Live)
  let avgFP = 0;
  if (typeof standing.avgFantaPoints === 'number' && standing.avgFantaPoints > 0) {
    avgFP = standing.avgFantaPoints;
  } else if (seasonStats && typeof seasonStats.avgFP === 'number' && seasonStats.avgFP > 0) {
    avgFP = seasonStats.avgFP;
  } else if (playedMatches.length > 0) {
    avgFP = parseFloat((playedMatches.reduce((s, m) => s + m.fantaPoints, 0) / playedMatches.length).toFixed(2));
  } else {
    avgFP = 70.0;
  }

  let goalsPerMatch = 1.2;
  const totalPlayed = standing.played ?? seasonStats?.played ?? playedMatches.length;
  const totalGf = standing.goalsFor ?? seasonStats?.gf ?? playedMatches.reduce((s, m) => s + m.goalsFor, 0);
  if (totalPlayed > 0) {
    goalsPerMatch = totalGf / totalPlayed;
  }
  const rawPOT = 0.70 * avgFP + 0.30 * (goalsPerMatch * 48.0);

  // 2. CIN (Cinismo Corto Muso Live)
  let closeWinRate = 50.0;
  const wins = playedMatches.filter(m => m.outcome === 'W');
  if (wins.length > 0) {
    const closeWins = wins.filter(m => (m.goalsFor - m.goalsAgainst === 1) || (m.fantaPoints <= 68.0));
    closeWinRate = parseFloat(((closeWins.length / wins.length) * 100).toFixed(1));
  } else if (seasonStats && seasonStats.played > 0) {
    closeWinRate = 50.0;
  }
  const rawCIN = Math.min(95, Math.max(20, closeWinRate));

  // 3. LUK (Fattore Fortuna Live)
  let luckDelta = 0.0;
  if (typeof standing.deltaLuck === 'number') {
    luckDelta = standing.deltaLuck;
  } else if (seasonStats && typeof seasonStats.luckDelta === 'number') {
    luckDelta = seasonStats.luckDelta;
  } else if (typeof standing.points === 'number' && standing.scheduleLuck?.xPoints) {
    luckDelta = parseFloat((standing.points - standing.scheduleLuck.xPoints).toFixed(1));
  }
  const rawLUK = luckDelta;

  // 4. KOC (Rendimento Big Match vs Top 4 in Classifica)
  // Identifica i manager / squadre attualmente nelle prime 4 posizioni
  const top4List = (liveData.standings || [])
    .filter(s => typeof s.rank === 'number' && s.rank <= 4)
    .filter(s => s.managerId !== manager.id && s.coach?.toLowerCase() !== manager.name?.toLowerCase());

  const top4Identifiers = new Set<string>();
  for (const s of top4List) {
    if (s.managerId) top4Identifiers.add(s.managerId.toLowerCase());
    if (s.coach) top4Identifiers.add(s.coach.toLowerCase());
    if (s.teamName) top4Identifiers.add(s.teamName.toLowerCase());
  }

  let bigMatchPlayed = 0;
  let bigMatchPts = 0;

  if (liveData.rounds && liveData.rounds.length > 0) {
    for (const round of liveData.rounds) {
      if (!round.matches) continue;
      for (const match of round.matches) {
        if (!match.isPlayed && !match.played) continue;
        const isHome = match.homeManagerId === manager.id || (standing.teamName && match.homeTeam === standing.teamName);
        const isAway = match.awayManagerId === manager.id || (standing.teamName && match.awayTeam === standing.teamName);
        if (!isHome && !isAway) continue;

        const oppManagerId = isHome ? match.awayManagerId : match.homeManagerId;
        const oppTeam = isHome ? match.awayTeam : match.homeTeam;
        const isOpponentTop4 = (oppManagerId && top4Identifiers.has(oppManagerId.toLowerCase())) ||
                               (oppTeam && top4Identifiers.has(oppTeam.toLowerCase()));

        if (isOpponentTop4) {
          bigMatchPlayed++;
          const outcome = isHome ? (match.homeOutcome || 'D') : (match.awayOutcome || 'D');
          if (outcome === 'W') bigMatchPts += 3;
          else if (outcome === 'D') bigMatchPts += 1;
        }
      }
    }
  }

  // Bayesian shrinkage per il punteggio Big Match a inizio / metà stagione:
  // Prior: ~1.35 pts/match attesi contro le prime 4 (su base 1.5 partite)
  const effectivePPG = (bigMatchPts + 2.025) / (bigMatchPlayed + 1.5);
  const rawKOC = effectivePPG * 35.0;

  // 5. REG (Stabilità Rendimento Live: Anti-Varianza Fantapunti Round-by-Round)
  let stdDevFP = 0;
  if (playedMatches.length >= 2) {
    const fpList = playedMatches.map(m => m.fantaPoints);
    const meanFP = fpList.reduce((acc, v) => acc + v, 0) / fpList.length;
    const varianceFP = fpList.reduce((acc, v) => acc + Math.pow(v - meanFP, 2), 0) / (fpList.length - 1);
    stdDevFP = parseFloat(Math.sqrt(varianceFP).toFixed(2));
  } else {
    stdDevFP = 5.0;
  }

  let rawREG = Math.max(15, Math.min(95, 100 - (stdDevFP * 9.0)));
  if (playedMatches.length < 3) {
    rawREG = 0.5 * rawREG + 0.5 * 55.0;
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
    finalsPlayed: 0,
    finalsWon: 0,
    stdDevRank: stdDevFP,
    isSeasonal: true,
    bigMatchPts,
    bigMatchPlayed
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
