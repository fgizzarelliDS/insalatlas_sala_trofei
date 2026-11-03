/**
 * src/components/board/seasons/teamMatchesModal/types.ts
 * Type definitions and data interfaces for TeamMatchesModal and its sub-components.
 */

import type { LiveTeamMetrics, TeamSoSMetrics, LuckBadge } from '@/types';
import type { MatchOdds1X2 } from '@/analytics/oddsEngine';

export type TeamMatchesTab = 'calendar' | 'montecarlo';

export interface TeamMatchesHistoryEntry {
  managerId?: string;
  teamName: string;
}

export interface TeamMatchesReturnContext {
  managerId?: string;
  teamName?: string;
}

export interface TeamMatchEntry {
  roundNumber: number;
  isHome: boolean;
  oppTeamName: string;
  oppManagerId?: string;
  oppCoach?: string;
  oppLogo?: string;
  outcome: 'W' | 'D' | 'L' | null;
  isPlayed: boolean;
  winProb: number;
  eloDelta: number | null;
  odds: MatchOdds1X2;
  oppStanding?: LiveTeamMetrics;
}

export interface ModalHeaderProps {
  resolvedTeamName: string;
  resolvedManagerId?: string;
  managerDisplayName: string;
  teamLogo: string;
  teamMetric?: LiveTeamMetrics;
  eloTrack?: { current: number };
  eloBadge: { bg: string; text: string; border: string };
  teamSoS?: TeamSoSMetrics;
  statusBadge: string;
  statusLabel: string;
  hasHistory: boolean;
  activeTab: TeamMatchesTab;
  matchesCount: number;
  mcMedian?: number;
  luck?: LiveTeamMetrics['scheduleLuck'];
  xPts?: number;
  deltaPts?: number;
  ap?: { played: number; wins: number; draws: number; losses: number; winPct: number };
  luckBadge?: LuckBadge;
  luckLabel?: string;
  luckZ?: number;
}
