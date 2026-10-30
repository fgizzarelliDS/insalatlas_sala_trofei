/**
 * src/components/board/seasons/nextRoundMetrics.ts
 * Core domain calculations and matchup metrics resolution for upcoming matchday duels:
 * - Agnostic Z-score standardized predictive odds engine (Davidson extended with dynamic draw decay)
 * - Bayesian shrinkage for early-season offensive power (FantaPoints)
 * - Adaptive weighting for Elo tracks (Atlas vs Flat/Historical)
 * - Tactical match atmosphere classification (Al Vertice, Testacoda, Trappola, Sul Filo, etc.)
 * - Matchup metrics resolution (Elo ratings, H2H probabilities, rankings, team crests, odds)
 */

import type { LiveSeasonDetails, LiveTeamMetrics, MatchdayMatch } from '@/types';
import type { EloTrackMode, EloOddsConfig } from '@/types/analytics';
import { resolveTeamLogo } from '@/crests';
import {
  getEloMode,
  getManagerEloTrack
} from '@/analytics/analyticsCore';

export type RawScheduleMatch = Partial<MatchdayMatch>;

/**
 * Type-safe guard for resolving a team's current Elo rating across multi-track or legacy scalar formats.
 */
export function extractFallbackElo(
  elo: LiveTeamMetrics['elo'] | unknown,
  track?: { current?: number }
): number {
  if (typeof track?.current === 'number' && Number.isFinite(track.current)) {
    return track.current;
  }
  if (typeof elo === 'number' && Number.isFinite(elo)) {
    return elo;
  }
  if (typeof elo === 'object' && elo !== null && 'current' in elo) {
    const val = (elo as { current?: unknown }).current;
    if (typeof val === 'number' && Number.isFinite(val)) {
      return val;
    }
  }
  return 1500.0;
}

export interface MatchClima {
  label: string;
  badgeClass: string;
}

export interface MatchOdds1X2 {
  p1: number;       // e.g. 55.6 (%) 3-way probability
  pX: number;       // e.g. 25.9 (%) 3-way draw probability
  p2: number;       // e.g. 18.5 (%) 3-way probability
  q1: number;       // e.g. 1.72 (with overround)
  qX: number;       // e.g. 3.69 (with overround)
  q2: number;       // e.g. 5.17 (with overround)
  deltaZ: number;   // e.g. +1.00 (standardized match gap)
  h2hHome: number;  // e.g. 75.0 (%) Draw-No-Bet binary probability
  h2hAway: number;  // e.g. 25.0 (%) Draw-No-Bet binary probability
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

export interface LeagueDomainProfile {
  eloWeight: number;        // e.g. 0.65 for flat/historical, 0.85 for atlas
  powerWeight: number;      // e.g. 0.35 for flat/historical, 0.15 for atlas
  hfaZShift: number;        // e.g. 0.00 (neutral) or 0.20 (home field bonus)
  baseDrawNu: number;       // default 0.72 (~26.5% draws at deltaZ = 0)
  drawDecayLambda: number;  // default 0.03 (dynamic draw decay)
  sensitivityKappa: number; // default 0.55 (literature standard steepness)
  overround: number;        // default 1.045 (4.5% bookmaker overround)
  priorSigmaElo: number;    // default 60.0 (steady-state Fantacalcio Elo scale)
  minSigmaElo: number;      // default 35.0 (safety floor)
  minSigmaPower: number;    // default 1.5 (safety floor)
  kShrinkage: number;       // default 5 (games for Bayesian shrinkage)
}

export const DOMAIN_PROFILES: Record<string, LeagueDomainProfile> = {
  FANTACALCIO_NEUTRAL: {
    eloWeight: 0.65,
    powerWeight: 0.35,
    hfaZShift: 0.0,
    baseDrawNu: 0.72,
    drawDecayLambda: 0.03,
    sensitivityKappa: 0.55,
    overround: 1.045,
    priorSigmaElo: 60.0,
    minSigmaElo: 35.0,
    minSigmaPower: 1.5,
    kShrinkage: 5
  },
  SERIE_A: {
    eloWeight: 0.75,
    powerWeight: 0.25,
    hfaZShift: 0.26,
    baseDrawNu: 0.74,
    drawDecayLambda: 0.06,
    sensitivityKappa: 0.55,
    overround: 1.045,
    priorSigmaElo: 65.0,
    minSigmaElo: 35.0,
    minSigmaPower: 0.25,
    kShrinkage: 5
  },
  PREMIER_LEAGUE: {
    eloWeight: 0.70,
    powerWeight: 0.30,
    hfaZShift: 0.28,
    baseDrawNu: 0.66,
    drawDecayLambda: 0.06,
    sensitivityKappa: 0.52,
    overround: 1.045,
    priorSigmaElo: 65.0,
    minSigmaElo: 35.0,
    minSigmaPower: 0.25,
    kShrinkage: 5
  }
};

export interface LeagueDistributionContext {
  meanElo: number;
  stdElo: number;
  meanPower: number;
  stdPower: number;
  hasPowerMetric: boolean;
  profile: LeagueDomainProfile;
  managerPowers: Map<string, number>;
  managerZPowers: Map<string, number>;
}

/**
 * Creates a partial LeagueDomainProfile from the shared JSON odds configuration.
 */
export function createDomainProfileFromOddsConfig(
  oddsCfg?: EloOddsConfig,
  mode: EloTrackMode = 'atlas'
): Partial<LeagueDomainProfile> | undefined {
  if (!oddsCfg) return undefined;
  const weights = mode === 'atlas' ? oddsCfg.atlas_weights : oddsCfg.flat_weights;
  return {
    eloWeight: weights?.elo ?? (mode === 'atlas' ? 0.85 : 0.65),
    powerWeight: weights?.power ?? (mode === 'atlas' ? 0.15 : 0.35),
    baseDrawNu: oddsCfg.base_draw_nu ?? 0.72,
    drawDecayLambda: oddsCfg.draw_decay_lambda ?? 0.03,
    sensitivityKappa: oddsCfg.sensitivity_kappa ?? 0.55,
    overround: oddsCfg.overround ?? 1.045,
    priorSigmaElo: oddsCfg.prior_sigma_elo ?? 60.0,
    minSigmaElo: oddsCfg.min_sigma_elo ?? 35.0,
    minSigmaPower: oddsCfg.min_sigma_power ?? 1.5,
    kShrinkage: oddsCfg.k_shrinkage ?? 5,
    hfaZShift: oddsCfg.hfa_z_shift ?? 0.0
  };
}

/**
 * Extracts offensive power with early-season Bayesian shrinkage.
 * Kept for backward compatibility and fallback telemetry.
 */
export function extractShrunkOffensivePower(
  standing: LiveTeamMetrics,
  seasonKey: string = '2026/27',
  fallbackLeagueMean: number = 70.0,
  kShrinkage: number = 5
): number {
  const currStats = standing.elo?.seasonStats?.[seasonKey];
  const allStats = standing.elo?.seasonStats?.['all'];

  const n = typeof currStats?.played === 'number' && currStats.played > 0 ? currStats.played : 0;
  const currFP = typeof currStats?.avgFP === 'number' && currStats.avgFP > 0
    ? currStats.avgFP
    : (typeof standing.avgFantaPoints === 'number' && standing.avgFantaPoints > 0 ? standing.avgFantaPoints : null);

  if (currFP !== null) {
    const priorFP = typeof allStats?.avgFP === 'number' && allStats.avgFP > 0 && typeof allStats.played === 'number' && allStats.played > n
      ? allStats.avgFP
      : fallbackLeagueMean;

    if (n > 0 && kShrinkage > 0) {
      return (n / (n + kShrinkage)) * currFP + (kShrinkage / (n + kShrinkage)) * priorFP;
    }
    return currFP;
  }

  if (typeof allStats?.avgFP === 'number' && allStats.avgFP > 0) {
    return allStats.avgFP;
  }

  return fallbackLeagueMean;
}

/**
 * Extracts a manager's career offensive power strictly prior to the current season.
 * Avoids circular contamination from the current season and future rounds in historical replay.
 */
export function extractCareerPriorFP(standing: LiveTeamMetrics, seasonKey: string = '2026/27'): number | null {
  const all = standing.elo?.seasonStats?.['all'];
  const curr = standing.elo?.seasonStats?.[seasonKey];
  const allPlayed = all?.played ?? 0;
  const currPlayed = curr?.played ?? 0;
  const pastPlayed = allPlayed - currPlayed;

  if (pastPlayed > 0 && typeof all?.totalFP === 'number') {
    const currTotalFP = typeof curr?.totalFP === 'number'
      ? curr.totalFP
      : (typeof curr?.avgFP === 'number' ? curr.avgFP * currPlayed : 0);
    const pastTotalFP = all.totalFP - currTotalFP;
    if (pastTotalFP > 0) {
      return pastTotalFP / pastPlayed;
    }
  }

  // Fallback to previous seasons in seasonStats if totalFP is missing or unpopulated
  const statsObj = standing.elo?.seasonStats;
  if (statsObj) {
    let pastTotal = 0;
    let pastCount = 0;
    for (const [key, stats] of Object.entries(statsObj)) {
      if (key !== seasonKey && key !== 'all' && typeof stats?.played === 'number' && stats.played > 0) {
        if (typeof stats.totalFP === 'number' && stats.totalFP > 0) {
          pastTotal += stats.totalFP;
          pastCount += stats.played;
        } else if (typeof stats.avgFP === 'number' && stats.avgFP > 0) {
          pastTotal += stats.avgFP * stats.played;
          pastCount += stats.played;
        }
      }
    }
    if (pastCount > 0 && pastTotal > 0) {
      return pastTotal / pastCount;
    }
  }

  return null;
}

/**
 * Builds league-wide distribution moments for Elo and offensive power.
 * Automatically chooses adaptive weights based on Elo mode.
 * - Elo: Empirical Bayes variance blending with priorSigmaElo (60 pt) ensures S_eff stays in ~160-180 pt.
 * - Power: 5-round post-standardization Bayesian shrinkage blends current and prior unit-normal Z-scores.
 */
export function buildLeagueDistributionContext(
  standings: LiveTeamMetrics[] = [],
  mode: EloTrackMode = 'atlas',
  seasonKey: string = '2026/27',
  customProfile?: Partial<LeagueDomainProfile>
): LeagueDistributionContext {
  const baseProfile = DOMAIN_PROFILES.FANTACALCIO_NEUTRAL;
  const profile: LeagueDomainProfile = {
    ...baseProfile,
    eloWeight: mode === 'atlas' ? 0.85 : 0.65,
    powerWeight: mode === 'atlas' ? 0.15 : 0.35,
    ...customProfile
  };

  const elos = standings.map(s => {
    const track = getManagerEloTrack(s.elo, mode);
    return extractFallbackElo(s.elo, track);
  }).filter(v => Number.isFinite(v));

  const meanElo = elos.length > 0 ? elos.reduce((a, b) => a + b, 0) / elos.length : 1500.0;
  const rawStdElo = elos.length > 1
    ? Math.sqrt(elos.reduce((a, b) => a + Math.pow(b - meanElo, 2), 0) / elos.length)
    : profile.priorSigmaElo;

  // Games played in current season across teams
  const gamesPlayedCounts = standings.map(s => {
    const curr = s.elo?.seasonStats?.[seasonKey]?.played;
    if (typeof curr === 'number' && curr > 0) return curr;
    return s.recentForm?.length ?? 0;
  }).filter(n => n > 0);
  const nAvg = gamesPlayedCounts.length > 0
    ? gamesPlayedCounts.reduce((a, b) => a + b, 0) / gamesPlayedCounts.length
    : 0;

  // Empirical Bayes blended variance for Elo:
  // Anchors early-season spread to the steady-state multi-season prior (60.0 pt)
  const kShrink = profile.kShrinkage ?? 5;
  const blendedVarElo = nAvg > 0
    ? (nAvg / (nAvg + kShrink)) * Math.pow(rawStdElo, 2) + (kShrink / (nAvg + kShrink)) * Math.pow(profile.priorSigmaElo, 2)
    : Math.pow(profile.priorSigmaElo, 2);
  const stdElo = Math.max(profile.minSigmaElo, Math.sqrt(blendedVarElo));

  // 1. Current season raw FP distribution
  const teamCurrStats = standings.map(s => {
    const curr = s.elo?.seasonStats?.[seasonKey];
    const n = typeof curr?.played === 'number' && curr.played > 0
      ? curr.played
      : (s.recentForm?.length ?? 0);
    const fp = typeof curr?.avgFP === 'number' && curr.avgFP > 0
      ? curr.avgFP
      : (typeof s.avgFantaPoints === 'number' && s.avgFantaPoints > 0 ? s.avgFantaPoints : null);
    return { standing: s, n, fp };
  });

  const validCurrFPs = teamCurrStats.map(t => t.fp).filter((v): v is number => v !== null);
  const meanCurrFP = validCurrFPs.length > 0 ? validCurrFPs.reduce((a, b) => a + b, 0) / validCurrFPs.length : 70.0;
  const rawStdCurrFP = validCurrFPs.length > 1
    ? Math.sqrt(validCurrFPs.reduce((a, b) => a + Math.pow(b - meanCurrFP, 2), 0) / validCurrFPs.length)
    : profile.minSigmaPower;
  const stdCurrFP = Math.max(profile.minSigmaPower, rawStdCurrFP);

  // 2. Career prior FP distribution across returning managers (without circular leakage or hardcoded years)
  const teamPriorFPs = standings.map(s => extractCareerPriorFP(s, seasonKey)).filter((v): v is number => v !== null);

  const meanPriorFP = teamPriorFPs.length > 0 ? teamPriorFPs.reduce((a, b) => a + b, 0) / teamPriorFPs.length : meanCurrFP;
  const rawStdPriorFP = teamPriorFPs.length > 1
    ? Math.sqrt(teamPriorFPs.reduce((a, b) => a + Math.pow(b - meanPriorFP, 2), 0) / teamPriorFPs.length)
    : 1.5;
  const stdPriorFP = Math.max(1.2, rawStdPriorFP);

  // 3. Post-standardization Z-shrinkage map
  const managerZPowers = new Map<string, number>();
  const managerPowers = new Map<string, number>();

  teamCurrStats.forEach(({ standing: s, n, fp }) => {
    const zCurr = fp !== null ? (fp - meanCurrFP) / stdCurrFP : 0.0;
    const priorFP = extractCareerPriorFP(s, seasonKey);
    const zPrior = priorFP !== null ? (priorFP - meanPriorFP) / stdPriorFP : 0.0; // rookies anchor cleanly to 0.0

    // Blend unit-normal Z-scores
    const zShrunk = n > 0 || priorFP !== null
      ? (n / (n + kShrink)) * zCurr + (kShrink / (n + kShrink)) * zPrior
      : 0.0;

    // Projected shrunk offensive power for display
    const pDisplay = meanCurrFP + zShrunk * stdCurrFP;

    if (s.managerId) {
      managerZPowers.set(s.managerId, zShrunk);
      managerPowers.set(s.managerId, pDisplay);
    }
    if (s.teamName) {
      managerZPowers.set(s.teamName.toLowerCase(), zShrunk);
      managerPowers.set(s.teamName.toLowerCase(), pDisplay);
    }
  });

  const hasPowerMetric = validCurrFPs.length >= Math.ceil(standings.length * 0.5) && validCurrFPs.length > 0;

  return {
    meanElo,
    stdElo,
    meanPower: meanCurrFP,
    stdPower: stdCurrFP,
    hasPowerMetric,
    profile,
    managerPowers,
    managerZPowers
  };
}

/**
 * Reconstructs the league distribution context and team ratings prior to a historical round.
 * Used by TeamMatchesModal to show authentic pre-match odds for already-played rounds.
 */
export function buildHistoricalRoundContext(
  liveData: LiveSeasonDetails,
  targetRound: number,
  mode: EloTrackMode = 'atlas'
): LeagueDistributionContext {
  const standings = liveData.standings || [];
  const targetSeason = liveData.season || '2026/27';

  const historicalStandings: LiveTeamMetrics[] = standings.map(s => {
    const track = getManagerEloTrack(s.elo, mode);
    const allTrajectory = track?.trajectory || [];
    // Filter specifically to the relevant season and championship competition to prevent cross-season round collision
    const trajectory = allTrajectory.filter(p =>
      (p.season === targetSeason || (!p.season && targetSeason === '2026/27')) &&
      (p.competitionCategory === 'Campionato' || !p.competitionCategory)
    );
    const matchAtRound = trajectory.find(p => p.round === targetRound);

    let preRoundElo = track?.current ?? 1500.0;
    if (matchAtRound) {
      preRoundElo = matchAtRound.elo - (matchAtRound.delta ?? 0);
    } else if (trajectory.length > 0) {
      const playedAfter = trajectory.filter(p => p.round >= targetRound);
      const totalDeltaAfter = playedAfter.reduce((sum, p) => sum + (p.delta ?? 0), 0);
      preRoundElo = (track?.current ?? 1500.0) - totalDeltaAfter;
    }

    // FantaPoints strictly before targetRound within targetSeason
    const playedBefore = trajectory.filter(p => p.round < targetRound && typeof p.fpFor === 'number' && p.fpFor > 0);
    const totalFPBefore = playedBefore.reduce((sum, p) => sum + (p.fpFor || 0), 0);
    const avgFPBefore = playedBefore.length > 0
      ? totalFPBefore / playedBefore.length
      : (s.avgFantaPoints || null);

    return {
      ...s,
      elo: {
        ...s.elo,
        [mode]: {
          ...(track || {}),
          current: preRoundElo
        },
        seasonStats: {
          ...(s.elo?.seasonStats || {}),
          [targetSeason]: {
            played: playedBefore.length,
            avgFP: avgFPBefore,
            totalFP: totalFPBefore
          }
        }
      },
      avgFantaPoints: avgFPBefore ?? s.avgFantaPoints
    } as LiveTeamMetrics;
  });

  return buildLeagueDistributionContext(historicalStandings, mode, liveData.season);
}

/**
 * Computes 3-way match probabilities, fair/bookmaker decimal odds (1X2),
 * and binary H2H probability using the Agnostic Standardized Davidson model.
 */
export function computeMatchOdds1X2(
  homeElo: number,
  awayElo: number,
  ctxOrNu?: LeagueDistributionContext | number,
  powerHome?: number,
  powerAway?: number
): MatchOdds1X2 {
  let ctx: LeagueDistributionContext;

  if (typeof ctxOrNu === 'object' && ctxOrNu !== null) {
    ctx = ctxOrNu;
  } else {
    // Standalone synthetic context for direct calls with default standard deviation
    ctx = {
      meanElo: 1500.0,
      stdElo: 60.0,
      meanPower: 70.0,
      stdPower: 3.5,
      hasPowerMetric: false,
      profile: {
        ...DOMAIN_PROFILES.FANTACALCIO_NEUTRAL,
        baseDrawNu: typeof ctxOrNu === 'number' ? ctxOrNu : 0.72
      },
      managerPowers: new Map(),
      managerZPowers: new Map()
    };
  }

  const { meanElo, stdElo, meanPower, stdPower, hasPowerMetric, profile } = ctx;

  const zEloHome = Number.isFinite(homeElo) ? (homeElo - meanElo) / stdElo : 0.0;
  const zEloAway = Number.isFinite(awayElo) ? (awayElo - meanElo) / stdElo : 0.0;

  let zStarHome = zEloHome;
  let zStarAway = zEloAway;

  if (
    hasPowerMetric &&
    typeof powerHome === 'number' &&
    typeof powerAway === 'number' &&
    Number.isFinite(powerHome) &&
    Number.isFinite(powerAway)
  ) {
    const zPowHome = (powerHome - meanPower) / stdPower;
    const zPowAway = (powerAway - meanPower) / stdPower;
    zStarHome = profile.eloWeight * zEloHome + profile.powerWeight * zPowHome;
    zStarAway = profile.eloWeight * zEloAway + profile.powerWeight * zPowAway;
  }

  const deltaZ = (zStarHome - zStarAway) + profile.hfaZShift;

  // True Davidson geometric-mean derivation: exp(±(κ/2)·ΔZ)
  const halfKappa = 0.5 * profile.sensitivityKappa;
  const termA = Math.exp(halfKappa * deltaZ);
  const termB = Math.exp(-halfKappa * deltaZ);
  const dynamicNu = profile.baseDrawNu / (1.0 + profile.drawDecayLambda * Math.pow(deltaZ, 2));

  const denom = termA + termB + dynamicNu;
  const rawP1 = termA / denom;
  const rawP2 = termB / denom;
  const rawPX = dynamicNu / denom;

  const p1 = Math.round(rawP1 * 1000) / 10;
  const p2 = Math.round(rawP2 * 1000) / 10;
  const pX = Math.round((100.0 - p1 - p2) * 10) / 10;

  const margin = profile.overround;
  const q1 = Math.max(1.05, Math.round((1.0 / (rawP1 * margin)) * 100) / 100);
  const qX = Math.max(1.05, Math.round((1.0 / (rawPX * margin)) * 100) / 100);
  const q2 = Math.max(1.05, Math.round((1.0 / (rawP2 * margin)) * 100) / 100);

  const rawH2hHome = (termA / (termA + termB)) * 100.0;
  const h2hHome = Math.round(rawH2hHome * 10) / 10;
  const h2hAway = Math.round((100.0 - h2hHome) * 10) / 10;

  return {
    p1,
    pX,
    p2,
    q1,
    qX,
    q2,
    deltaZ: Math.round(deltaZ * 100) / 100,
    h2hHome,
    h2hAway
  };
}

/**
 * Computes tactical match atmosphere / context tag using hybrid Standings Rank + Z-Score criteria
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
