/**
 * Types and data models for the Interactive Trophy History Modals
 */

export type TrophyModalKey =
  | 'seasons'
  | 'scudetti'
  | 'championship'
  | 'cups'
  | 'cup'
  | 'supercup'
  | 'mundialito'
  | 'spoons'
  | 'spoon'
  | 'cartonato'
  | (string & {});

export type CupSubTab = 'coppa' | 'supercoppa';

export interface TrophyEditionParticipant {
  managerId?: string;
  managerName: string;
  teamName: string;
  logo?: string;
  fallbackCrest?: string;
  points?: number | null;
  detail?: string;
}

export interface TrophyEdition {
  season: string;
  competitionName: string;
  inProgress?: boolean;
  winner?: TrophyEditionParticipant;
  runnerUp?: TrophyEditionParticipant;
  thirdPlace?: TrophyEditionParticipant;
  note?: string;
}
