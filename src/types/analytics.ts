/**
 * src/types/analytics.ts
 * Type definitions for the League-Agnostic Dynamic Elo Rating Engine
 */

export type EloTrackMode = 'flat' | 'historical' | 'atlas';
export type EloModalTab = 'trajectories' | 'golo' | 'fp' | 'luck';

export interface EloTrajectoryPoint {
  round: number;
  season: string;
  elo: number;
  matchId?: string;
  opponentId: string;
  opponentTeamName: string;
  result: 'W' | 'D' | 'L';
  delta: number;
  winProbPreMatch: number;
  isHome: boolean;
  gf?: number;
  ga?: number;
  fpFor?: number;
  fpAgainst?: number;
  roundLabel?: string;
  matchIndex?: number;
  championshipMatchDay?: number;
  competitionCategory?: string;
  competition?: string;
}

export interface EloTrackData {
  current: number;
  peak: { value: number; season: string; round: number };
  floor: { value: number; season: string; round: number };
  lastDelta: number;
  trajectory: EloTrajectoryPoint[];
  seasons?: Record<string, EloTrajectoryPoint[]>;
}

export interface EloSeasonDiagnosticStats {
  played: number;
  gf: number;
  ga: number;
  gd: number;
  avgFP: number;
  totalFP: number;
  golo: number;
  actualPts: number;
  xPts: number;
  luckDelta: number;
}

export interface ManagerEloProfile {
  managerId: string;
  teamName: string;
  coach?: string;
  flat: EloTrackData;
  historical: EloTrackData;
  atlas?: EloTrackData;
  seasonStats?: Record<string, EloSeasonDiagnosticStats>;
}

export interface EloConfig {
  baseRating: number;
  scaleFactor: number;
  carryoverAlpha: number;
  historicalSeeding: {
    scale: number;
    minRating: number;
    maxRating: number;
  };
  kFactors: Record<string, number>;
}

export interface LeagueEloDatabase {
  lastUpdatedSeason: string;
  lastUpdatedRound: number;
  eloModeDefault: EloTrackMode;
  config?: EloConfig;
  managers: Record<string, ManagerEloProfile>;
}
