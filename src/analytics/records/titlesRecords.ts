import type { Manager, CompetitionRecord, LeagueRecord, RecordHolder } from '@/types';
import {
  resolveManagerName,
  getCompletedChampionships,
  resolveManagerRecordCrest
} from './helpers';

/**
 * Computes all records in the 'titles' category:
 * - Max title margin (dominance)
 * - Closest title margin (fotofinish)
 * - Closest podium spread (tightest top 3)
 * - Multi-trophy season (triplete / double)
 * - Most scudetti (championship king)
 * - Most cups (lord of cups)
 * - Most podiums (podium regular)
 */
export function computeTitlesRecords(
  managers: Manager[],
  competitions: CompetitionRecord[]
): LeagueRecord[] {
  const records: LeagueRecord[] = [];
  const completedChampionships = getCompletedChampionships(competitions);

  // -------------------------------------------------------------
  // Record 2.1: Vittoria con Maggior Distacco sul Secondo
  // -------------------------------------------------------------
  const seasonMargins: {
    season: string;
    margin: number;
    champ: RecordHolder;
    runnerUp: RecordHolder;
  }[] = [];

  completedChampionships.forEach(c => {
    const r = c.ranking || [];
    const champR = r.find(x => x.rank === 1);
    const runnerR = r.find(x => x.rank === 2);
    if (champR && runnerR && typeof champR.points === 'number' && typeof runnerR.points === 'number') {
      const margin = Number((champR.points - runnerR.points).toFixed(1));
      const champCrest = resolveManagerRecordCrest(champR.managerId || '', c.season, champR.teamName, managers, competitions);
      const runnerCrest = resolveManagerRecordCrest(runnerR.managerId || '', c.season, runnerR.teamName, managers, competitions);

      seasonMargins.push({
        season: c.season,
        margin,
        champ: {
          managerId: champR.managerId || '',
          managerName: resolveManagerName(champR.managerId, champR.coach, managers),
          teamName: champCrest.teamName,
          logo: champCrest.logo,
          fallbackCrest: champCrest.fallbackCrest,
          season: c.season,
          value: margin,
          formattedValue: `+${margin.toFixed(1)} pt`,
          detail: `${champR.points.toFixed(1)} pt vs ${runnerR.points.toFixed(1)} pt`
        },
        runnerUp: {
          managerId: runnerR.managerId || '',
          managerName: resolveManagerName(runnerR.managerId, runnerR.coach, managers),
          teamName: runnerCrest.teamName,
          logo: runnerCrest.logo,
          fallbackCrest: runnerCrest.fallbackCrest,
          season: c.season,
          value: runnerR.points,
          formattedValue: `${runnerR.points.toFixed(1)} pt`
        }
      });
    }
  });

  seasonMargins.sort((a, b) => b.margin - a.margin);

  if (seasonMargins.length > 0) {
    const maxMargin = seasonMargins[0].margin;
    const topTied = seasonMargins.filter(m => m.margin === maxMargin);
    const primaryHolders = topTied.map(t => t.champ);
    const runnerUps = seasonMargins
      .filter(m => m.margin < maxMargin)
      .slice(0, 2)
      .map(m => m.champ);

    records.push({
      id: 'biggest_championship_margin',
      title: 'Vittoria con Maggior Distacco',
      category: 'titles',
      icon: 'fa-solid fa-crown',
      watermark: '🚀',
      badgeLabel: 'Campionato Dominato',
      badgeColor: 'amber',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il maggior vantaggio di punti rifilato al secondo classificato al termine della stagione.'
    });
  }

  // -------------------------------------------------------------
  // Record 2.2: Scudetto al Fotofinish (Minimo Distacco 1°-2°)
  // -------------------------------------------------------------
  const fotofinishMargins = [...seasonMargins].sort((a, b) => a.margin - b.margin);

  if (fotofinishMargins.length > 0) {
    const minMargin = fotofinishMargins[0].margin;
    const topTied = fotofinishMargins.filter(m => m.margin === minMargin);
    const primaryHolders = topTied.map(t => {
      const h = { ...t.champ };
      if (t.margin === 0) {
        h.detail = `Vinto a pari punti (${t.champ.detail}) per scontri diretti`;
      }
      return h;
    });

    const runnerUps = fotofinishMargins
      .filter(m => m.margin > minMargin)
      .slice(0, 2)
      .map(m => m.champ);

    records.push({
      id: 'tightest_championship_finish',
      title: 'Scudetto al Fotofinish',
      category: 'titles',
      icon: 'fa-solid fa-flag-checkered',
      watermark: '🏁',
      badgeLabel: 'Brivido Finale',
      badgeColor: 'emerald',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il titolo deciso con il minor margine di distacco sulla seconda forza del campionato.'
    });
  }

  // -------------------------------------------------------------
  // Record 2.3: Volata Podio Più Serrata (Minimo Distacco 1°-3°)
  // -------------------------------------------------------------
  const podiumSpreads: {
    season: string;
    spread: number;
    champ: RecordHolder;
  }[] = [];

  completedChampionships.forEach(c => {
    const r = c.ranking || [];
    const champR = r.find(x => x.rank === 1);
    const thirdR = r.find(x => x.rank === 3);
    if (champR && thirdR && typeof champR.points === 'number' && typeof thirdR.points === 'number') {
      const spread = Number((champR.points - thirdR.points).toFixed(1));
      const champCrest = resolveManagerRecordCrest(champR.managerId || '', c.season, champR.teamName, managers, competitions);

      podiumSpreads.push({
        season: c.season,
        spread,
        champ: {
          managerId: champR.managerId || '',
          managerName: resolveManagerName(champR.managerId, champR.coach, managers),
          teamName: champCrest.teamName,
          logo: champCrest.logo,
          fallbackCrest: champCrest.fallbackCrest,
          season: c.season,
          value: spread,
          formattedValue: `Δ ${spread.toFixed(1)} pt`,
          detail: `1° (${champR.points.toFixed(1)} pt) a 3° (${thirdR.points.toFixed(1)} pt)`
        }
      });
    }
  });

  podiumSpreads.sort((a, b) => a.spread - b.spread);

  if (podiumSpreads.length > 0) {
    const minSpread = podiumSpreads[0].spread;
    const topTied = podiumSpreads.filter(p => p.spread === minSpread);
    const primaryHolders = topTied.map(t => t.champ);
    const runnerUps = podiumSpreads
      .filter(p => p.spread > minSpread)
      .slice(0, 2)
      .map(p => p.champ);

    records.push({
      id: 'tightest_podium_race',
      title: 'Volata Podio Più Serrata',
      category: 'titles',
      icon: 'fa-solid fa-ranking-star',
      watermark: '🥉',
      badgeLabel: 'Tricolore in Bagarre',
      badgeColor: 'blue',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il podio più raccolto di sempre: il minimo distacco di punti tra la prima e la terza classificata.'
    });
  }

  // -------------------------------------------------------------
  // Record 2.4: Stagione da Triplete (Multi-Titoli nello stesso anno)
  // -------------------------------------------------------------
  const multiTrophySeasons: {
    managerId: string;
    managerName: string;
    teamName: string;
    season: string;
    trophiesCount: number;
    trophiesList: string[];
    holder: RecordHolder;
  }[] = [];

  const completedSeasons = Array.from(new Set(completedChampionships.map(c => c.season)));

  completedSeasons.forEach(s => {
    const comps = (competitions || []).filter(c => c.season === s && !c.in_progress && c.status !== 'in_progress');
    const seasonWinnersMap = new Map<string, { count: number; titles: string[]; coach: string; team: string }>();

    comps.forEach(comp => {
      const winner = (comp.ranking || []).find(r => r.rank === 1);
      if (winner && winner.managerId) {
        const id = winner.managerId;
        const entry = seasonWinnersMap.get(id) || { count: 0, titles: [], coach: winner.coach, team: winner.teamName };
        entry.count += 1;
        entry.titles.push(comp.name || comp.category || 'Trofeo');
        if (winner.teamName) entry.team = winner.teamName;
        seasonWinnersMap.set(id, entry);
      }
    });

    seasonWinnersMap.forEach((data, managerId) => {
      if (data.count >= 2) {
        const crest = resolveManagerRecordCrest(managerId, s, data.team, managers, competitions);
        multiTrophySeasons.push({
          managerId,
          managerName: resolveManagerName(managerId, data.coach, managers),
          teamName: crest.teamName,
          season: s,
          trophiesCount: data.count,
          trophiesList: data.titles,
          holder: {
            managerId,
            managerName: resolveManagerName(managerId, data.coach, managers),
            teamName: crest.teamName,
            logo: crest.logo,
            fallbackCrest: crest.fallbackCrest,
            season: s,
            value: data.count,
            formattedValue: `${data.count} Titoli`,
            detail: data.titles.join(' + ')
          }
        });
      }
    });
  });

  multiTrophySeasons.sort((a, b) => b.trophiesCount - a.trophiesCount);

  if (multiTrophySeasons.length > 0) {
    const maxTrophies = multiTrophySeasons[0].trophiesCount;
    const topTied = multiTrophySeasons.filter(m => m.trophiesCount === maxTrophies);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = multiTrophySeasons
      .filter(m => m.trophiesCount < maxTrophies)
      .slice(0, 2)
      .map(m => m.holder);

    records.push({
      id: 'multi_title_season',
      title: 'Stagione da Triplete (Multi-Titoli)',
      category: 'titles',
      icon: 'fa-solid fa-star',
      watermark: '⭐',
      badgeLabel: 'Annata da Sogno',
      badgeColor: 'amber',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il maggior numero di trofei ufficiali (Campionato, Coppe, Supercoppe) vinti nello stesso anno solare.'
    });
  }

  // -------------------------------------------------------------
  // Record 2.5: Re dei Campionati (Pluri-Campione)
  // -------------------------------------------------------------
  const allScudettiHolders: {
    managerId: string;
    managerName: string;
    gold: number;
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    if ((m.gold || 0) > 0) {
      const completed = (m.history || []).filter(h => !h.in_progress && (h as any).status !== 'in_progress').length;
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);
      allScudettiHolders.push({
        managerId: m.id,
        managerName: m.name,
        gold: m.gold || 0,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: m.gold || 0,
          formattedValue: `${m.gold} Scudetti`,
          detail: `su ${completed || 1} stagioni disputate`
        }
      });
    }
  });

  allScudettiHolders.sort((a, b) => b.gold - a.gold);

  if (allScudettiHolders.length > 0) {
    const maxGold = allScudettiHolders[0].gold;
    const topTied = allScudettiHolders.filter(h => h.gold === maxGold);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allScudettiHolders
      .filter(h => h.gold < maxGold)
      .slice(0, 2)
      .map(h => h.holder);

    records.push({
      id: 'most_scudetti',
      title: 'Re dei Campionati (Pluri-Campione)',
      category: 'titles',
      icon: 'fa-solid fa-trophy',
      watermark: '👑',
      badgeLabel: 'Albo d’Oro',
      badgeColor: 'amber',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il fantallenatore più decorato della storia con il maggior numero di titoli della Serie Atlas in bacheca.'
    });
  }

  // -------------------------------------------------------------
  // Record 2.6: Signore delle Coppe (Pluri-Vincitore Coppe & Tornei)
  // -------------------------------------------------------------
  const allCupHolders: {
    managerId: string;
    managerName: string;
    cups: number;
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    const cg = m.cup_gold || 0;
    const sc = m.supercup || 0;
    const mun = m.mundialito || 0;
    const totalCups = cg + sc + mun;

    if (totalCups > 0) {
      const completed = (m.history || []).filter(h => !h.in_progress && (h as any).status !== 'in_progress').length;
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);
      const detailParts: string[] = [];
      if (cg > 0) detailParts.push(`${cg} Coppe`);
      if (sc > 0) detailParts.push(`${sc} Supercoppe`);
      if (mun > 0) detailParts.push(`${mun} Mundialiti`);

      allCupHolders.push({
        managerId: m.id,
        managerName: m.name,
        cups: totalCups,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: totalCups,
          formattedValue: `${totalCups} Coppe`,
          detail: detailParts.join(', ') || `su ${completed || 1} edizioni disputate`
        }
      });
    }
  });

  allCupHolders.sort((a, b) => b.cups - a.cups);

  if (allCupHolders.length > 0) {
    const maxCups = allCupHolders[0].cups;
    const topTied = allCupHolders.filter(h => h.cups === maxCups);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allCupHolders
      .filter(h => h.cups < maxCups)
      .slice(0, 2)
      .map(h => h.holder);

    records.push({
      id: 'most_cups',
      title: 'Signore delle Coppe (Pluri-Vincitore)',
      category: 'titles',
      icon: 'fa-solid fa-trophy',
      watermark: '🏆',
      badgeLabel: 'Re dei Tornei a Eliminazione',
      badgeColor: 'emerald',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Lo specialista delle partite secche e dei tabelloni a eliminazione diretta con più trofei di coppa conquistati (Coppa di Lega, Supercoppa e Mundialito).'
    });
  }

  // -------------------------------------------------------------
  // Record 2.7: Abbonato al Podio (Podi Totali in Carriera)
  // -------------------------------------------------------------
  const allPodiumHolders: {
    managerId: string;
    managerName: string;
    podiums: number;
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    const podiums = (m.gold || 0) + (m.silver || 0) + (m.bronze || 0);
    if (podiums > 0) {
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);
      allPodiumHolders.push({
        managerId: m.id,
        managerName: m.name,
        podiums,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: podiums,
          formattedValue: `${podiums} Podi`,
          detail: `${m.gold || 0} 🥇, ${m.silver || 0} 🥈, ${m.bronze || 0} 🥉`
        }
      });
    }
  });

  allPodiumHolders.sort((a, b) => b.podiums - a.podiums);

  if (allPodiumHolders.length > 0) {
    const maxPodiums = allPodiumHolders[0].podiums;
    const topTied = allPodiumHolders.filter(h => h.podiums === maxPodiums);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allPodiumHolders
      .filter(h => h.podiums < maxPodiums)
      .slice(0, 2)
      .map(h => h.holder);

    records.push({
      id: 'most_podiums',
      title: 'Abbonato al Podio',
      category: 'titles',
      icon: 'fa-solid fa-medal',
      watermark: '🎖️',
      badgeLabel: 'Costanza Vertici',
      badgeColor: 'blue',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il maggior numero complessivo di piazzamenti sul podio (1°, 2° o 3° posto) nella storia della Serie Atlas.'
    });
  }

  // -------------------------------------------------------------
  // Record 2.8: L'Imbattibile (Back-to-Back Scudetti)
  // -------------------------------------------------------------
  const champChronology = [...completedChampionships]
    .sort((a, b) => a.season.localeCompare(b.season))
    .map(c => {
      const champR = (c.ranking || []).find(r => r.rank === 1);
      return {
        season: c.season,
        managerId: champR?.managerId || '',
        coach: champR?.coach || '',
        teamName: champR?.teamName || ''
      };
    })
    .filter(x => x.managerId !== '');

  interface StreakData {
    managerId: string;
    coach: string;
    teamName: string;
    count: number;
    startSeason: string;
    endSeason: string;
  }

  const managerConsecutiveStreaks = new Map<string, StreakData>();

  let currStreak = 0;
  let currMgrId = '';
  let currStartSeason = '';
  let currEndSeason = '';
  let currCoach = '';
  let currTeam = '';

  champChronology.forEach(item => {
    if (item.managerId === currMgrId) {
      currStreak += 1;
      currEndSeason = item.season;
      currTeam = item.teamName;
    } else {
      if (currStreak >= 2 && currMgrId) {
        const existing = managerConsecutiveStreaks.get(currMgrId);
        if (!existing || currStreak > existing.count) {
          managerConsecutiveStreaks.set(currMgrId, {
            managerId: currMgrId,
            coach: currCoach,
            teamName: currTeam,
            count: currStreak,
            startSeason: currStartSeason,
            endSeason: currEndSeason
          });
        }
      }
      currStreak = 1;
      currMgrId = item.managerId;
      currStartSeason = item.season;
      currEndSeason = item.season;
      currCoach = item.coach;
      currTeam = item.teamName;
    }
  });

  if (currStreak >= 2 && currMgrId) {
    const existing = managerConsecutiveStreaks.get(currMgrId);
    if (!existing || currStreak > existing.count) {
      managerConsecutiveStreaks.set(currMgrId, {
        managerId: currMgrId,
        coach: currCoach,
        teamName: currTeam,
        count: currStreak,
        startSeason: currStartSeason,
        endSeason: currEndSeason
      });
    }
  }

  const allConsecutiveHolders = Array.from(managerConsecutiveStreaks.values()).map(s => {
    const crest = resolveManagerRecordCrest(s.managerId, s.endSeason, s.teamName, managers, competitions);
    const spanStr = s.startSeason === s.endSeason ? s.startSeason : `${s.startSeason} e ${s.endSeason}`;
    return {
      managerId: s.managerId,
      count: s.count,
      holder: {
        managerId: s.managerId,
        managerName: resolveManagerName(s.managerId, s.coach, managers),
        teamName: crest.teamName,
        logo: crest.logo,
        fallbackCrest: crest.fallbackCrest,
        season: s.endSeason,
        value: s.count,
        formattedValue: `${s.count} Scudetti di Fila`,
        detail: spanStr
      }
    };
  });

  allConsecutiveHolders.sort((a, b) => b.count - a.count);

  if (allConsecutiveHolders.length > 0) {
    const maxConsecutive = allConsecutiveHolders[0].count;
    const topTied = allConsecutiveHolders.filter(h => h.count === maxConsecutive);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allConsecutiveHolders
      .filter(h => h.count < maxConsecutive)
      .slice(0, 2)
      .map(h => h.holder);

    records.push({
      id: 'consecutive_scudetti',
      title: 'L’Imbattibile (Back-to-Back)',
      category: 'titles',
      icon: 'fa-solid fa-repeat',
      watermark: '👑',
      badgeLabel: 'Scudetti Consecutivi',
      badgeColor: 'amber',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'L’unica storica impresa di chi è riuscito a vincere e difendere il titolo della Serie Atlas per due stagioni consecutive.'
    });
  }

  return records;
}

