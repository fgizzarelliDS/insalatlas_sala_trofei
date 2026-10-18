import { Manager, SortMode, CompetitionDefinition } from '@/types';
import { getActiveCompetitions } from '@/config';
import { state } from '@/state';

function getLegacyGold(m: Manager, compId: string): number {
  if (compId === 'championship') return m.gold || 0;
  if (compId === 'cup') return m.cup_gold || 0;
  if (compId === 'supercup') return m.supercup || 0;
  if (compId === 'mundialito') return m.mundialito || 0;
  if (compId === 'spoon') return m.spoon || 0;
  if (compId === 'cartonato') return m.cartonato || 0;
  return (m as unknown as Record<string, number>)[compId] || 0;
}

function getLegacySilver(m: Manager, compId: string): number {
  if (compId === 'championship') return m.silver || 0;
  if (compId === 'cup') return m.cup_silver || 0;
  return (m as unknown as Record<string, number>)[`${compId}_silver`] || 0;
}

function getLegacyBronze(m: Manager, compId: string): number {
  if (compId === 'championship') return m.bronze || 0;
  return (m as unknown as Record<string, number>)[`${compId}_bronze`] || 0;
}

/**
 * Returns trophy count for a given manager and competition, looking in m.trophies or legacy properties
 */
export function getManagerTrophyCount(
  m: Manager,
  compId: string,
  tier: 'gold' | 'silver' | 'bronze' = 'gold'
): number {
  if (tier === 'gold') {
    return m.trophies?.[compId] ?? getLegacyGold(m, compId);
  }
  if (tier === 'silver') {
    return m.trophies?.[`${compId}_silver`] ?? getLegacySilver(m, compId);
  }
  return m.trophies?.[`${compId}_bronze`] ?? getLegacyBronze(m, compId);
}

/**
 * Returns total positive trophies (gold only, excluding dishonor and banners)
 */
export function getManagerTotalTrophies(
  m: Manager,
  registry: CompetitionDefinition[] = getActiveCompetitions()
): number {
  let total = 0;
  for (const comp of registry) {
    if (comp.type === 'dishonor' || comp.type === 'banners') continue;
    total += getManagerTrophyCount(m, comp.id, 'gold');
  }
  return total;
}

/**
 * Calculates weighted historical palmares rating for a manager dynamically from the registry
 * @param m - Manager entity
 * @param registry - Active competitions registry (defaults to getActiveCompetitions())
 * @returns Weighted historical score
 */
export function calculateManagerScore(
  m: Manager,
  registry: CompetitionDefinition[] = getActiveCompetitions()
): number {
  let totalScore = 0;
  for (const comp of registry) {
    const gold = getManagerTrophyCount(m, comp.id, 'gold');
    const silver = getManagerTrophyCount(m, comp.id, 'silver');
    const bronze = getManagerTrophyCount(m, comp.id, 'bronze');

    totalScore +=
      gold * (comp.scoringPoints.gold || 0) +
      silver * (comp.scoringPoints.silver || 0) +
      bronze * (comp.scoringPoints.bronze || 0);
  }
  return totalScore;
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
        const totA = getManagerTotalTrophies(a);
        const totB = getManagerTotalTrophies(b);
        const goldA = getManagerTrophyCount(a, 'championship', 'gold');
        const goldB = getManagerTrophyCount(b, 'championship', 'gold');
        return totB - totA || goldB - goldA || (b.years || 0) - (a.years || 0);
      });
      break;

    case 'rating_desc':
    case 'score':
      list.sort((a, b) => {
        const scoreA = calculateManagerScore(a);
        const scoreB = calculateManagerScore(b);
        const goldA = getManagerTrophyCount(a, 'championship', 'gold');
        const goldB = getManagerTrophyCount(b, 'championship', 'gold');
        return scoreB - scoreA || goldB - goldA || (b.years || 0) - (a.years || 0);
      });
      break;

    case 'scudetti_desc':
    case 'gold':
      list.sort(
        (a, b) =>
          getManagerTrophyCount(b, 'championship', 'gold') - getManagerTrophyCount(a, 'championship', 'gold') ||
          getManagerTrophyCount(b, 'championship', 'silver') - getManagerTrophyCount(a, 'championship', 'silver') ||
          (b.years || 0) - (a.years || 0)
      );
      break;

    case 'name':
      list.sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
      break;

    case 'years_desc':
      list.sort((a, b) => (b.years || 0) - (a.years || 0) || getManagerTrophyCount(b, 'championship', 'gold') - getManagerTrophyCount(a, 'championship', 'gold'));
      break;

    case 'mundialito_desc':
      list.sort((a, b) => getManagerTrophyCount(b, 'mundialito', 'gold') - getManagerTrophyCount(a, 'mundialito', 'gold'));
      break;

    case 'spoons_desc':
      list.sort((a, b) => getManagerTrophyCount(b, 'spoon', 'gold') - getManagerTrophyCount(a, 'spoon', 'gold'));
      break;

    case 'cartonato_desc':
    case 'cartonato':
      list.sort((a, b) => getManagerTrophyCount(b, 'cartonato', 'gold') - getManagerTrophyCount(a, 'cartonato', 'gold'));
      break;

    default: {
      const modeStr = String(sortMode);
      if (modeStr.endsWith('_desc')) {
        const compId = modeStr.replace(/_desc$/, '');
        list.sort((a, b) => getManagerTrophyCount(b, compId, 'gold') - getManagerTrophyCount(a, compId, 'gold'));
      }
      break;
    }
  }

  return list;
}
