import { ScoringWeights, TitlesConfig } from '@/types';

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
  brandMain: 'Sala Trofei',
  brandHighlight: 'InsalAtlas',
  brandSub: "Albo d'Oro Storico Ufficiale",
  mainHeading: 'InsalAtlas',
  subHeading: '(Palmares)',
  leagueCaption: "ALBO D'ORO STORICO",
  col1: 'Allenatore (Presenze)',
  col2: 'Campionato',
  col3: 'Cucchiaio',
  col4: 'Coppa di Lega',
  col5: 'Supercoppa',
  col6: 'Mundialito',
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
