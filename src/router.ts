import type { Manager, RecordCategory } from '@/types';
import type { TrophyModalKey, CupSubTab } from '@/components/modals/trophy';
import { state } from '@/state';

/**
 * Safely decodes a URI component, catching any URIError on malformed percent sequences
 */
export function safeDecodeURI(str: string | null | undefined): string {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * Resolves search and hash query parameters from customUrl or window.location
 */
export function getURLSearchParams(customUrl?: string): { search: URLSearchParams; hash: URLSearchParams } | null {
  let searchStr = '';
  let hashStr = '';

  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      searchStr = url.search;
      hashStr = url.hash;
    } catch {
      return null;
    }
  } else if (typeof window !== 'undefined' && window.location) {
    searchStr = window.location.search || '';
    hashStr = window.location.hash || '';
  } else {
    return null;
  }

  const search = new URLSearchParams(searchStr);

  let hashQuery = '';
  if (hashStr) {
    const qIndex = hashStr.indexOf('?');
    if (qIndex !== -1) {
      hashQuery = hashStr.slice(qIndex);
    } else if (hashStr.includes('=')) {
      hashQuery = hashStr.replace(/^#\/?/, '');
    }
  }
  const hash = new URLSearchParams(hashQuery);

  return { search, hash };
}

/**
 * Extracts raw string parameter value from search or hash
 */
export function getURLParam(name: string, customUrl?: string): string | null {
  const params = getURLSearchParams(customUrl);
  if (!params) return null;
  const fromSearch = params.search.get(name);
  if (fromSearch !== null) return fromSearch;
  const fromHash = params.hash.get(name);
  if (fromHash !== null) return fromHash;
  return null;
}

/**
 * Looks up a manager by id or name with fuzzy resilience
 * Handles with or without 'm_' prefix, URL-encoded chars, case insensitivity and name normalization
 */
export function findManagerByParam(param: string, managers: Manager[] = state.managers): Manager | undefined {
  if (!param) return undefined;
  const clean = safeDecodeURI(param).trim().toLowerCase();
  const cleanNoPrefix = clean.startsWith('m_') ? clean.slice(2) : clean;
  const cleanNormalized = clean.replace(/[^a-z0-9]/g, '');

  return managers.find(m => {
    const idLower = m.id.toLowerCase();
    const idNoPrefix = idLower.startsWith('m_') ? idLower.slice(2) : idLower;
    const nameLower = m.name.toLowerCase();
    const nameNormalized = nameLower.replace(/[^a-z0-9]/g, '');

    return (
      idLower === clean ||
      idNoPrefix === cleanNoPrefix ||
      nameLower === clean ||
      nameNormalized === cleanNormalized
    );
  });
}

/**
 * Extracts ?manager= query parameter from search or hash
 */
export function getManagerParamFromURL(customUrl?: string): string | null {
  const val = getURLParam('manager', customUrl);
  return val ? val.trim() : null;
}

/**
 * Extracts ?h2h=idA:idB query parameter from search or hash
 */
export function getH2HParamFromURL(customUrl?: string): { managerA: string; managerB: string } | null {
  const raw = getURLParam('h2h', customUrl);
  if (!raw) return null;
  const decoded = safeDecodeURI(raw).trim();
  let parts: string[] = [];
  if (decoded.includes(':')) {
    parts = decoded.split(':');
  } else if (/_vs_/i.test(decoded)) {
    parts = decoded.split(/_vs_/i);
  } else if (/-vs-/i.test(decoded)) {
    parts = decoded.split(/-vs-/i);
  } else if (/ vs /i.test(decoded)) {
    parts = decoded.split(/ vs /i);
  }
  if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
    return { managerA: parts[0].trim(), managerB: parts[1].trim() };
  }
  return null;
}

/**
 * Extracts multi-manager comparison parameters (?h2h=multi&m=id1:id2:id3 or ?compare=id1:id2:id3)
 */
export function getMultiH2HParamFromURL(customUrl?: string): string[] | null {
  const params = getURLSearchParams(customUrl);
  if (!params) return null;

  const parse = (p: URLSearchParams): string[] | null => {
    const isMultiH2H = p.get('h2h')?.toLowerCase() === 'multi';
    const mRaw = p.get('m');
    const compareRaw = p.get('compare');
    const raw = (isMultiH2H && mRaw) ? mRaw : compareRaw;
    if (!raw) return null;
    const parts = safeDecodeURI(raw)
      .split(/[:,-]/)
      .map(part => part.trim())
      .filter(Boolean);
    return parts.length >= 2 ? parts : null;
  };

  return parse(params.search) || parse(params.hash);
}

/**
 * Extracts ?record=id query parameter from search or hash for Hall of Fame deep-linking
 */
export function getRecordParamFromURL(customUrl?: string): string | null {
  const val = getURLParam('record', customUrl);
  return val ? val.trim() : null;
}

/**
 * Extracts ?q= query parameter from search or hash for Hall of Fame search
 */
export function getSearchParamFromURL(customUrl?: string): string | null {
  const val = getURLParam('q', customUrl) || getURLParam('search', customUrl) || getURLParam('query', customUrl);
  return val ? val.trim() : null;
}

export type MainViewTab = 'albo' | 'seasons' | 'records';

/**
 * Extracts ?tab=albo|seasons|records from search or hash.
 * Defaults to 'records' if ?record= is present, and 'seasons' if ?season= is present.
 */
export function getMainTabParamFromURL(customUrl?: string): MainViewTab | null {
  const params = getURLSearchParams(customUrl);
  if (!params) return null;

  const checkTab = (p: URLSearchParams): MainViewTab | null => {
    const tabSearch = p.get('tab')?.toLowerCase();
    if (tabSearch === 'albo' || tabSearch === 'seasons' || tabSearch === 'records') {
      return tabSearch;
    }
    if (p.get('record') || p.get('category') || p.get('cat')) return 'records';
    if (p.get('season')) return 'seasons';
    return null;
  };

  const fromSearch = checkTab(params.search);
  if (fromSearch) return fromSearch;

  // Check bare hash (#albo, #seasons, #records)
  let rawHash = '';
  if (customUrl) {
    try {
      rawHash = new URL(customUrl, 'https://example.com').hash;
    } catch {
      // ignore
    }
  } else if (typeof window !== 'undefined' && window.location) {
    rawHash = window.location.hash || '';
  }
  const cleanHash = rawHash.replace(/^#\/?/, '').split('?')[0].toLowerCase();
  if (cleanHash === 'albo' || cleanHash === 'seasons' || cleanHash === 'records') {
    return cleanHash;
  }

  return checkTab(params.hash);
}

/**
 * Extracts ?season=YYYY-YY or ?season=YYYY/YY from search or hash
 */
export function getSeasonParamFromURL(customUrl?: string): string | null {
  const val = getURLParam('season', customUrl);
  if (!val) return null;
  return val.trim().replace('-', '/');
}

const VALID_RECORD_CATEGORIES = new Set<RecordCategory | 'all'>([
  'all',
  'points',
  'titles',
  'h2h',
  'streaks',
  'banter'
]);

/**
 * Extracts and validates ?category= or ?cat= parameter from URL search or hash
 * Supports exact technical IDs: 'all' | 'points' | 'titles' | 'h2h' | 'streaks' | 'banter'
 */
export function getRecordCategoryParamFromURL(customUrl?: string): RecordCategory | 'all' | null {
  const raw = (getURLParam('category', customUrl) || getURLParam('cat', customUrl))?.trim().toLowerCase();
  if (!raw) return null;
  if (VALID_RECORD_CATEGORIES.has(raw as RecordCategory | 'all')) {
    return raw as RecordCategory | 'all';
  }
  return null;
}

const VALID_TROPHY_KEYS = new Set(['seasons', 'scudetti', 'cups', 'mundialito', 'spoons', 'cartonato']);

/**
 * Extracts and validates ?trophy= parameter from URL search or hash
 * Supports: 'seasons' | 'scudetti' | 'cups' | 'mundialito' | 'spoons' | 'cartonato'
 */
export function getTrophyParamFromURL(customUrl?: string): { trophy: TrophyModalKey; sub?: CupSubTab } | null {
  const raw = getURLParam('trophy', customUrl)?.trim().toLowerCase();
  if (!raw || !VALID_TROPHY_KEYS.has(raw)) return null;
  const subRaw = getURLParam('sub', customUrl)?.trim().toLowerCase();
  const sub = (subRaw === 'supercoppa' || subRaw === 'coppa') ? (subRaw as CupSubTab) : undefined;
  return { trophy: raw as TrophyModalKey, sub };
}

/**
 * Extracts ?team= query parameter from search or hash for TeamMatchesModal deep-linking
 */
export function getTeamParamFromURL(customUrl?: string): string | null {
  const raw = getURLParam('team', customUrl);
  return raw ? safeDecodeURI(raw).trim() : null;
}

/**
 * Extracts ?view= query parameter ('real' | 'merit') from search or hash for Live Standings
 */
export function getViewParamFromURL(customUrl?: string): 'real' | 'merit' | null {
  const raw = getURLParam('view', customUrl)?.trim().toLowerCase();
  if (raw === 'merit' || raw === 'real') return raw;
  return null;
}
