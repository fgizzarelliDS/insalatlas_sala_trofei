/**
 * src/types/analytics.ts
 * Type definitions for the League-Agnostic Dynamic Elo Rating Engine
 */

export type EloTrackMode = 'flat' | 'historical';

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
}

export interface EloTrackData {
  current: number;
  peak: { value: number; season: string; round: number };
  floor: { value: number; season: string; round: number };
  lastDelta: number;
  trajectory: EloTrajectoryPoint[];
  seasons?: Record<string, EloTrajectoryPoint[]>;
}

export interface ManagerEloProfile {
  managerId: string;
  teamName: string;
  coach?: string;
  flat: EloTrackData;
  historical: EloTrackData;
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
