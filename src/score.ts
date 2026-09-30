import { Manager, SortMode } from './types';
import { SCORING_WEIGHTS } from './config';
import { state } from './state';

/**
 * Calculates weighted historical palmares rating for a manager
 * @param m - Manager entity
 * @returns Weighted historical score
 */
export function calculateManagerScore(m: Manager): number {
  return (
    (m.gold || 0) * SCORING_WEIGHTS.gold +
    (m.cup_gold || 0) * SCORING_WEIGHTS.cup_gold +
    (m.supercup || 0) * SCORING_WEIGHTS.supercup +
    (m.mundialito || 0) * SCORING_WEIGHTS.mundialito +
    (m.silver || 0) * SCORING_WEIGHTS.silver +
    (m.cup_silver || 0) * SCORING_WEIGHTS.cup_silver +
    (m.bronze || 0) * SCORING_WEIGHTS.bronze +
    (m.spoon || 0) * SCORING_WEIGHTS.spoon +
    (m.cartonato || 0) * SCORING_WEIGHTS.cartonato
  );
}

/**
 * Formats score into an integer if whole or rounded up to 2 decimal places
 * @param val - Numeric score
 * @returns Formatted numeric score
 */
export function formatScore(val: number): number {
  return Number.isInteger(val) ? val : parseFloat(val.toFixed(2));
}

/**
 * Returns a sorted shallow copy of managers based on the given sort mode
 * @param managers - Array of managers to sort (defaults to state.managers)
 * @param sortMode - Sorting strategy (defaults to state.currentSort)
 * @returns Sorted array of managers
 */
export function getSortedManagers(
  managers: Manager[] = state.managers,
  sortMode: SortMode = state.currentSort
): Manager[] {
  const list = [...managers];

  switch (sortMode) {
    case 'trophies_desc':
    case 'total':
      list.sort((a, b) => {
        const totA = (a.gold || 0) + (a.cup_gold || 0) + (a.supercup || 0) + (a.mundialito || 0);
        const totB = (b.gold || 0) + (b.cup_gold || 0) + (b.supercup || 0) + (b.mundialito || 0);
        return totB - totA || (b.gold || 0) - (a.gold || 0) || (b.years || 0) - (a.years || 0);
      });
      break;

    case 'rating_desc':
    case 'score':
      list.sort((a, b) => {
        const scoreA = calculateManagerScore(a);
        const scoreB = calculateManagerScore(b);
        return scoreB - scoreA || (b.gold || 0) - (a.gold || 0) || (b.years || 0) - (a.years || 0);
      });
      break;

    case 'scudetti_desc':
    case 'gold':
      list.sort(
        (a, b) =>
          (b.gold || 0) - (a.gold || 0) ||
          (b.silver || 0) - (a.silver || 0) ||
          (b.years || 0) - (a.years || 0)
      );
      break;

    case 'name':
      list.sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
      break;

    case 'years_desc':
      list.sort((a, b) => (b.years || 0) - (a.years || 0) || (b.gold || 0) - (a.gold || 0));
      break;

    case 'mundialito_desc':
      list.sort((a, b) => (b.mundialito || 0) - (a.mundialito || 0));
      break;

    case 'spoons_desc':
      list.sort((a, b) => (b.spoon || 0) - (a.spoon || 0));
      break;

    case 'cartonato_desc':
    case 'cartonato':
      list.sort((a, b) => (b.cartonato || 0) - (a.cartonato || 0));
      break;

    default:
      break;
  }

  return list;
}
