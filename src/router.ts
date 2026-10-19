import type { Manager, RecordCategory } from '@/types';
import type { TrophyModalKey, CupSubTab } from '@/components/modals/trophy';
import { state } from '@/state';

/**
 * Looks up a manager by id or name with fuzzy resilience
 * Handles with or without 'm_' prefix, URL-encoded chars, case insensitivity and name normalization
 */
export function findManagerByParam(param: string, managers: Manager[] = state.managers): Manager | undefined {
  if (!param) return undefined;
  const clean = decodeURIComponent(param).trim().toLowerCase();
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
  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      const fromSearch = url.searchParams.get('manager');
      if (fromSearch) return fromSearch.trim();

      if (url.hash && url.hash.includes('manager=')) {
        const hashQuery = url.hash.slice(url.hash.indexOf('?'));
        const hashParams = new URLSearchParams(hashQuery);
        const fromHash = hashParams.get('manager');
        if (fromHash) return fromHash.trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  const fromSearch = searchParams.get('manager');
  if (fromSearch) return fromSearch.trim();

  if (window.location && window.location.hash && window.location.hash.includes('manager=')) {
    const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?'));
    const hashParams = new URLSearchParams(hashQuery);
    const fromHash = hashParams.get('manager');
    if (fromHash) return fromHash.trim();
  }

  return null;
}

/**
 * Extracts ?h2h=idA:idB query parameter from search or hash
 */
export function getH2HParamFromURL(customUrl?: string): { managerA: string; managerB: string } | null {
  const parseRaw = (raw: string | null): { managerA: string; managerB: string } | null => {
    if (!raw) return null;
    const decoded = decodeURIComponent(raw).trim();
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
  };

  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      const fromSearch = parseRaw(url.searchParams.get('h2h'));
      if (fromSearch) return fromSearch;

      if (url.hash && url.hash.includes('h2h=')) {
        const hashQuery = url.hash.slice(url.hash.indexOf('?'));
        const hashParams = new URLSearchParams(hashQuery);
        return parseRaw(hashParams.get('h2h'));
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  let parsed = parseRaw(searchParams.get('h2h'));
  if (parsed) return parsed;

  if (window.location && window.location.hash && window.location.hash.includes('h2h=')) {
    const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?'));
    const hashParams = new URLSearchParams(hashQuery);
    parsed = parseRaw(hashParams.get('h2h'));
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Extracts multi-manager comparison parameters (?h2h=multi&m=id1:id2:id3 or ?compare=id1:id2:id3)
 */
export function getMultiH2HParamFromURL(customUrl?: string): string[] | null {
  const parse = (params: URLSearchParams): string[] | null => {
    const isMultiH2H = params.get('h2h')?.toLowerCase() === 'multi';
    const mRaw = params.get('m');
    const compareRaw = params.get('compare');
    const raw = (isMultiH2H && mRaw) ? mRaw : compareRaw;
    if (!raw) return null;
    const parts = decodeURIComponent(raw)
      .split(/[:,-]/)
      .map(p => p.trim())
      .filter(Boolean);
    return parts.length >= 2 ? parts : null;
  };

  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      const fromSearch = parse(url.searchParams);
      if (fromSearch) return fromSearch;
      if (url.hash && url.hash.includes('?')) {
        const hashParams = new URLSearchParams(url.hash.slice(url.hash.indexOf('?')));
        return parse(hashParams);
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  const fromSearch = parse(searchParams);
  if (fromSearch) return fromSearch;

  if (window.location && window.location.hash && window.location.hash.includes('?')) {
    const hashParams = new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?')));
    return parse(hashParams);
  }

  return null;
}

/**
 * Extracts ?record=id query parameter from search or hash for Hall of Fame deep-linking
 */
export function getRecordParamFromURL(customUrl?: string): string | null {
  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      const fromSearch = url.searchParams.get('record');
      if (fromSearch) return fromSearch.trim();

      if (url.hash && url.hash.includes('record=')) {
        const hashQuery = url.hash.slice(url.hash.indexOf('?'));
        const hashParams = new URLSearchParams(hashQuery);
        const fromHash = hashParams.get('record');
        if (fromHash) return fromHash.trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  const fromSearch = searchParams.get('record');
  if (fromSearch) return fromSearch.trim();

  if (window.location && window.location.hash && window.location.hash.includes('record=')) {
    const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?'));
    const hashParams = new URLSearchParams(hashQuery);
    const fromHash = hashParams.get('record');
    if (fromHash) return fromHash.trim();
  }

  return null;
}

/**
 * Extracts ?q= query parameter from search or hash for Hall of Fame search
 */
export function getSearchParamFromURL(customUrl?: string): string | null {
  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      const fromSearch = url.searchParams.get('q') || url.searchParams.get('search') || url.searchParams.get('query');
      if (fromSearch) return fromSearch.trim();

      if (url.hash && (url.hash.includes('q=') || url.hash.includes('search=') || url.hash.includes('query='))) {
        const hashQuery = url.hash.slice(url.hash.indexOf('?'));
        const hashParams = new URLSearchParams(hashQuery);
        const fromHash = hashParams.get('q') || hashParams.get('search') || hashParams.get('query');
        if (fromHash) return fromHash.trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  const fromSearch = searchParams.get('q') || searchParams.get('search') || searchParams.get('query');
  if (fromSearch) return fromSearch.trim();

  if (window.location && window.location.hash && (window.location.hash.includes('q=') || window.location.hash.includes('search=') || window.location.hash.includes('query='))) {
    const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?'));
    const hashParams = new URLSearchParams(hashQuery);
    const fromHash = hashParams.get('q') || hashParams.get('search') || hashParams.get('query');
    if (fromHash) return fromHash.trim();
  }

  return null;
}

export type MainViewTab = 'albo' | 'seasons' | 'records';

/**
 * Extracts ?tab=albo|seasons|records from search or hash.
 * Defaults to 'records' if ?record= is present, and 'seasons' if ?season= is present.
 */
export function getMainTabParamFromURL(customUrl?: string): MainViewTab | null {
  const getParam = (search: string, hash: string): MainViewTab | null => {
    const searchParams = new URLSearchParams(search);
    const tabSearch = searchParams.get('tab')?.toLowerCase();
    if (tabSearch === 'albo' || tabSearch === 'seasons' || tabSearch === 'records') {
      return tabSearch;
    }
    if (searchParams.get('record') || searchParams.get('category') || searchParams.get('cat')) return 'records';
    if (searchParams.get('season')) return 'seasons';

    if (hash) {
      const cleanHash = hash.replace(/^#\/?/, '').toLowerCase();
      if (cleanHash === 'albo' || cleanHash === 'seasons' || cleanHash === 'records') {
        return cleanHash;
      }
      if (hash.includes('?')) {
        const hashQuery = hash.slice(hash.indexOf('?'));
        const hashParams = new URLSearchParams(hashQuery);
        const tabHash = hashParams.get('tab')?.toLowerCase();
        if (tabHash === 'albo' || tabHash === 'seasons' || tabHash === 'records') {
          return tabHash;
        }
        if (hashParams.get('record') || hashParams.get('category') || hashParams.get('cat')) return 'records';
        if (hashParams.get('season')) return 'seasons';
      }
    }
    return null;
  };

  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      return getParam(url.search, url.hash);
    } catch {
      return null;
    }
  }

  if (typeof window === 'undefined') return null;
  return getParam(window.location.search, window.location.hash);
}

/**
 * Extracts ?season=YYYY-YY or ?season=YYYY/YY from search or hash
 */
export function getSeasonParamFromURL(customUrl?: string): string | null {
  const extract = (params: URLSearchParams): string | null => {
    const s = params.get('season');
    if (!s) return null;
    return s.trim().replace('-', '/');
  };

  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      const val = extract(url.searchParams);
      if (val) return val;
      if (url.hash && url.hash.includes('?')) {
        const hashParams = new URLSearchParams(url.hash.slice(url.hash.indexOf('?')));
        return extract(hashParams);
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof window === 'undefined') return null;
  const val = extract(new URLSearchParams(window.location.search));
  if (val) return val;
  if (window.location.hash && window.location.hash.includes('?')) {
    const hashParams = new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?')));
    return extract(hashParams);
  }
  return null;
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
  const extract = (params: URLSearchParams): RecordCategory | 'all' | null => {
    const raw = (params.get('category') || params.get('cat'))?.trim().toLowerCase();
    if (!raw) return null;
    if (VALID_RECORD_CATEGORIES.has(raw as RecordCategory | 'all')) {
      return raw as RecordCategory | 'all';
    }
    return null;
  };

  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      const val = extract(url.searchParams);
      if (val) return val;
      if (url.hash && url.hash.includes('?')) {
        const hashParams = new URLSearchParams(url.hash.slice(url.hash.indexOf('?')));
        return extract(hashParams);
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof window === 'undefined') return null;
  const val = extract(new URLSearchParams(window.location.search));
  if (val) return val;
  if (window.location && window.location.hash && window.location.hash.includes('?')) {
    const hashParams = new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?')));
    return extract(hashParams);
  }
  return null;
}

const VALID_TROPHY_KEYS = new Set(['seasons', 'scudetti', 'cups', 'mundialito', 'spoons', 'cartonato']);

/**
 * Extracts and validates ?trophy= parameter from URL search or hash
 * Supports: 'seasons' | 'scudetti' | 'cups' | 'mundialito' | 'spoons' | 'cartonato'
 */
export function getTrophyParamFromURL(customUrl?: string): { trophy: TrophyModalKey; sub?: CupSubTab } | null {
  const extract = (params: URLSearchParams): { trophy: TrophyModalKey; sub?: CupSubTab } | null => {
    const raw = params.get('trophy')?.trim().toLowerCase();
    if (!raw || !VALID_TROPHY_KEYS.has(raw)) return null;
    const subRaw = params.get('sub')?.trim().toLowerCase();
    const sub = (subRaw === 'supercoppa' || subRaw === 'coppa') ? (subRaw as CupSubTab) : undefined;
    return { trophy: raw as TrophyModalKey, sub };
  };

  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      const val = extract(url.searchParams);
      if (val) return val;
      if (url.hash && url.hash.includes('?')) {
        const hashParams = new URLSearchParams(url.hash.slice(url.hash.indexOf('?')));
        return extract(hashParams);
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof window === 'undefined') return null;
  const val = extract(new URLSearchParams(window.location.search));
  if (val) return val;
  if (window.location && window.location.hash && window.location.hash.includes('?')) {
    const hashParams = new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?')));
    return extract(hashParams);
  }
  return null;
}

/**
 * Extracts ?team= query parameter from search or hash for TeamMatchesModal deep-linking
 */
export function getTeamParamFromURL(customUrl?: string): string | null {
  const extract = (params: URLSearchParams): string | null => {
    const raw = params.get('team');
    return raw ? decodeURIComponent(raw).trim() : null;
  };

  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      const val = extract(url.searchParams);
      if (val) return val;
      if (url.hash && url.hash.includes('?')) {
        const hashParams = new URLSearchParams(url.hash.slice(url.hash.indexOf('?')));
        return extract(hashParams);
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof window === 'undefined') return null;
  const val = extract(new URLSearchParams(window.location.search));
  if (val) return val;
  if (window.location && window.location.hash && window.location.hash.includes('?')) {
    const hashParams = new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?')));
    return extract(hashParams);
  }
  return null;
}

/**
 * Extracts ?view= query parameter ('real' | 'merit') from search or hash for Live Standings
 */
export function getViewParamFromURL(customUrl?: string): 'real' | 'merit' | null {
  const extract = (params: URLSearchParams): 'real' | 'merit' | null => {
    const raw = params.get('view')?.trim().toLowerCase();
    if (raw === 'merit' || raw === 'real') return raw;
    return null;
  };

  if (customUrl) {
    try {
      const url = new URL(customUrl, 'https://example.com');
      const val = extract(url.searchParams);
      if (val) return val;
      if (url.hash && url.hash.includes('?')) {
        const hashParams = new URLSearchParams(url.hash.slice(url.hash.indexOf('?')));
        return extract(hashParams);
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof window === 'undefined') return null;
  const val = extract(new URLSearchParams(window.location.search));
  if (val) return val;
  if (window.location && window.location.hash && window.location.hash.includes('?')) {
    const hashParams = new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?')));
    return extract(hashParams);
  }
  return null;
}


