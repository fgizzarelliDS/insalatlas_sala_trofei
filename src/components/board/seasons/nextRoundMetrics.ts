/**
 * src/components/board/seasons/nextRoundMetrics.ts
 * Core domain calculations and matchup metrics resolution for upcoming matchday duels:
 * - Match atmosphere / tactical clima classification (Al Vertice, Testacoda, Trappola, etc.)
 * - Upcoming unplayed round discovery
 * - Matchup metrics resolution (Elo ratings, Bradley-Terry probabilities, rankings, team crests)
 */

import type { LiveSeasonDetails } from '@/types';
import type { EloTrackMode } from '@/types/analytics';
import { resolveTeamLogo } from '@/crests';
import {
  getEloMode,
  getManagerEloTrack,
  computeEloWinProbability
} from '@/analytics/analyticsCore';

export interface MatchClima {
  label: string;
  badgeClass: string;
}

export interface ResolvedMatchupMetrics {
  homeTeam: string;
  awayTeam: string;
  homeMgrId: string;
  awayMgrId: string;
  homeRank: number;
  awayRank: number;
  homeElo: number;
  awayElo: number;
  homeEloInt: number;
  awayEloInt: number;
  winProbHome: number;
  winProbAway: number;
  clima: MatchClima;
  homeLogo: string;
  awayLogo: string;
}

/**
 * Computes tactical match atmosphere / context tag based on Elo and Standings
 */
export function computeMatchClima(
  homeRank: number,
  awayRank: number,
  homeElo: number,
  awayElo: number,
  winProbHome: number,
  totalTeams: number = 14
): MatchClima {
  const eloDiff = Math.abs(homeElo - awayElo);

  // 1. Testacoda: Top 3 vs Bottom 3 (using ↕️ double arrow emoji)
  if ((homeRank <= 3 && awayRank >= totalTeams - 2) || (awayRank <= 3 && homeRank >= totalTeams - 2)) {
    return {
      label: '↕️ TESTACODA',
      badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
    };
  }

  // 2. Al Vertice: both top 3 or both high elo (>= 1525)
  if ((homeRank <= 3 && awayRank <= 3) || (homeElo >= 1525.0 && awayElo >= 1525.0)) {
    return {
      label: '🔥 AL VERTICE',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    };
  }

  // 3. Salvezza: both bottom 4
  if (homeRank >= totalTeams - 3 && awayRank >= totalTeams - 3) {
    return {
      label: '🪓 SALVEZZA',
      badgeClass: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30'
    };
  }

  // 4. Trappola / Upset Alert: Elo gap >= 50 pt or extreme win prob (>= 65% or <= 35%)
  if (eloDiff >= 50.0 || winProbHome >= 65.0 || winProbHome <= 35.0) {
    return {
      label: '⚠️ TRAPPOLA',
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
    };
  }

  // 5. Sul Filo: win prob between 48.5% and 51.5% or Elo gap <= 12 pt
  if ((winProbHome >= 48.5 && winProbHome <= 51.5) || eloDiff <= 12.0) {
    return {
      label: '⚖️ SUL FILO',
      badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-cyan-300 border-teal-500/30'
    };
  }

  // 6. Corsa Playoff: mid-table clash (both in positions 4-9)
  if (homeRank >= 4 && homeRank <= 9 && awayRank >= 4 && awayRank <= 9) {
    return {
      label: '🎯 CORSA PLAYOFF',
      badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
    };
  }

  // Default: Duello
  return {
    label: '🥊 DUELLO',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
  };
}

/**
 * Finds the upcoming unplayed round in the live season
 */
export function findUpcomingRound(liveData: LiveSeasonDetails) {
  if (!liveData.rounds || liveData.rounds.length === 0) {
    return null;
  }
  // Find the first round that contains at least one unplayed match
  const upcoming = liveData.rounds.find(r => (r.matches || []).some(m => !m.isPlayed));
  return upcoming || null;
}

/**
 * Resolves all metrics (Elo, win probability, ranks, crests, clima) for a single matchup
 */
export function resolveMatchupMetrics(
  m: any,
  idx: number,
  liveData: LiveSeasonDetails,
  mode: EloTrackMode = getEloMode(),
  totalTeams: number = 14
): ResolvedMatchupMetrics {
  const homeTeam = m.homeTeam || 'Squadra 1';
  const awayTeam = m.awayTeam || 'Squadra 2';
  const homeMgrId = m.homeManagerId || '';
  const awayMgrId = m.awayManagerId || '';

  const homeStanding = liveData.standings?.find(s =>
    (homeMgrId && s.managerId === homeMgrId) ||
    Boolean(s.teamName && homeTeam && s.teamName.toLowerCase() === homeTeam.toLowerCase())
  );
  const awayStanding = liveData.standings?.find(s =>
    (awayMgrId && s.managerId === awayMgrId) ||
    Boolean(s.teamName && awayTeam && s.teamName.toLowerCase() === awayTeam.toLowerCase())
  );

  const homeRank = homeStanding?.rank ?? (idx * 2 + 1);
  const awayRank = awayStanding?.rank ?? (idx * 2 + 2);

  const homeEloTrack = getManagerEloTrack(homeStanding?.elo, mode);
  const awayEloTrack = getManagerEloTrack(awayStanding?.elo, mode);

  const homeElo = homeEloTrack?.current ??
    (typeof (homeStanding?.elo as any)?.current === 'number'
      ? (homeStanding!.elo as any).current
      : (typeof homeStanding?.elo === 'number'
        ? homeStanding.elo
        : 1500.0));
  const awayElo = awayEloTrack?.current ??
    (typeof (awayStanding?.elo as any)?.current === 'number'
      ? (awayStanding!.elo as any).current
      : (typeof awayStanding?.elo === 'number'
        ? awayStanding.elo
        : 1500.0));

  const homeEloInt = Math.round(homeElo);
  const awayEloInt = Math.round(awayElo);

  let winProbHome: number;
  if (mode === 'historical' && m.winProbHomeHistorical !== undefined && m.winProbHomeHistorical !== null) {
    winProbHome = m.winProbHomeHistorical;
  } else if (mode === 'atlas' && m.winProbHomeAtlas !== undefined && m.winProbHomeAtlas !== null) {
    winProbHome = m.winProbHomeAtlas;
  } else if (m.winProbHomeFlat !== undefined && m.winProbHomeFlat !== null) {
    winProbHome = m.winProbHomeFlat;
  } else {
    winProbHome = computeEloWinProbability(homeElo, awayElo);
  }

  const winProbAway = Math.round((100.0 - winProbHome) * 10) / 10;
  const clima = computeMatchClima(homeRank, awayRank, homeElo, awayElo, winProbHome, totalTeams);

  const homeLogo = resolveTeamLogo(homeTeam, m.homeLogo || (homeStanding as any)?.logo);
  const awayLogo = resolveTeamLogo(awayTeam, m.awayLogo || (awayStanding as any)?.logo);

  return {
    homeTeam,
    awayTeam,
    homeMgrId,
    awayMgrId,
    homeRank,
    awayRank,
    homeElo,
    awayElo,
    homeEloInt,
    awayEloInt,
    winProbHome,
    winProbAway,
    clima,
    homeLogo,
    awayLogo
  };
}
