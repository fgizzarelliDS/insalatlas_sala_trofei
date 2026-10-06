/**
 * InsalAtlas Vector Team Crest Fallback Engine
 * Provides deterministic, high-definition SVG crests for teams lacking custom logos.
 */

export const CREST_IDS = [
  'apex_united',
  'royal_vanguard',
  'phoenix_rising',
  'ironclad_athletic',
  'starlight_rovers',
  'aegis_sentinel',
  'titan_wolves',
  'golden_griffin',
  'obsidian_fc',
  'crown_point',
  'valiant_knights',
  'kraken_maritime',
  'volt_dynamo',
  'falconcrest_athletic',
  'solaris_sc',
  'northgate_rovers',
  'cobra_strike',
  'celestial_horizon',
  'wildcat_city',
  'anchor_bay'
] as const;

export type CrestId = typeof CREST_IDS[number];

export interface CrestMetadata {
  id: CrestId;
  name: string;
  era: string;
  file: string;
}

export const CRESTS_CATALOG: Record<CrestId, CrestMetadata> = {
  apex_united: { id: 'apex_united', name: 'Apex United FC', era: 'Stile Geometrico', file: 'assets/crests/apex_united.svg' },
  royal_vanguard: { id: 'royal_vanguard', name: 'Royal Vanguard SC', era: 'Araldico Classico', file: 'assets/crests/royal_vanguard.svg' },
  phoenix_rising: { id: 'phoenix_rising', name: 'Phoenix Rising FC', era: 'Mascotte & Fiamme', file: 'assets/crests/phoenix_rising.svg' },
  ironclad_athletic: { id: 'ironclad_athletic', name: 'Ironclad Athletic', era: 'Industrial & Forge', file: 'assets/crests/ironclad_athletic.svg' },
  starlight_rovers: { id: 'starlight_rovers', name: 'Starlight Rovers', era: 'Cosmic & Astral', file: 'assets/crests/starlight_rovers.svg' },
  aegis_sentinel: { id: 'aegis_sentinel', name: 'Aegis Sentinel FC', era: 'Spartan & Shield', file: 'assets/crests/aegis_sentinel.svg' },
  titan_wolves: { id: 'titan_wolves', name: 'Titan Wolves SC', era: 'Predatori Artici', file: 'assets/crests/titan_wolves.svg' },
  golden_griffin: { id: 'golden_griffin', name: 'Golden Griffin FC', era: 'Creature Mitologiche', file: 'assets/crests/golden_griffin.svg' },
  obsidian_fc: { id: 'obsidian_fc', name: 'Obsidian FC', era: 'Monochrome Facet', file: 'assets/crests/obsidian_fc.svg' },
  crown_point: { id: 'crown_point', name: 'Crown Point Wanderers', era: 'Monarchico', file: 'assets/crests/crown_point.svg' },
  valiant_knights: { id: 'valiant_knights', name: 'Valiant Knights SC', era: 'Medievale', file: 'assets/crests/valiant_knights.svg' },
  kraken_maritime: { id: 'kraken_maritime', name: 'Kraken Maritime FC', era: 'Mistero Oceanico', file: 'assets/crests/kraken_maritime.svg' },
  volt_dynamo: { id: 'volt_dynamo', name: 'Volt Dynamo SC', era: 'High Voltage', file: 'assets/crests/volt_dynamo.svg' },
  falconcrest_athletic: { id: 'falconcrest_athletic', name: 'Falconcrest Athletic', era: 'Rapaci & Velocità', file: 'assets/crests/falconcrest_athletic.svg' },
  solaris_sc: { id: 'solaris_sc', name: 'Solaris SC', era: 'Solare & Energia', file: 'assets/crests/solaris_sc.svg' },
  northgate_rovers: { id: 'northgate_rovers', name: 'Northgate Rovers', era: 'Fortezza & Mura', file: 'assets/crests/northgate_rovers.svg' },
  cobra_strike: { id: 'cobra_strike', name: 'Cobra Strike FC', era: 'Rettili & Attacco', file: 'assets/crests/cobra_strike.svg' },
  celestial_horizon: { id: 'celestial_horizon', name: 'Celestial Horizon FC', era: 'Astro & Luna', file: 'assets/crests/celestial_horizon.svg' },
  wildcat_city: { id: 'wildcat_city', name: 'Wildcat City FC', era: 'Felini & Grinta', file: 'assets/crests/wildcat_city.svg' },
  anchor_bay: { id: 'anchor_bay', name: 'Anchor Bay Athletic', era: 'Nautico Classico', file: 'assets/crests/anchor_bay.svg' }
};

/**
 * Normalizes a team name for reliable dictionary lookups and consistent hashing
 */
export function normalizeTeamName(name?: string | null): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Optional manual overrides to explicitly map certain historical teams to specific crests
 */
export const CUSTOM_CREST_OVERRIDES: Record<string, CrestId> = {
  // es: 'carlomontefc': 'royal_vanguard',
};

/**
 * Deterministic DJB2 string hashing algorithm
 */
export function hashTeamName(name?: string | null): number {
  const clean = normalizeTeamName(name);
  if (!clean) return 0;
  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns the relative file path to the deterministic vector fallback crest for a team name
 */
export function getTeamFallbackCrest(teamName?: string | null): string {
  const norm = normalizeTeamName(teamName);
  if (norm && CUSTOM_CREST_OVERRIDES[norm]) {
    const overrideId = CUSTOM_CREST_OVERRIDES[norm];
    return CRESTS_CATALOG[overrideId].file;
  }

  const idx = hashTeamName(teamName) % CREST_IDS.length;
  const crestId = CREST_IDS[idx];
  return CRESTS_CATALOG[crestId].file;
}

/**
 * Determines whether a logo URL represents an authentic custom-uploaded user logo
 * rather than a generic Fantacalcio default placeholder (no_logo*.png).
 */
export function isCustomLogo(logo?: string | null): boolean {
  if (!logo || typeof logo !== 'string') return false;
  const trimmed = logo.trim().toLowerCase();
  if (
    trimmed === '' ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed.includes('no_logo') ||
    trimmed.includes('default')
  ) {
    return false;
  }
  return true;
}

/**
 * Universally resolves the team logo:
 * - If the team has an authentic custom logo, returns it.
 * - Otherwise, returns the deterministic vector SVG crest from the 20-crest catalog.
 */
export function resolveTeamLogo(teamName: string, rawLogo?: string | null): string {
  if (isCustomLogo(rawLogo)) {
    return rawLogo!;
  }
  return getTeamFallbackCrest(teamName);
}
