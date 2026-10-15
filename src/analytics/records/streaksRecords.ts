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
      .filter(h => !h.in_progress && h.status !== 'in_progress')
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
    const completed = (m.history || []).filter(h => !h.in_progress && h.status !== 'in_progress').length;

    if (completed > 0) {
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);

      allVeterans.push({
        managerId: m.id,
        managerName: m.name,
        seasons: completed,
        completedSeasons: completed,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: completed,
          formattedValue: `${completed} Edizioni`,
          detail: `${completed} stagioni concluse`
        }
      });
    }
  });

  allVeterans.sort((a, b) => b.completedSeasons - a.completedSeasons);

  if (allVeterans.length > 0) {
    const maxSeasons = allVeterans[0].completedSeasons;
    const topTied = allVeterans.filter(v => v.completedSeasons === maxSeasons);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allVeterans
      .filter(v => v.completedSeasons < maxSeasons)
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

  // -------------------------------------------------------------
  // Record 4.3: La Grande Rimonta (Scalata Stagionale)
  // -------------------------------------------------------------
  const parseStartYear = (s: string) => {
    const match = s.match(/^(\d{4})\/(\d{2})$/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const allClimbs: {
    managerId: string;
    climb: number;
    toSeason: string;
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    const sortedHistory = [...(m.history || [])]
      .filter(h => !h.in_progress && h.status !== 'in_progress')
      .sort((a, b) => a.season.localeCompare(b.season));

    let bestMgrClimb = 0;
    let bestMgrEntry: {
      climb: number;
      fromSeason: string;
      toSeason: string;
      fromRank: number;
      toRank: number;
      team: string;
    } | null = null;

    for (let i = 1; i < sortedHistory.length; i++) {
      const prev = sortedHistory[i - 1];
      const curr = sortedHistory[i];

      const prevRank = typeof prev.rank === 'number' ? prev.rank : 0;
      const currRank = typeof curr.rank === 'number' ? curr.rank : 0;

      if (prevRank > 0 && currRank > 0) {
        const yearDiff = parseStartYear(curr.season) - parseStartYear(prev.season);
        if (yearDiff === 1) {
          const climb = prevRank - currRank;
          if (climb > bestMgrClimb) {
            bestMgrClimb = climb;
            bestMgrEntry = {
              climb,
              fromSeason: prev.season,
              toSeason: curr.season,
              fromRank: prevRank,
              toRank: currRank,
              team: curr.team || ''
            };
          }
        }
      }
    }

    if (bestMgrEntry && bestMgrClimb > 0) {
      const crest = resolveManagerRecordCrest(m.id, bestMgrEntry.toSeason, bestMgrEntry.team, managers, competitions);
      allClimbs.push({
        managerId: m.id,
        climb: bestMgrClimb,
        toSeason: bestMgrEntry.toSeason,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          season: bestMgrEntry.toSeason,
          value: bestMgrClimb,
          formattedValue: `+${bestMgrClimb} Posizioni`,
          detail: `dal ${bestMgrEntry.fromRank}° (${bestMgrEntry.fromSeason}) al ${bestMgrEntry.toRank}° posto (${bestMgrEntry.toSeason})`
        }
      });
    }
  });

  allClimbs.sort((a, b) => b.climb - a.climb);

  if (allClimbs.length > 0) {
    const maxClimb = allClimbs[0].climb;
    const topTied = allClimbs.filter(c => c.climb === maxClimb);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allClimbs
      .filter(c => c.climb < maxClimb)
      .slice(0, 2)
      .map(c => c.holder);

    records.push({
      id: 'biggest_season_climb',
      title: 'La Grande Rimonta (Scalata Stagionale)',
      category: 'streaks',
      icon: 'fa-solid fa-arrow-trend-up',
      watermark: '📈',
      badgeLabel: 'Scalata Epica',
      badgeColor: 'emerald',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il maggior salto in avanti di posizioni in classifica da una stagione all’altra della Serie Atlas.'
    });
  }

  return records;
}

