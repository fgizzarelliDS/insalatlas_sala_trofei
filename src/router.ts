import type { Manager } from '@/types';
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
export function getManagerParamFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  const fromSearch = searchParams.get('manager');
  if (fromSearch) return fromSearch;

  if (window.location.hash.includes('manager=')) {
    const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?'));
    const hashParams = new URLSearchParams(hashQuery);
    return hashParams.get('manager');
  }

  return null;
}

/**
 * Extracts ?h2h=idA:idB query parameter from search or hash
 */
export function getH2HParamFromURL(): { managerA: string; managerB: string } | null {
  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  let raw = searchParams.get('h2h');

  if (!raw && window.location && window.location.hash && window.location.hash.includes('h2h=')) {
    const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?'));
    const hashParams = new URLSearchParams(hashQuery);
    raw = hashParams.get('h2h');
  }

  if (raw && raw.includes(':')) {
    const parts = raw.split(':');
    if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
      return { managerA: parts[0].trim(), managerB: parts[1].trim() };
    }
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

