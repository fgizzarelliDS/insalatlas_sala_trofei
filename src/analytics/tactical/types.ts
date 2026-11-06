/**
 * src/analytics/tactical/types.ts
 * Domain Types and Interfaces for Tactical Profiler & Identikit (SPEC-25)
 */

export type TacticalAxisKey = 'pot' | 'cin' | 'luk' | 'koc' | 'reg';

export interface TacticalAxisData {
  key: TacticalAxisKey;
  label: string;
  shortTitle: string;
  acronym: string;
  raw: string;
  score: number; // 5 to 100
  deltaPct: string; // e.g. "(+32%)" or "(-10%)"
  deltaNumeric: number; // score - 50
  barColor: string;
}

export interface TacticalStyleAxes {
  pot: TacticalAxisData;
  cin: TacticalAxisData;
  luk: TacticalAxisData;
  koc: TacticalAxisData;
  reg: TacticalAxisData;
  radarPoints: string; // "x1,y1 x2,y2 x3,y3 x4,y4 x5,y5"
}

export interface TacticalStatPill {
  title: string;
  val: string;
  lbl: string;
}

export interface TacticalArchetype {
  id: string;
  title: string;
  icon: string;
  color: string;
  trait: string;
  motto: string;
}

export interface SeasonalMindset {
  isActive: boolean;
  pill: string;
  desc: string;
  momentum: string;
  luckDelta: string;
  icon: string;
}

export interface TacticalProfile {
  managerId: string;
  managerName: string;
  teamName: string;
  crestText: string;
  subMeta: string;
  archetype: TacticalArchetype;
  axes: TacticalStyleAxes;
  stats: [TacticalStatPill, TacticalStatPill, TacticalStatPill];
  mindset: SeasonalMindset;
}

export interface ManagerLoreItem {
  customMotto?: string;
  customTrait?: string;
  customBanter?: string;
  notes?: string;
}

export type ManagerLoreCatalog = Record<string, ManagerLoreItem>;

export interface RawManagerTacticalValues {
  pot: number;
  cin: number;
  luk: number;
  koc: number;
  reg: number;
  avgFP: number;
  closeWinRate: number;
  luckDelta: number;
  finalsPlayed: number;
  finalsWon: number;
  stdDevRank: number;
}
