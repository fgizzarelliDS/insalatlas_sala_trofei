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
  in_progress?: boolean;
  status?: 'in_progress' | 'completed' | string;
  achievements: Achievement[];
}

export interface LeagueFeatures {
  spoon: boolean;
  cup: boolean;
  supercup: boolean;
  mundialito: boolean;
  cartonato: boolean;
}

export type CompetitionArchetype = 'tier3' | 'tier2' | 'single' | 'dishonor' | 'banners';

export interface CompetitionDefinition {
  id: string;               // Chiave univoca (es. 'championship', 'cup', 'supercup', 'mundialito', 'spoon', 'cartonato', 'champions')
  name: string;             // Nome esteso (es. 'Campionato Serie Atlas', 'Coppa di Lega')
  shortName: string;        // Etichetta compatta per intestazione colonna
  category: string;         // Categoria abbinata nei record di data.json
  nameKeywords?: string[];  // Parole chiave secondarie per match nel nome competizione
  trophyIcon: string;       // Chiave SVG in trophies.ts (oro / trofeo principale)
  silverTrophyIcon?: string;// Chiave SVG argento (tier3 / tier2)
  bronzeTrophyIcon?: string;// Chiave SVG bronzo (tier3)
  type: CompetitionArchetype;
  scoringPoints: {
    gold: number;
    silver?: number;
    bronze?: number;
  };
  grid: {
    desktopTrack: string;   // CSS track, es. 'minmax(270px, 1.4fr)', '150px'
    desktopWidthPx: number; // Larghezza base per export canvas HD
    mobileWidthPx: number;  // Larghezza minima colonna su mobile (<768px)
  };
  cardIcon?: string;        // Emoji o icona per la card statistica in alto (default dedotto da archetype/id)
  cardBadgeStyle?: string;  // Classi CSS/Tailwind per il badge icona nella card (es. 'bg-amber-500/20 text-amber-400')
  order: number;
  enabled: boolean;
}

export type AlboColumnKey =
  | 'manager'
  | 'championship'
  | 'spoon'
  | 'cup'
  | 'supercup'
  | 'mundialito'
  | 'cartonato'
  | (string & {});

export interface AlboColumnDef {
  key: AlboColumnKey;
  cssVar: string;
  titleKey: string;
  defaultTitle: string;
  enabled: boolean;
  order: number;
}

export interface LeagueProfile {
  id: string;
  brand: {
    name: string;
    mainTitle: string;
    subtitle: string;
    pwaShortName: string;
    description: string;
    championshipLabel: string;
  };
  siteUrl: string;
  filePrefix: string;
  storagePrefix: string;
  defaultTheme: ThemeKey;
  features: LeagueFeatures;
  rules: {
    spoonMinTeams: number;
  };
  competitions: {
    championship: {
      category: string;
      nameContains: string[];
      title: string;
    };
    cup: {
      category: string;
      title: string;
      runnerUpTitle: string;
    };
    supercup: {
      category: string;
      title: string;
      runnerUpTitle: string;
    };
    categoryIdMap: Record<string, string>;
  };
}

export interface CompetitionRankingItem {
  rank: number | null;
  teamName: string;
  coach: string;
  managerId?: string;
  points: number | null;
  logo?: string;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDiff?: number;
  totalFantaPoints?: number;
  avgFantaPoints?: number;
  recentForm?: Array<'W' | 'D' | 'L'>;
}

export interface CompetitionRecord {
  id: number;
  name: string;
  season: string;
  category: string;
  in_progress?: boolean;
  status?: 'in_progress' | 'completed';
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
  trophies?: Record<string, number>;
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

export type AnalyticsTab = 'macro' | 'clutch' | 'risk' | 'chronology';
export type Tab2SortField = 'name' | 'podiumRate' | 'killerInstinct' | 'clutch' | 'gci';
export type Tab2SortDirection = 'asc' | 'desc';
export type MacroMetricMode = 'prestige' | 'raw';

export type ChronologySubView = 'managers' | 'seasons';
export type ManagerFilterMode = 'all' | 'veterans' | 'active';

export type ChronologySortField =
  | 'avg_rank'
  | 'baricenter'
  | 'name'
  | 'seasons'
  | 'oscillation'
  | 'podiums'
  | 'spoons'
  | 'merit';

export type SeasonSortField =
  | 'season'
  | 'step_gap'
  | 'compactness'
  | 'total_gap'
  | 'podium_gap'
  | 'spoon_gap';

export type VolatilityCategory = 'metronomo' | 'equilibrato' | 'altalenante' | 'esordiente';

export interface StabilityProfile {
  category: VolatilityCategory;
  label: string;
  badgeLabel: string;
  stdDevRank: number;
  icon: string;
  emoji: string;
  color: string;
}

export interface ManagerTierDistribution {
  podiumCount: number; // Tier 4: Vertice / Podio (1°-3°)
  highCount: number; // Tier 3: Alta Classifica
  midCount: number; // Tier 2: Metà Classifica
  riskCount: number; // Tier 1: Rischio Cucchiaio (ultimi 2 posti)
  podiumPct: number;
  highPct: number;
  midPct: number;
  riskPct: number;
  baricenterScore: number; // 1.0 to 4.0
  baricenterLabel: string;
  baricenterColor: string;
  baricenterIcon: string;
}

export interface ManagerTrajectoryMetrics {
  id: string;
  name: string;
  seasonsPlayed: number;
  isRookieInProgress?: boolean;
  avgRank: number; // Real average rank (e.g. 3.8)
  stdDevRank: number; // Typical rank oscillation (e.g. 1.4)
  avgMeritPct: number; // 0% to 100%
  stdDevMeritPct: number;
  cvPct: number; // Coefficient of variation %
  volatilityCategory: VolatilityCategory;
  volatilityLabel: string;
  volatilityIcon: string;
  volatilityColor: string;
  bestRank: number | null;
  worstRank: number | null;
  totalPodiums: number; // Gold + Silver + Bronze in league
  totalSpoons: number; // Last place finishes
  maxPodiumStreak: number;
  maxSafetyStreak: number;
  currentPodiumStreak: number;
  currentSafetyStreak: number;
  isActive: boolean; // Participates in latest season (2025/26)
  tierDistribution: ManagerTierDistribution;
}

export interface SeasonParityMetrics {
  season: string;
  competitionId: number;
  competitionName: string;
  teamCount: number;
  hasPointsData: boolean;
  meanPts: number | null;
  stdDevPts: number | null;
  compactnessScore: number | null; // 0 to 100
  totalGap: number | null; // Champ pts - Spoon pts (e.g. 18.0)
  stepGap: number | null; // Gap per position step = totalGap / (teamCount - 1)
  podiumGap: number | null; // S1 - S3
  spoonGap: number | null; // S(N-1) - SN
  championName: string;
  championTeam: string;
  championPts: number | null;
  spoonName: string;
  spoonTeam: string;
  spoonPts: number | null;
  podiumBadge: string;
  podiumBadgeColor: string;
  spoonBadge: string;
  spoonBadgeColor: string;
}

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
  globalClutchIndex: number; // GCI (70% League KI + 30% Cups CR with Bayesian shrinkage)
  clutchTier: string; // 'Glaciale' | 'Cinico' | 'Equilibrato' | 'Incerto' | 'Choker' | 'Debuttante'
  clutchLabel: string;
  clutchIcon: string;
  clutchColor: string;
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

export interface SharedSeasonDuel {
  season: string;
  rankA: number;
  rankB: number;
  winner: 'A' | 'B' | 'tie';
  teamA?: string;
  teamB?: string;
}

export interface HeadToHeadStats {
  managerA: Manager;
  managerB: Manager;
  sharedSeasonsCount: number;
  winsA: number;
  winsB: number;
  ties: number;
  duels: SharedSeasonDuel[];
  palmares: {
    gold: { a: number; b: number };
    silver: { a: number; b: number };
    bronze: { a: number; b: number };
    cupGold: { a: number; b: number };
    supercup: { a: number; b: number };
    mundialito: { a: number; b: number };
    spoon: { a: number; b: number };
    cartonato: { a: number; b: number };
    totalTitles: { a: number; b: number };
    ratingScore: { a: number; b: number };
  };
  metricsA: {
    score: number;
    gci: number;
    clutchLabel: string;
    clutchIcon: string;
    clutchColor: string;
    kiPct: number;
    crPct: number;
    nti: number;
    polarityLabel: string;
    polarityIcon: string;
    polarityColor: string;
    stabilityCategory: string;
    stabilityIcon: string;
    stdDevRank: number;
    archetypeTag: string;
    archetypeIcon: string;
    archetypeColor: string;
  };
  metricsB: {
    score: number;
    gci: number;
    clutchLabel: string;
    clutchIcon: string;
    clutchColor: string;
    kiPct: number;
    crPct: number;
    nti: number;
    polarityLabel: string;
    polarityIcon: string;
    polarityColor: string;
    stabilityCategory: string;
    stabilityIcon: string;
    stdDevRank: number;
    archetypeTag: string;
    archetypeIcon: string;
    archetypeColor: string;
  };
  narrativeVerdict: string;
}

export interface RivalryOpponent {
  opponent: Manager;
  wins: number;
  ties: number;
  losses: number;
  pointsDiff: number;
  sharedSeasons: number;
  rivalryScore: number;
}

export interface ManagerRivalryStats {
  managerId: string;
  nemesis: RivalryOpponent | null;
  victim: RivalryOpponent | null;
  biggestBlowout: {
    opponent: Manager;
    season: string;
    margin: number;
    rankA: number;
    rankB: number;
    winner: 'A' | 'B';
  } | null;
  titleClashesCount: number;
}

export interface NemesisMatrixCell {
  managerAId: string;
  managerBId: string;
  sharedSeasons: number;
  winsA: number;
  ties: number;
  winsB: number;
  pointsDiffA: number;
  status: 'positive' | 'negative' | 'neutral' | 'none' | 'self';
}

export interface NemesisMatrixData {
  managers: Manager[];
  matrix: Record<string, Record<string, NemesisMatrixCell>>;
}

export type RecordCategory =
  | 'points'
  | 'titles'
  | 'h2h'
  | 'streaks'
  | 'banter';

export interface RecordHolder {
  managerId: string;
  managerName: string;
  teamName?: string;
  logo?: string;
  fallbackCrest?: string;
  season?: string;
  value: number | string;
  formattedValue: string;
  normalizedDetail?: string; // e.g. "1.91 pt/g · 35 giornate"
  detail?: string;
}

export interface LeagueRecord {
  id: string;
  title: string;
  category: RecordCategory;
  icon: string;
  watermark?: string; // Thematic background watermark emoji or SVG icon
  badgeLabel: string;
  badgeColor: string;
  primaryHolders: RecordHolder[];
  primaryHolder: RecordHolder; // points to primaryHolders[0] for backward compatibility
  runnerUps: RecordHolder[];
  description: string;
}

export type FormResult = 'W' | 'D' | 'L';

export type CompositeStatusBadge = '🔥' | '📈' | '⚖️' | '📉' | '🧊';

export type LuckBadge = '🍀' | '↗️' | '⚖️' | '↘️' | '⛈️';

export interface ScheduleLuckAnalytics {
  xPoints: number;
  deltaPoints?: number;
  xRank: number;
  deltaRank: number;
  allPlayRecord: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    winPct: number;
  };
  luckZScore: number;
  luckBadge: LuckBadge;
  luckLabel: string;
  monteCarlo?: {
    medianPoints: number;
    stdDev: number;
    pPodiumPct?: number | null;
    pSpoonPct?: number | null;
  };
}

export interface MatchdayMatch {
  homeTeam: string;
  awayTeam: string;
  homeManagerId?: string;
  awayManagerId?: string;
  isPlayed?: boolean;
  homeOutcome?: FormResult | null;
  awayOutcome?: FormResult | null;
  homeScore?: number;
  awayScore?: number;
  homeFantaPoints?: number;
  awayFantaPoints?: number;
  homeLogo?: string;
  awayLogo?: string;
}

export interface MatchdayRound {
  roundNumber: number;
  date?: string;
  matches: MatchdayMatch[];
}

export interface LiveTeamMetrics {
  rank: number;
  managerId?: string;
  teamName: string;
  coach: string;
  recentForm: FormResult[];
  statusBadge: CompositeStatusBadge;
  statusLabel: string;
  logo?: string;
  scheduleLuck?: ScheduleLuckAnalytics;
  points?: number;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDiff?: number;
  totalFantaPoints?: number;
  avgFantaPoints?: number;
  expectedRank?: number;
  deltaLuck?: number;
  momentum?: number;
}

export interface LiveSeasonDetails {
  season: string;
  competitionId: number | string;
  lastCompletedRound: number;
  totalRounds: number;
  rounds: MatchdayRound[];
  standings: LiveTeamMetrics[];
}


