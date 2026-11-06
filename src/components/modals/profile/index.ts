import type { Manager } from '@/types';
import { state } from '@/state';
import { populatePalmaresDOM } from './PalmaresTab';
import { populateCareerTimeline } from './CareerTab';
import { populateProfileBadgesDOM } from './ProfileBadgesTab';
import { populateTacticalProfileDOM } from './ProfileTacticalTab';

export * from './SparklineChart';
export * from './CareerTab';
export * from './PalmaresTab';
export * from './EloUpsetsCard';
export * from './ProfileBadgesTab';
export * from './ProfileTacticalTab';

/**
 * Updates DOM elements for vital stats, badges, trophy shelf, career timeline, and Hall of Fame badges inside the profile modal
 */
export function populateProfileModalDOM(m: Manager, score: number, totalMajor: number, successRate: number): void {
  populatePalmaresDOM(m, score, totalMajor, successRate);
  populateTacticalProfileDOM(m, state.managers || []);
  populateCareerTimeline(m);
  populateProfileBadgesDOM(m, state.managers || []);
}
