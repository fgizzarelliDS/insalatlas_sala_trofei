import type { Manager, CompetitionRecord, LeagueRecord, RecordCategory } from '@/types';
import { computePointsRecords } from './pointsRecords';
import { computeTitlesRecords } from './titlesRecords';
import { computeH2HRecords } from './h2hRecords';
import { computeStreaksRecords } from './streaksRecords';
import { computeBanterRecords } from './banterRecords';

export * from './types';
export * from './helpers';
export * from './pointsRecords';
export * from './titlesRecords';
export * from './h2hRecords';
export * from './streaksRecords';
export * from './banterRecords';

/**
 * Computes all official all-time League Records across the 5 canonical categories:
 * 1. Punti & Podi ('points')
 * 2. Dominio & Coppe ('titles')
 * 3. Rivalità H2H ('h2h')
 * 4. Strisce & Fedeltà ('streaks')
 * 5. Disonori & Curiosità ('banter')
 */
export function computeAllLeagueRecords(
  managers: Manager[],
  competitions: CompetitionRecord[]
): LeagueRecord[] {
  const points = computePointsRecords(managers, competitions);
  const titles = computeTitlesRecords(managers, competitions);
  const h2h = computeH2HRecords(managers, competitions);
  const streaks = computeStreaksRecords(managers, competitions);
  const banter = computeBanterRecords(managers, competitions);

  return [...points, ...titles, ...h2h, ...streaks, ...banter];
}

/**
 * Filters the list of records according to the active category pill
 */
export function filterRecordsByCategory(
  records: LeagueRecord[],
  category: RecordCategory | 'all'
): LeagueRecord[] {
  if (category === 'all') return records;
  return records.filter(r => r.category === category);
}
