import type { Manager } from '@/types';
import { state } from '@/state';
import { populatePalmaresDOM } from './PalmaresTab';
import { populateCareerTimeline } from './CareerTab';
import { populateProfileBadgesDOM } from './ProfileBadgesTab';

export * from './SparklineChart';
export * from './CareerTab';
export * from './PalmaresTab';
export * from './EloUpsetsCard';
export * from './ProfileBadgesTab';

/**
 * Updates DOM elements for vital stats, badges, trophy shelf, career timeline, and Hall of Fame badges inside the profile modal
 */
export function populateProfileModalDOM(m: Manager, score: number, totalMajor: number, successRate: number): void {
  populatePalmaresDOM(m, score, totalMajor, successRate);
  populateCareerTimeline(m);
  populateProfileBadgesDOM(m, state.managers || []);
}
