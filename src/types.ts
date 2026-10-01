export interface Manager {
  id: string;
  name: string;
  years: number;
  gold: number;
  silver: number;
  bronze: number;
  spoon: number;
  cup_gold: number;
  cup_silver: number;
  supercup: number;
  mundialito: number;
  cartonato: number;
  coach_banners?: string[];
  cartonato_coaches?: string[];
}

export interface TitlesConfig {
  brandMain?: string;
  brandHighlight?: string;
  brandSub?: string;
  mainHeading: string;
  subHeading: string;
  leagueCaption: string;
  col1?: string;
  col2?: string;
  col3?: string;
  col4?: string;
  col5?: string;
  col6?: string;
  col7?: string;
}

export interface LeagueData {
  managers?: Manager[];
  leagueData?: Manager[];
  titles?: TitlesConfig;
  customTitles?: TitlesConfig;
  exportedAt?: string;
}

export type ThemeKey = 'gala' | 'seriea' | 'gazzetta' | 'studio';

export type SortMode =
  | 'score'
  | 'gold'
  | 'total'
  | 'name'
  | 'cartonato'
  | 'trophies_desc'
  | 'rating_desc'
  | 'scudetti_desc'
  | 'years_desc'
  | 'mundialito_desc'
  | 'spoons_desc'
  | 'cartonato_desc';

export type DisplayMode = 'multiple' | 'compact';

export interface AppState {
  managers: Manager[];
  currentTheme: ThemeKey;
  currentSort: SortMode;
  displayMode: DisplayMode;
  isEditMode: boolean;
  selectedManagerId: string | null;
  titles: TitlesConfig;
}

export interface ScoringWeights {
  gold: number;
  silver: number;
  bronze: number;
  cup_gold: number;
  cup_silver: number;
  supercup: number;
  mundialito: number;
  spoon: number;
  cartonato: number;
}

export type AnalyticsTab = 'macro' | 'clutch' | 'risk';
export type Tab2SortField = 'name' | 'podiumRate' | 'killerInstinct' | 'clutch';
export type Tab2SortDirection = 'asc' | 'desc';

export interface ManagerAnalyticsProfile {
  id: string;
  name: string;
  years: number;
  gold: number;
  trophies: number;
  trophySharePct: number;
  efficiency: number; // Trophies / Years
  score: number;
  finalsPlayed: number;
  finalsWon: number;
  conversionRatePct: number; // Finals Won / Finals Played
  podiums: number; // Gold + Silver + Bronze
  podiumRatePct: number; // Podiums / Years * 100
  killerInstinctPct: number; // Gold / Podiums * 100
  dishonors: number; // Spoon + Cartonato
  disasterMass: number; // max(Spoon, Cartonato) + 0.5 * min(Spoon, Cartonato)
  tailMass: number; // Gold + Disaster Mass
  feastOrFamineRatio: number; // Raw FF
  smoothedFeastOrFamine: number; // Bayesian smoothed FF
  netTailSkew: number; // (Gold - DisasterMass) / (TailMass + eps) in [-1, +1]
  netTailSkewLabel: string; // 'Feast-Dominant' | 'Famine-Dominant' | 'Bipolar / Equilibrato'
  archetypeTag: string;
  archetypeColor: string;
  archetypeIcon: string;
}

export interface DishonorShare {
  name: string;
  count: number;
  sharePct: number;
}

export interface LeagueConcentrationAnalysis {
  totalTrophies: number;
  totalDishonors: number;
  giniTrophies: number;
  giniRating: number;
  cr3Pct: number;
  cr3DishonorPct: number;
  hhi: number;
  hhiDescription: string;
  relativeEntropy: number; // 0 to 1
  leagueAverageFF: number;
  tierTitle: string;
  tierDescription: string;
  tierColor: string;
  profiles: ManagerAnalyticsProfile[];
  top3SilverwareNames: string[];
  dishonorShares: DishonorShare[];
}
