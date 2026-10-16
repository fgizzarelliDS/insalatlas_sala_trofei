import { ScoringWeights, TitlesConfig, LeagueProfile, LeagueFeatures, AlboColumnDef } from '@/types';

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
  }
};

export const LEAGUE_SITE_HOST: string = LEAGUE.siteUrl
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');

export function buildAlboColumns(features: LeagueFeatures): AlboColumnDef[] {
  const allColumns: AlboColumnDef[] = [
    { key: 'manager', cssVar: '--col-manager', titleKey: 'col1', defaultTitle: 'Allenatore (Presenze)', enabled: true, order: 1 },
    { key: 'championship', cssVar: '--col-championship', titleKey: 'col2', defaultTitle: 'Campionato', enabled: true, order: 2 },
    { key: 'cup', cssVar: '--col-cup', titleKey: 'col3', defaultTitle: 'Coppa di Lega', enabled: features.cup, order: 3 },
    { key: 'supercup', cssVar: '--col-supercup', titleKey: 'col4', defaultTitle: 'Supercoppa', enabled: features.supercup, order: 4 },
    { key: 'mundialito', cssVar: '--col-mundialito', titleKey: 'col5', defaultTitle: 'Mundialito', enabled: features.mundialito, order: 5 },
    { key: 'spoon', cssVar: '--col-spoon', titleKey: 'col6', defaultTitle: 'Cucchiaio', enabled: features.spoon, order: 6 },
    { key: 'cartonato', cssVar: '--col-cartonato', titleKey: 'col7', defaultTitle: 'Cartonato', enabled: features.cartonato, order: 7 }
  ];
  return allColumns.filter(c => c.enabled).sort((a, b) => a.order - b.order);
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
