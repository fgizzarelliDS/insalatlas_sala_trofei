import {
  ScoringWeights,
  TitlesConfig,
  LeagueProfile,
  LeagueFeatures,
  AlboColumnDef,
  CompetitionDefinition
} from '@/types';

export const LEAGUE: LeagueProfile = {
  id: 'insalatlas',
  brand: {
    name: 'InsalAtlas',
    mainTitle: 'Sala Trofei',
    subtitle: "Albo d'Oro Storico Ufficiale",
    pwaShortName: 'InsalAtlas',
    description: "Albo d'Oro Storico Ufficiale e Sala Trofei della Lega Fantacalcio InsalAtlas",
    championshipLabel: 'Serie InsalAtlas'
  },
  siteUrl: 'https://fgizzarellids.github.io/insalatlas_sala_trofei/',
  filePrefix: 'insalatlas',
  storagePrefix: 'fantacalcio',
  defaultTheme: 'gazzetta',
  features: {
    spoon: true,
    cup: true,
    supercup: true,
    mundialito: true,
    cartonato: true
  },
  rules: {
    spoonMinTeams: 8
  },
  competitions: {
    championship: {
      category: 'Campionato',
      nameContains: ['serie'],
      title: 'Scudetto'
    },
    cup: {
      category: 'Coppa',
      title: 'Coppa InsalAtlas',
      runnerUpTitle: 'Finalista Coppa InsalAtlas'
    },
    supercup: {
      category: 'Supercoppa',
      title: 'Supercoppa InsalAtlas',
      runnerUpTitle: 'Finalista Supercoppa'
    },
    categoryIdMap: {
      '31666': 'Coppa',
      '348809': 'Supercoppa',
      '348808': 'Mundialito',
      '348805': 'Perdenti'
    }
  },
  elo: {
    baseRating: 1500.0,
    scaleFactor: 400.0,
    carryoverAlpha: 0.75,
    historicalSeeding: {
      scale: 75.0,
      minRating: 1350.0,
      maxRating: 1650.0
    },
    kFactors: {
      Campionato: 32.0,
      Coppa_Knockout: 40.0,
      Coppa: 24.0,
      Supercoppa: 24.0,
      Mundialito: 32.0,
      Perdenti: 16.0,
      default: 32.0
    }
  }
};

export const LEAGUE_SITE_HOST: string = LEAGUE.siteUrl
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');

/**
 * Centralized Competition Registry (Single Source of Truth)
 * Defines all tournaments, their archetypes, icons, points, and responsive grid dimensions.
 */
export const COMPETITION_REGISTRY: CompetitionDefinition[] = [
  {
    id: 'championship',
    name: 'Campionato',
    shortName: 'Campionato',
    category: 'Campionato',
    nameKeywords: ['serie'],
    trophyIcon: 'gold_cup',
    silverTrophyIcon: 'silver_cup',
    bronzeTrophyIcon: 'bronze_cup',
    type: 'tier3',
    scoringPoints: { gold: 3.0, silver: 0.5, bronze: 0.25 },
    grid: { desktopTrack: 'minmax(270px, 1.4fr)', desktopWidthPx: 270, mobileWidthPx: 115 },
    order: 2,
    enabled: true
  },
  {
    id: 'cup',
    name: 'Coppa di Lega',
    shortName: 'Coppa di Lega',
    category: 'Coppa',
    nameKeywords: ['coppa'],
    trophyIcon: 'coppa_gold',
    silverTrophyIcon: 'coppa_silver',
    type: 'tier2',
    scoringPoints: { gold: 2.0, silver: 0.25 },
    grid: { desktopTrack: '150px', desktopWidthPx: 150, mobileWidthPx: 85 },
    order: 3,
    enabled: LEAGUE.features.cup
  },
  {
    id: 'supercup',
    name: 'Supercoppa',
    shortName: 'Supercoppa',
    category: 'Supercoppa',
    nameKeywords: ['supercoppa'],
    trophyIcon: 'supercup',
    type: 'single',
    scoringPoints: { gold: 1.0 },
    grid: { desktopTrack: '120px', desktopWidthPx: 120, mobileWidthPx: 90 },
    order: 4,
    enabled: LEAGUE.features.supercup
  },
  {
    id: 'mundialito',
    name: 'Mundialito',
    shortName: 'Mundialito',
    category: 'Mundialito',
    nameKeywords: ['mundialito'],
    trophyIcon: 'mundialito',
    type: 'single',
    scoringPoints: { gold: 1.0 },
    grid: { desktopTrack: '120px', desktopWidthPx: 120, mobileWidthPx: 90 },
    order: 5,
    enabled: LEAGUE.features.mundialito
  },
  {
    id: 'spoon',
    name: 'Cucchiaio di Legno',
    shortName: 'Cucchiaio',
    category: 'Campionato',
    nameKeywords: ['cucchiaio'],
    trophyIcon: 'wooden_spoon',
    type: 'dishonor',
    scoringPoints: { gold: -1.0 },
    grid: { desktopTrack: '90px', desktopWidthPx: 90, mobileWidthPx: 65 },
    order: 6,
    enabled: LEAGUE.features.spoon
  },
  {
    id: 'cartonato',
    name: 'Cartonato (Playout)',
    shortName: 'Cartonato',
    category: 'Perdenti',
    nameKeywords: ['perdenti', 'cartonato'],
    trophyIcon: 'cartonato',
    type: 'banners',
    scoringPoints: { gold: -2.0 },
    grid: { desktopTrack: 'minmax(150px, 1.1fr)', desktopWidthPx: 220, mobileWidthPx: 175 },
    order: 7,
    enabled: LEAGUE.features.cartonato
  }
];

export function getActiveCompetitions(): CompetitionDefinition[] {
  return COMPETITION_REGISTRY.filter(c => c.enabled).sort((a, b) => a.order - b.order);
}

export function getCompetitionDef(id: string): CompetitionDefinition | undefined {
  return COMPETITION_REGISTRY.find(c => c.id === id);
}

export function buildAlboColumns(features: LeagueFeatures = LEAGUE.features): AlboColumnDef[] {
  const managerCol: AlboColumnDef = {
    key: 'manager',
    cssVar: '--col-manager',
    titleKey: 'col1',
    defaultTitle: 'Allenatore (Presenze)',
    enabled: true,
    order: 1
  };

  const compCols: AlboColumnDef[] = COMPETITION_REGISTRY
    .filter(comp => {
      if (comp.id === 'cup') return features.cup;
      if (comp.id === 'supercup') return features.supercup;
      if (comp.id === 'mundialito') return features.mundialito;
      if (comp.id === 'spoon') return features.spoon;
      if (comp.id === 'cartonato') return features.cartonato;
      return comp.enabled;
    })
    .map(comp => ({
      key: comp.id,
      cssVar: `--col-${comp.id}`,
      titleKey: `col${comp.order}`,
      defaultTitle: comp.shortName,
      enabled: true,
      order: comp.order
    }));

  return [managerCol, ...compCols].sort((a, b) => a.order - b.order);
}

export const ALBO_COLUMNS: AlboColumnDef[] = buildAlboColumns(LEAGUE.features);

export const SCORING_WEIGHTS: ScoringWeights = {
  gold: 3.0,
  cup_gold: 2.0,
  supercup: 1.0,
  mundialito: 1.0,
  silver: 0.5,
  cup_silver: 0.25,
  bronze: 0.25,
  spoon: -1.0,
  cartonato: -2.0
};

export const DEFAULT_TITLES: TitlesConfig = {
  brandMain: LEAGUE.brand.mainTitle,
  brandHighlight: LEAGUE.brand.name,
  brandSub: LEAGUE.brand.subtitle,
  mainHeading: LEAGUE.brand.name,
  subHeading: '(Palmares)',
  leagueCaption: "ALBO D'ORO STORICO",
  col1: 'Allenatore (Presenze)',
  col2: 'Campionato',
  col3: 'Coppa di Lega',
  col4: 'Supercoppa',
  col5: 'Mundialito',
  col6: 'Cucchiaio',
  col7: 'Cartonato'
};

export const ADMIN_TOKEN: string = import.meta.env.VITE_ADMIN_TOKEN || '';

/**
 * Calculates SHA-256 hash using native Web Crypto API
 * @param text - Plain text input
 * @returns 64-character lowercase hex string
 */
export async function sha256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies admin password by comparing its SHA-256 hash against ADMIN_TOKEN
 * @param inputPass - Plain password entered by the user
 */
export async function verifyAdminPassword(inputPass: string): Promise<boolean> {
  if (!inputPass || !ADMIN_TOKEN) return false;
  const token = ADMIN_TOKEN.trim().toLowerCase();
  const inputHash = await sha256(inputPass);
  return inputHash === token;
}
