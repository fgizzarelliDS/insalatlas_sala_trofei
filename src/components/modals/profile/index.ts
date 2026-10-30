import type { Manager } from '@/types';
import { populatePalmaresDOM } from './PalmaresTab';
import { populateCareerTimeline } from './CareerTab';

export * from './SparklineChart';
export * from './CareerTab';
export * from './PalmaresTab';
export * from './EloUpsetsCard';

/**
 * Updates DOM elements for vital stats, badges, trophy shelf, and career timeline inside the profile modal
 */
export function populateProfileModalDOM(m: Manager, score: number, totalMajor: number, successRate: number): void {
  populatePalmaresDOM(m, score, totalMajor, successRate);
  populateCareerTimeline(m);
}
