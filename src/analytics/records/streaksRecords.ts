import type { Manager, CompetitionRecord, LeagueRecord, RecordHolder } from '@/types';
import { resolveManagerRecordCrest } from './helpers';

/**
 * Computes all records in the 'streaks' category:
 * - Consecutive podium streak (top 3)
 * - Historical loyalty (most seasons in the league, with all tied leaders together)
 */
export function computeStreaksRecords(
  managers: Manager[],
  competitions: CompetitionRecord[]
): LeagueRecord[] {
  const records: LeagueRecord[] = [];

  // -------------------------------------------------------------
  // Record 4.1: Striscia Podi Consecutivi (Top 3)
  // -------------------------------------------------------------
  const allStreaks: {
    managerId: string;
    managerName: string;
    maxStreak: number;
    streakSpan: string;
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    const sortedHistory = [...(m.history || [])]
      .filter(h => !h.in_progress && h.season !== '2026/27')
      .sort((a, b) => a.season.localeCompare(b.season));

    let currentStreak = 0;
    let maxStreak = 0;
    let currentStart = '';
    let currentEnd = '';
    let bestStart = '';
    let bestEnd = '';

    sortedHistory.forEach(h => {
      const isPodium = typeof h.rank === 'number' && h.rank >= 1 && h.rank <= 3;
      if (isPodium) {
        if (currentStreak === 0) currentStart = h.season;
        currentStreak += 1;
        currentEnd = h.season;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          bestStart = currentStart;
          bestEnd = currentEnd;
        }
      } else {
        currentStreak = 0;
      }
    });

    if (maxStreak >= 2) {
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);
      allStreaks.push({
        managerId: m.id,
        managerName: m.name,
        maxStreak,
        streakSpan: bestStart === bestEnd ? bestStart : `${bestStart} → ${bestEnd}`,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: maxStreak,
          formattedValue: `${maxStreak} Anni di Fila`,
          detail: bestStart === bestEnd ? bestStart : `${bestStart} → ${bestEnd}`
        }
      });
    }
  });

  allStreaks.sort((a, b) => b.maxStreak - a.maxStreak);

  if (allStreaks.length > 0) {
    const maxStreakVal = allStreaks[0].maxStreak;
    const topTied = allStreaks.filter(s => s.maxStreak === maxStreakVal);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allStreaks
      .filter(s => s.maxStreak < maxStreakVal)
      .slice(0, 2)
      .map(s => s.holder);

    records.push({
      id: 'consecutive_podium_streak',
      title: 'Striscia Podi Consecutivi (Top 3)',
      category: 'streaks',
      icon: 'fa-solid fa-fire',
      watermark: '🔥',
      badgeLabel: 'Continuità Assoluta',
      badgeColor: 'amber',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il maggior numero di stagioni consecutive concluse sempre nelle prime tre posizioni del campionato.'
    });
  }

  // -------------------------------------------------------------
  // Record 4.2: Fedeltà Storica (Presenze in Lega)
  // Supporta tutti i co-primatisti a pari merito (es. i 4 veterani a 10 stagioni)
  // -------------------------------------------------------------
  const allVeterans: {
    managerId: string;
    managerName: string;
    seasons: number;
    completedSeasons: number;
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    const seasons = m.years || 0;
    const completed = (m.history || []).filter(h => !h.in_progress && h.season !== '2026/27').length;

    if (seasons > 0) {
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);
      allVeterans.push({
        managerId: m.id,
        managerName: m.name,
        seasons,
        completedSeasons: completed,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: seasons,
          formattedValue: `${seasons} Edizioni`,
          detail: `${completed} concluse + 1 in corso`
        }
      });
    }
  });

  allVeterans.sort((a, b) => b.seasons - a.seasons || b.completedSeasons - a.completedSeasons);

  if (allVeterans.length > 0) {
    const maxSeasons = allVeterans[0].seasons;
    const topTied = allVeterans.filter(v => v.seasons === maxSeasons);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allVeterans
      .filter(v => v.seasons < maxSeasons)
      .slice(0, 2)
      .map(v => v.holder);

    records.push({
      id: 'most_seasons_loyalty',
      title: 'Fedeltà Storica (Presenze in Lega)',
      category: 'streaks',
      icon: 'fa-solid fa-hourglass-half',
      watermark: '🤝',
      badgeLabel: 'Veterani di Lega',
      badgeColor: 'emerald',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'I pilastri della Serie Atlas: gli allenatori con il maggior numero complessivo di partecipazioni ufficiali.'
    });
  }

  return records;
}
