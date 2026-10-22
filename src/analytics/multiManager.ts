import type { Manager } from '@/types';
import { calculateManagerScore } from '@/score';
import { computeManagerClutchMetrics } from './econometrics';
import { computeTailRiskProfile } from './tailRisk';
import { computeStabilityProfile } from './badges';
import { getManagerArchetype } from './archetypes';
import {
  MULTI_MANAGER_PALETTE,
  computeSingleManagerRadarAxes,
  type SingleRadarAxisValue
} from './radarAxes';

export { MULTI_MANAGER_PALETTE };
export type MultiManagerAxisValue = SingleRadarAxisValue;

export interface MultiManagerProfileData {
  manager: Manager;
  color: string;
  axes: MultiManagerAxisValue[];
  metrics: {
    score: number;
    gci: number;
    clutchLabel: string;
    clutchIcon: string;
    clutchColor: string;
    kiPct: number;
    crPct: number;
    nti: number;
    polarityLabel: string;
    polarityIcon: string;
    polarityColor: string;
    stabilityCategory: string;
    stabilityIcon: string;
    stdDevRank: number;
    archetypeTag: string;
    archetypeIcon: string;
    archetypeColor: string;
    completedYears: number;
    podiums: number;
    bestRank: number | null;
  };
}

export type MiniTournamentMode = 'ppg' | 'simultaneous';

export interface MiniTournamentEntry {
  managerId: string;
  managerName: string;
  color: string;
  matches: number;
  wins: number;
  ties: number;
  losses: number;
  points: number;
  pointsDiff: number;
  winRate: number;
  ppg: number;
}

export interface MultiManagerAnalysis {
  managers: MultiManagerProfileData[];
  miniTournament: MiniTournamentEntry[];
  sharedSeasonsAcrossAll: string[];
  totalPairwiseSeasonsCount: number;
  tournamentMode: MiniTournamentMode;
}

/**
 * Computes individual 6-axis metric profile for a single manager
 */
export function computeManagerAxes(
  manager: Manager,
  benchmarkScore: number,
  color: string
): MultiManagerProfileData {
  const clutchMetrics = computeManagerClutchMetrics(manager);
  const score = calculateManagerScore(manager);
  const risk = computeTailRiskProfile(manager);
  const stability = computeStabilityProfile(manager);

  const totalTitles =
    (manager.gold || 0) +
    (manager.cup_gold || 0) +
    (manager.supercup || 0) +
    (manager.mundialito || 0);
  const efficiency = manager.years > 0 ? parseFloat((totalTitles / manager.years).toFixed(2)) : 0;
  const arch = getManagerArchetype(manager, totalTitles, efficiency);

  // Best historical rank in completed seasons
  const completedRanks = (manager.history || [])
    .filter(h => !h.in_progress && typeof h.rank === 'number' && h.rank > 0)
    .map(h => h.rank as number);
  const bestRank = completedRanks.length > 0 ? Math.min(...completedRanks) : null;

  // Normalized 6-Axis Values (0..100) via unified radarAxes engine
  const axes = computeSingleManagerRadarAxes(manager, benchmarkScore);

  return {
    manager,
    color,
    axes,
    metrics: {
      score,
      gci: clutchMetrics.gci,
      clutchLabel: clutchMetrics.clutch.label,
      clutchIcon: clutchMetrics.clutch.icon,
      clutchColor: clutchMetrics.clutch.color,
      kiPct: clutchMetrics.kiPct,
      crPct: clutchMetrics.crPct,
      nti: risk.nti,
      polarityLabel: risk.label,
      polarityIcon: risk.icon,
      polarityColor: risk.color,
      stabilityCategory: stability.category,
      stabilityIcon: stability.icon,
      stdDevRank: stability.stdDevRank,
      archetypeTag: arch.tag,
      archetypeIcon: arch.icon,
      archetypeColor: arch.color,
      completedYears: clutchMetrics.completedYears,
      podiums: clutchMetrics.podiums,
      bestRank
    }
  };
}

/**
 * Computes the complete multi-manager comparison analysis for 3 or more managers:
 * 1. Normalized 6-axis radar profiles with designated palette colors
 * 2. Cross-table mini-tournament with dual modes ('ppg' normalized across all seasons, or 'simultaneous' across shared seasons)
 * 3. Shared seasons set across all selected contenders
 */
export function computeMultiManagerAnalysis(
  selectedManagers: Manager[],
  allManagersOrMode: Manager[] | MiniTournamentMode = [],
  tournamentMode: MiniTournamentMode = 'simultaneous'
): MultiManagerAnalysis {
  let allManagers: Manager[] = [];
  let effectiveMode: MiniTournamentMode = 'simultaneous';

  if (typeof allManagersOrMode === 'string') {
    effectiveMode = allManagersOrMode;
    allManagers = [];
  } else if (Array.isArray(allManagersOrMode)) {
    allManagers = allManagersOrMode;
    effectiveMode = tournamentMode;
  }

  if (!selectedManagers || selectedManagers.length === 0) {
    return {
      managers: [],
      miniTournament: [],
      sharedSeasonsAcrossAll: [],
      totalPairwiseSeasonsCount: 0,
      tournamentMode: effectiveMode
    };
  }

  // 1. Calculate benchmark score across selected and league managers
  const allScores = [...selectedManagers, ...allManagers].map(m => calculateManagerScore(m));
  const maxScore = Math.max(...allScores, 10);

  // 2. Compute profiles for each selected manager
  const profiles: MultiManagerProfileData[] = selectedManagers.map((m, idx) => {
    const color = MULTI_MANAGER_PALETTE[idx % MULTI_MANAGER_PALETTE.length];
    return computeManagerAxes(m, maxScore, color);
  });

  // 3. Find all completed seasons shared by ALL selected managers simultaneously
  let sharedSeasonsAcrossAll: string[] = [];
  if (selectedManagers.length > 0) {
    const firstSeasons = new Set(
      (selectedManagers[0].history || [])
        .filter(h => !h.in_progress && h.status !== 'in_progress' && typeof h.rank === 'number' && h.rank > 0)
        .map(h => h.season)
    );

    for (let i = 1; i < selectedManagers.length; i++) {
      const otherSeasons = new Set(
        (selectedManagers[i].history || [])
          .filter(h => !h.in_progress && h.status !== 'in_progress' && typeof h.rank === 'number' && h.rank > 0)
          .map(h => h.season)
      );
      for (const s of Array.from(firstSeasons)) {
        if (!otherSeasons.has(s)) {
          firstSeasons.delete(s);
        }
      }
    }
    sharedSeasonsAcrossAll = Array.from(firstSeasons).sort((a, b) => b.localeCompare(a));
  }

  // 4. Compute Mini-Tournament
  const miniTournamentMap = new Map<string, MiniTournamentEntry>();

  selectedManagers.forEach((m, idx) => {
    const color = MULTI_MANAGER_PALETTE[idx % MULTI_MANAGER_PALETTE.length];
    miniTournamentMap.set(m.id, {
      managerId: m.id,
      managerName: m.name,
      color,
      matches: 0,
      wins: 0,
      ties: 0,
      losses: 0,
      points: 0,
      pointsDiff: 0,
      winRate: 0,
      ppg: 0
    });
  });

  const totalPairwiseSeasonsSet = new Set<string>();
  const simultaneousSeasonsSet = new Set(sharedSeasonsAcrossAll);

  // Iterate over all unique manager pairs
  for (let i = 0; i < selectedManagers.length; i++) {
    for (let j = i + 1; j < selectedManagers.length; j++) {
      const mA = selectedManagers[i];
      const mB = selectedManagers[j];

      const seasonsA = new Map(
        (mA.history || [])
          .filter(h => !h.in_progress && h.status !== 'in_progress' && typeof h.rank === 'number' && h.rank > 0)
          .map(h => [h.season, h])
      );
      const seasonsB = new Map(
        (mB.history || [])
          .filter(h => !h.in_progress && h.status !== 'in_progress' && typeof h.rank === 'number' && h.rank > 0)
          .map(h => [h.season, h])
      );

      for (const [season, recA] of seasonsA.entries()) {
        const recB = seasonsB.get(season);
        if (recB && typeof recA.rank === 'number' && typeof recB.rank === 'number') {
          totalPairwiseSeasonsSet.add(season);

          // In 'simultaneous' mode, only process seasons shared by ALL managers
          if (effectiveMode === 'simultaneous' && !simultaneousSeasonsSet.has(season)) {
            continue;
          }

          const entryA = miniTournamentMap.get(mA.id);
          const entryB = miniTournamentMap.get(mB.id);

          if (entryA && entryB) {
            entryA.matches += 1;
            entryB.matches += 1;

            if (recA.rank < recB.rank) {
              entryA.wins += 1;
              entryA.points += 3;
              entryB.losses += 1;
            } else if (recB.rank < recA.rank) {
              entryB.wins += 1;
              entryB.points += 3;
              entryA.losses += 1;
            } else {
              entryA.ties += 1;
              entryA.points += 1;
              entryB.ties += 1;
              entryB.points += 1;
            }

            if (typeof recA.points === 'number' && typeof recB.points === 'number') {
              const diff = recA.points - recB.points;
              entryA.pointsDiff += diff;
              entryB.pointsDiff -= diff;
            }
          }
        }
      }
    }
  }

  const miniTournament: MiniTournamentEntry[] = Array.from(miniTournamentMap.values()).map(entry => {
    const winRate = entry.matches > 0 ? parseFloat(((entry.wins / entry.matches) * 100).toFixed(1)) : 0;
    const ppg = entry.matches > 0 ? parseFloat((entry.points / entry.matches).toFixed(2)) : 0;
    return {
      ...entry,
      pointsDiff: Math.round(entry.pointsDiff * 10) / 10,
      winRate,
      ppg
    };
  });

  // Sort mini-tournament based on mode
  miniTournament.sort((a, b) => {
    if (effectiveMode === 'ppg') {
      if (b.ppg !== a.ppg) return b.ppg - a.ppg;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.points !== a.points) return b.points - a.points;
      if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
      return a.managerName.localeCompare(b.managerName);
    } else {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
      return a.managerName.localeCompare(b.managerName);
    }
  });

  return {
    managers: profiles,
    miniTournament,
    sharedSeasonsAcrossAll,
    totalPairwiseSeasonsCount: totalPairwiseSeasonsSet.size,
    tournamentMode: effectiveMode
  };
}
