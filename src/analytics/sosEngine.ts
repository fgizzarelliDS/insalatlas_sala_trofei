/**
 * src/analytics/sosEngine.ts
 * Strength of Schedule (SoS) Engine:
 * - Computes forward-looking schedule difficulty across unplayed rounds
 * - Hybrid formulation: 50% Opponent Elo + 50% Opponent Standings Points
 * - Match difficulty categorization for upcoming duels (Favorevole, Equilibrato, Match Duro)
 * - Helper formatting functions for UI pills and badges (Elo-focused without misleading 0 pt)
 */

import type { LiveTeamMetrics, MatchdayRound, TeamSoSMetrics } from '@/types';
import type { EloTrackMode } from '@/types/analytics';
import { getManagerEloTrack } from '@/analytics/analyticsCore';
import { extractFallbackElo } from './oddsEngine';

export type MatchDifficulty = 'favorable' | 'balanced' | 'hard';

export interface OpponentDifficultyResult {
  difficulty: MatchDifficulty;
  label: string;
  badgeClass: string;
  dotColor: string;
}

/**
 * Resolves a team's active season standings points with fallback to elo.seasonStats[latest].actualPts
 * or scheduleLuck.xPoints when top-level `points` has not been populated by a client-side HTML upload.
 */
function resolveStandingPoints(s: LiveTeamMetrics): number {
  if (typeof s.points === 'number' && !Number.isNaN(s.points)) {
    return s.points;
  }
  const seasonStats = s.elo?.seasonStats;
  if (seasonStats && typeof seasonStats === 'object') {
    const seasonKeys = Object.keys(seasonStats)
      .filter(k => k !== 'all')
      .sort((a, b) => b.localeCompare(a));
    for (const key of seasonKeys) {
      const actualPts = seasonStats[key]?.actualPts;
      if (typeof actualPts === 'number' && !Number.isNaN(actualPts)) {
        return actualPts;
      }
    }
  }
  if (typeof s.scheduleLuck?.xPoints === 'number' && !Number.isNaN(s.scheduleLuck.xPoints)) {
    return s.scheduleLuck.xPoints;
  }
  return 0;
}

/**
 * Computes Strength of Schedule (SoS) across all teams based on remaining unplayed calendar fixtures:
 * 50% Opponent Elo + 50% Opponent Standings Points (neutral ground, HFA = 0.0).
 */
export function computeLeagueSoS(
  standings: LiveTeamMetrics[],
  rounds: MatchdayRound[],
  lastCompletedRound: number,
  mode: EloTrackMode
): Map<string, TeamSoSMetrics> {
  const result = new Map<string, TeamSoSMetrics>();
  if (!standings || standings.length === 0) return result;

  // Build team lookup map for fast query
  const teamMap = new Map<string, { elo: number; points: number }>();
  for (const s of standings) {
    const tr = getManagerEloTrack(s.elo, mode);
    const elo = extractFallbackElo(s.elo, tr);
    const points = resolveStandingPoints(s);
    teamMap.set(s.teamName.trim().toLowerCase(), { elo, points });
    if (s.managerId) {
      teamMap.set(s.managerId.trim().toLowerCase(), { elo, points });
    }
  }

  // Collect opponent stats per team
  interface RawTeamData {
    teamName: string;
    oppElos: number[];
    oppPts: number[];
  }
  const rawData: RawTeamData[] = [];

  for (const team of standings) {
    const tName = team.teamName;
    const tMgrId = team.managerId;
    const oppElos: number[] = [];
    const oppPts: number[] = [];

    for (const r of rounds || []) {
      if (r.roundNumber <= lastCompletedRound) continue;
      for (const m of r.matches || []) {
        const isHome = m.homeTeam === tName || (tMgrId && m.homeManagerId === tMgrId);
        const isAway = m.awayTeam === tName || (tMgrId && m.awayManagerId === tMgrId);
        if (!isHome && !isAway) continue;
        if (m.isPlayed || m.played) continue;

        const oppName = isHome ? m.awayTeam : m.homeTeam;
        const oppMgr = isHome ? m.awayManagerId : m.homeManagerId;

        const oppData = (oppMgr ? teamMap.get(oppMgr.trim().toLowerCase()) : undefined)
          ?? (oppName ? teamMap.get(oppName.trim().toLowerCase()) : undefined);

        if (oppData) {
          oppElos.push(oppData.elo);
          oppPts.push(oppData.points);
        }
      }
    }

    rawData.push({ teamName: tName, oppElos, oppPts });
  }

  // Calculate means for each team
  interface TeamAverages {
    teamName: string;
    count: number;
    avgElo: number;
    avgPts: number;
  }
  const averages: TeamAverages[] = rawData.map(d => {
    const count = d.oppElos.length;
    const avgElo = count > 0 ? d.oppElos.reduce((a, b) => a + b, 0) / count : 1500;
    const avgPts = count > 0 ? d.oppPts.reduce((a, b) => a + b, 0) / count : 0;
    return { teamName: d.teamName, count, avgElo, avgPts };
  });

  // Calculate league-wide mean and stddev for average opponent Elo and Points
  const avgElos = averages.map(a => a.avgElo);
  const avgPts = averages.map(a => a.avgPts);

  const meanElo = avgElos.reduce((a, b) => a + b, 0) / (averages.length || 1);
  const meanPts = avgPts.reduce((a, b) => a + b, 0) / (averages.length || 1);

  const stdElo = averages.length > 1
    ? Math.sqrt(avgElos.map(x => Math.pow(x - meanElo, 2)).reduce((a, b) => a + b, 0) / (averages.length - 1))
    : 1.0;
  const stdPts = averages.length > 1
    ? Math.sqrt(avgPts.map(x => Math.pow(x - meanPts, 2)).reduce((a, b) => a + b, 0) / (averages.length - 1))
    : 1.0;

  const safeStdElo = stdElo > 1e-6 ? stdElo : 1.0;
  const safeStdPts = stdPts > 1e-6 ? stdPts : 1.0;

  // Compute combined Z-score: 50% Elo + 50% Points
  const scored = averages.map(a => {
    const zElo = (a.avgElo - meanElo) / safeStdElo;
    const zPts = (a.avgPts - meanPts) / safeStdPts;
    const combinedZ = 0.5 * zElo + 0.5 * zPts;
    return { ...a, combinedZ };
  });

  // Rank descending: rank 1 = hardest schedule (highest combined Z)
  scored.sort((a, b) => b.combinedZ - a.combinedZ);

  scored.forEach((s, idx) => {
    const sosMetric: TeamSoSMetrics = {
      teamName: s.teamName,
      remainingOpponentsCount: s.count,
      avgOpponentElo: Math.round(s.avgElo),
      avgOpponentPoints: Math.round(s.avgPts * 10) / 10,
      combinedZScore: Math.round(s.combinedZ * 100) / 100,
      sosRank: idx + 1,
      totalTeams: scored.length
    };
    result.set(s.teamName, sosMetric);
    result.set(s.teamName.trim().toLowerCase(), sosMetric);
  });

  return result;
}

export interface OpponentDistributionContext {
  meanElo: number;
  meanPts: number;
  stdElo: number;
  stdPts: number;
}

/**
 * Computes and caches distribution moments across current standings once.
 * Avoids redundant O(R·N) recalculation across match loops.
 */
export function computeOpponentDistributionContext(
  standings: LiveTeamMetrics[],
  mode: EloTrackMode
): OpponentDistributionContext {
  if (!standings || standings.length === 0) {
    return { meanElo: 1500, meanPts: 0, stdElo: 1.0, stdPts: 1.0 };
  }

  const elos = standings.map(s => {
    const tr = getManagerEloTrack(s.elo, mode);
    return extractFallbackElo(s.elo, tr);
  });
  const points = standings.map(s => resolveStandingPoints(s));

  const meanElo = elos.reduce((a, b) => a + b, 0) / standings.length;
  const meanPts = points.reduce((a, b) => a + b, 0) / standings.length;

  const stdElo = standings.length > 1
    ? Math.sqrt(elos.map(x => Math.pow(x - meanElo, 2)).reduce((a, b) => a + b, 0) / (standings.length - 1))
    : 1.0;
  const stdPts = standings.length > 1
    ? Math.sqrt(points.map(x => Math.pow(x - meanPts, 2)).reduce((a, b) => a + b, 0) / (standings.length - 1))
    : 1.0;

  return { meanElo, meanPts, stdElo, stdPts };
}

/**
 * Classifies an individual upcoming match opponent based on hybrid 50% Elo + 50% Standings Points.
 */
export function getOpponentDifficulty(
  oppStanding: LiveTeamMetrics | undefined,
  standingsOrCtx: LiveTeamMetrics[] | OpponentDistributionContext,
  mode: EloTrackMode = 'flat'
): OpponentDifficultyResult {
  if (!oppStanding) {
    return {
      difficulty: 'balanced',
      label: 'Equilibrato',
      badgeClass: 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30',
      dotColor: 'text-amber-500'
    };
  }

  const ctx: OpponentDistributionContext = Array.isArray(standingsOrCtx)
    ? computeOpponentDistributionContext(standingsOrCtx, mode)
    : standingsOrCtx;

  const { meanElo, meanPts, stdElo, stdPts } = ctx;
  const oppTr = getManagerEloTrack(oppStanding.elo, mode);
  const oppElo = extractFallbackElo(oppStanding.elo, oppTr);
  const oppPts = resolveStandingPoints(oppStanding);

  const zElo = (oppElo - meanElo) / (stdElo > 1e-6 ? stdElo : 1.0);
  const zPts = (oppPts - meanPts) / (stdPts > 1e-6 ? stdPts : 1.0);
  const combinedZ = 0.5 * zElo + 0.5 * zPts;

  if (combinedZ > 0.30) {
    return {
      difficulty: 'hard',
      label: 'Match Duro',
      badgeClass: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30',
      dotColor: 'text-rose-500'
    };
  }
  if (combinedZ < -0.30) {
    return {
      difficulty: 'favorable',
      label: 'Favorevole',
      badgeClass: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30',
      dotColor: 'text-emerald-500'
    };
  }
  return {
    difficulty: 'balanced',
    label: 'Equilibrato',
    badgeClass: 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30',
    dotColor: 'text-amber-500'
  };
}

/**
 * Returns formatted SoS difficulty tier badge styling and label.
 * Specifically removes standings points from pill to prevent misleading '0 pt' displays early in the season.
 */
export function getSoSBadgeInfo(teamSoS: TeamSoSMetrics) {
  const tailSize = Math.max(1, Math.min(3, Math.floor(teamSoS.totalTeams * 0.25)));
  const isHard = teamSoS.sosRank <= tailSize;
  const isSoft = teamSoS.sosRank > teamSoS.totalTeams - tailSize;

  const icon = isHard ? '🔴' : isSoft ? '🟢' : '🟡';
  const label = isHard ? 'Più Duro' : isSoft ? 'Più Morbido' : 'Difficoltà';
  const badgeClass = isHard
    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
    : isSoft
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';

  return {
    icon,
    label,
    badgeClass,
    text: `SoS: #${teamSoS.sosRank} ${label}`,
    eloSubtext: `(${teamSoS.avgOpponentElo} Elo)`
  };
}
