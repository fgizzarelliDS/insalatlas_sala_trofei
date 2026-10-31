/**
 * src/components/board/seasons/nextRoundMetrics.ts
 * Matchday board matchup metrics resolution and match atmosphere classification.
 * Re-exports predictive odds and Strength of Schedule (SoS) engines for full backward compatibility.
 */

import type { LiveSeasonDetails } from '@/types';
import type { EloTrackMode, EloOddsConfig } from '@/types/analytics';
import { resolveTeamLogo } from '@/crests';
import { getEloMode, getManagerEloTrack } from '@/analytics/analyticsCore';
import {
  extractFallbackElo,
  createDomainProfileFromOddsConfig,
  buildLeagueDistributionContext,
  computeMatchOdds1X2,
  type MatchOdds1X2,
  type LeagueDomainProfile,
  type LeagueDistributionContext,
  type RawScheduleMatch
} from '@/analytics/oddsEngine';

// Re-export all predictive odds engine types & functions
export * from '@/analytics/oddsEngine';

// Re-export all Strength of Schedule (SoS) types & functions
export * from '@/analytics/sosEngine';

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
  odds: MatchOdds1X2;
  clima: MatchClima;
  homeLogo: string;
  awayLogo: string;
}

/**
 * Classifies tactical match atmosphere based on standings, Elo ratings, and standardized match gap.
 */
export function computeMatchClima(
  homeRank: number,
  awayRank: number,
  homeElo: number,
  awayElo: number,
  winProbHome: number,
  totalTeams: number = 14,
  deltaZ: number = 0.0
): MatchClima {
  const eloDiff = Math.abs(homeElo - awayElo);
  const absDeltaZ = deltaZ !== undefined && deltaZ !== null && deltaZ !== 0.0 ? Math.abs(deltaZ) : null;

  // 1. Testacoda: Top 3 vs Bottom 3 or extreme disparity
  if (
    (homeRank <= 3 && awayRank >= totalTeams - 2) ||
    (awayRank <= 3 && homeRank >= totalTeams - 2) ||
    (absDeltaZ !== null && absDeltaZ >= 1.65)
  ) {
    return {
      label: '↕️ TESTACODA',
      badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
    };
  }

  // 2. Al Vertice: both top 3 or both high elo
  if (
    (homeRank <= 3 && awayRank <= 3) ||
    (homeRank <= 4 && awayRank <= 4 && homeElo >= 1520.0 && awayElo >= 1520.0)
  ) {
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

  // 4. Trappola / Upset Alert: significant gap or standings underdog favored by stats
  const isStandingsInverted = (homeRank > awayRank + 3 && deltaZ >= 0.35) || (awayRank > homeRank + 3 && deltaZ <= -0.35);
  if (
    (absDeltaZ !== null && absDeltaZ >= 0.90) ||
    eloDiff >= 50.0 ||
    winProbHome >= 65.0 ||
    winProbHome <= 35.0 ||
    isStandingsInverted
  ) {
    return {
      label: '⚠️ TRAPPOLA',
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
    };
  }

  // 5. Sul Filo: close match
  const isCloseElo = eloDiff <= 12.0;
  const isCloseZ = absDeltaZ !== null && absDeltaZ <= 0.22;
  const isCloseProb = winProbHome >= 48.5 && winProbHome <= 51.5;
  if (isCloseProb || isCloseElo || isCloseZ) {
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
  const upcoming = liveData.rounds.find(r => (r.matches || []).some(m => !m.isPlayed));
  return upcoming || null;
}

/**
 * Resolves all metrics (Elo, H2H win probability, ranks, crests, clima, 1X2 odds) for a single matchup
 */
export function resolveMatchupMetrics(
  m: RawScheduleMatch,
  idx: number,
  liveData: LiveSeasonDetails,
  mode: EloTrackMode = getEloMode(),
  totalTeams: number = 14,
  cachedContext?: LeagueDistributionContext,
  options?: {
    customProfile?: Partial<LeagueDomainProfile>;
    oddsConfig?: EloOddsConfig;
  }
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

  const homeElo = extractFallbackElo(homeStanding?.elo, homeEloTrack);
  const awayElo = extractFallbackElo(awayStanding?.elo, awayEloTrack);

  const homeEloInt = Math.round(homeElo);
  const awayEloInt = Math.round(awayElo);

  // Build or use cached league distribution context
  const customProfile = options?.customProfile || createDomainProfileFromOddsConfig(options?.oddsConfig, mode);
  const ctx = cachedContext || buildLeagueDistributionContext(liveData.standings || [], mode, liveData.season, customProfile);

  const powerHome = homeStanding
    ? (homeMgrId ? ctx.managerPowers.get(homeMgrId) : undefined) ?? ctx.managerPowers.get(homeTeam.toLowerCase())
    : undefined;
  const powerAway = awayStanding
    ? (awayMgrId ? ctx.managerPowers.get(awayMgrId) : undefined) ?? ctx.managerPowers.get(awayTeam.toLowerCase())
    : undefined;

  const odds = computeMatchOdds1X2(homeElo, awayElo, ctx, powerHome, powerAway);

  // Coherent binary H2H probability directly from the standardized model
  const winProbHome = odds.h2hHome;
  const winProbAway = odds.h2hAway;

  const clima = computeMatchClima(homeRank, awayRank, homeElo, awayElo, winProbHome, totalTeams, odds.deltaZ);

  const homeLogo = resolveTeamLogo(homeTeam, m.homeLogo || homeStanding?.logo);
  const awayLogo = resolveTeamLogo(awayTeam, m.awayLogo || awayStanding?.logo);

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
    odds,
    clima,
    homeLogo,
    awayLogo
  };
}
