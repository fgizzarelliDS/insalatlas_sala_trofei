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
