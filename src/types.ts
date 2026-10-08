export type AchievementBadge =
  | 'gold'
  | 'silver'
  | 'bronze'
  | 'cup_gold'
  | 'cup_silver'
  | 'supercup'
  | 'supercup_silver'
  | 'mundialito'
  | 'mundialito_silver'
  | 'spoon'
  | 'cartonato';

export interface Achievement {
  title: string;
  category: 'Campionato' | 'Coppa' | 'Supercoppa' | 'Mundialito' | 'Perdenti' | string;
  badge: AchievementBadge;
  icon: string;
  competitionId?: number | null;
}

export interface SeasonRecord {
  season: string;
  team: string | null;
  rank: number | null;
  points: number | null;
  competitionId?: number | null;
  achievements: Achievement[];
}

export interface CompetitionRankingItem {
  rank: number | null;
  teamName: string;
  coach: string;
  managerId?: string;
  points: number | null;
  logo?: string;
}

export interface CompetitionRecord {
  id: number;
  name: string;
  season: string;
  category: string;
  ranking: CompetitionRankingItem[];
}

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
  supercup_silver?: number;
  mundialito: number;
  mundialito_silver?: number;
  cartonato: number;
  coach_banners?: string[];
  cartonato_coaches?: string[];
  history?: SeasonRecord[];
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
  competitions?: CompetitionRecord[];
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
  competitions: CompetitionRecord[];
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
export type MacroMetricMode = 'prestige' | 'raw';

export interface ManagerAnalyticsProfile {
  id: string;
  name: string;
  years: number;
  gold: number;
  trophies: number;
  trophySharePct: number;
  efficiency: number; // Trophies / Years
  prestigeScore: number; // Weighted SPI score
  prestigeSharePct: number; // Share of total league prestige
  prestigeEfficiency: number; // Prestige / Years
  score: number;
  finalsPlayed: number;
  finalsWon: number;
  conversionRatePct: number; // Finals Won / Finals Played
  podiums: number; // Gold + Silver + Bronze
  podiumRatePct: number; // Podiums / Years * 100
  killerInstinctPct: number; // Gold / Podiums * 100
  dishonors: number; // Spoon + Cartonato
  feastMass: number; // Gold * 1.0 + CupGold * 0.5
  disasterMass: number; // Spoon * 1.0 + Cartonato * 0.75
  tailMass: number; // FeastMass + DisasterMass
  totalTailMass: number;
  feastOrFamineRatio: number; // Raw FF
  smoothedFeastOrFamine: number; // Bayesian smoothed FF
  netTailSkew: number; // Regularized NTS with shrinkage prior M=1.5 in [-1, +1]
  netTailSkewLabel: string; // Polarity label
  netTailIndex: number; // NTI = smoothedFF * NTS in [-1, +1]
  polarityLabel: string;
  polarityColor: string;
  polarityIcon: string;
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
  totalPrestige: number;
  totalDishonors: number;
  giniTrophies: number;
  giniPrestige: number;
  giniRating: number;
  cr3Pct: number;
  cr3PrestigePct: number;
  cr3DishonorPct: number;
  hhi: number;
  hhiDescription: string;
  hhiPrestige: number;
  hhiPrestigeDescription: string;
  relativeEntropy: number; // 0 to 1
  relativeEntropyPrestige: number; // 0 to 1
  leagueAverageFF: number;
  tierTitle: string;
  tierDescription: string;
  tierColor: string;
  profiles: ManagerAnalyticsProfile[];
  top3SilverwareNames: string[];
  top3PrestigeNames: string[];
  dishonorShares: DishonorShare[];
}

export interface TradingCardBadge {
  label: string;
  icon: string;
  color?: string;
  customStyle?: string;
}
