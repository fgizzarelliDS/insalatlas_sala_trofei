import { AppState, LiveSeasonDetails } from '@/types';
import { DEFAULT_TITLES, LEAGUE } from '@/config';

const isMobileDevice = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 767px)').matches;

export const state: AppState = {
  managers: [],
  competitions: [],
  currentTheme: LEAGUE.defaultTheme || 'gazzetta',
  currentSort: 'trophies_desc',
  displayMode: isMobileDevice ? 'compact' : 'multiple',
  isEditMode: false,
  selectedManagerId: null,
  titles: { ...DEFAULT_TITLES }
};

let cachedLiveSeasonDetails: LiveSeasonDetails | null = null;

/**
 * Returns currently cached live season details (if any)
 */
export function getLiveSeasonDetails(): LiveSeasonDetails | null {
  return cachedLiveSeasonDetails;
}

/**
 * Sets or overrides cached live season details
 */
export function setLiveSeasonDetails(details: LiveSeasonDetails | null): void {
  cachedLiveSeasonDetails = details;
}

