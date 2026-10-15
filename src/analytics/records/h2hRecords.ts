import type { Manager, CompetitionRecord, LeagueRecord, RecordHolder } from '@/types';
import {
  resolveManagerName,
  getCompletedChampionships,
  resolveManagerRecordCrest
} from './helpers';

/**
 * Computes all records in the 'h2h' (head-to-head) category:
 * - Cappotto Storico (Max seasonal blowout between two managers)
 * - Most frequent rivalry (shared seasons count)
 */
export function computeH2HRecords(
  managers: Manager[],
  competitions: CompetitionRecord[]
): LeagueRecord[] {
  const records: LeagueRecord[] = [];
  const completedChampionships = getCompletedChampionships(competitions);

  // -------------------------------------------------------------
  // Record 3.1: Cappotto Storico H2H (Max Distacco Stagionale)
  // -------------------------------------------------------------
  const allBlowouts: {
    season: string;
    diff: number;
    winner: RecordHolder;
    victim: RecordHolder;
  }[] = [];

  completedChampionships.forEach(c => {
    const s = c.season;
    const r = c.ranking || [];
    for (let i = 0; i < r.length; i++) {
      for (let j = i + 1; j < r.length; j++) {
        const rA = r[i];
        const rB = r[j];
        if (typeof rA.points === 'number' && typeof rB.points === 'number') {
          const diff = Number(Math.abs(rA.points - rB.points).toFixed(1));
          const winnerR = rA.points >= rB.points ? rA : rB;
          const victimR = rA.points >= rB.points ? rB : rA;
          const winnerPts = winnerR.points ?? 0;
          const victimPts = victimR.points ?? 0;

          const winnerCrest = resolveManagerRecordCrest(winnerR.managerId || '', s, winnerR.teamName, managers, competitions);
          const victimCrest = resolveManagerRecordCrest(victimR.managerId || '', s, victimR.teamName, managers, competitions);

          allBlowouts.push({
            season: s,
            diff,
            winner: {
              managerId: winnerR.managerId || '',
              managerName: resolveManagerName(winnerR.managerId, winnerR.coach, managers),
              teamName: winnerCrest.teamName,
              logo: winnerCrest.logo,
              fallbackCrest: winnerCrest.fallbackCrest,
              season: s,
              value: winnerPts,
              formattedValue: `${winnerPts.toFixed(1)} pt`
            },
            victim: {
              managerId: victimR.managerId || '',
              managerName: resolveManagerName(victimR.managerId, victimR.coach, managers),
              teamName: victimCrest.teamName,
              logo: victimCrest.logo,
              fallbackCrest: victimCrest.fallbackCrest,
              season: s,
              value: victimPts,
              formattedValue: `${victimPts.toFixed(1)} pt`
            }
          });
        }
      }
    }
  });

  allBlowouts.sort((a, b) => b.diff - a.diff);

  if (allBlowouts.length > 0) {
    const maxDiff = allBlowouts[0].diff;
    const topTied = allBlowouts.filter(b => b.diff === maxDiff);

    const primaryHolders = topTied.map(t => ({
      ...t.winner,
      value: t.diff,
      formattedValue: `+${t.diff.toFixed(1)} pt`,
      detail: `${t.winner.managerName} (${t.winner.formattedValue}) su ${t.victim.managerName} (${t.victim.formattedValue})`
    }));

    const runnerUps: RecordHolder[] = allBlowouts
      .filter(b => b.diff < maxDiff)
      .slice(0, 2)
      .map(b => ({
        ...b.winner,
        value: b.diff,
        formattedValue: `+${b.diff.toFixed(1)} pt`,
        detail: `${b.winner.managerName} su ${b.victim.managerName} (${b.season})`
      }));

    records.push({
      id: 'biggest_h2h_blowout',
      title: 'Cappotto Storico (Max Distacco H2H)',
      category: 'h2h',
      icon: 'fa-solid fa-skull-crossbones',
      watermark: '💥',
      badgeLabel: 'Abisso in Classifica',
      badgeColor: 'rose',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il maggior divario di punti registrato tra due squadre al termine di una singola stagione di Serie Atlas.'
    });
  }

  // -------------------------------------------------------------
  // Record 3.2: Duello Più Frequente (Rivalità Storica)
  // -------------------------------------------------------------
  const pairMatches: {
    key: string;
    managerA: Manager;
    managerB: Manager;
    sharedSeasons: number;
    matchCount: number;
    holder: RecordHolder;
  }[] = [];

  for (let i = 0; i < managers.length; i++) {
    for (let j = i + 1; j < managers.length; j++) {
      const mA = managers[i];
      const mB = managers[j];

      const seasonsA = new Set((mA.history || []).filter(h => !h.in_progress && h.status !== 'in_progress').map(h => h.season));
      const seasonsB = new Set((mB.history || []).filter(h => !h.in_progress && h.status !== 'in_progress').map(h => h.season));

      let shared = 0;
      let totalGare = 0;
      seasonsA.forEach(s => {
        if (seasonsB.has(s)) {
          shared += 1;
          const comp = completedChampionships.find(c => c.season === s);
          const count = comp?.ranking?.length || 12;
          const roundRobinMatches = count <= 8 ? 5 : count <= 10 ? 4 : count <= 12 ? 3 : 2;
          totalGare += roundRobinMatches;
        }
      });

      if (shared >= 3) {
        const crestA = resolveManagerRecordCrest(mA.id, undefined, undefined, managers, competitions);
        pairMatches.push({
          key: `${mA.id}:${mB.id}`,
          managerA: mA,
          managerB: mB,
          sharedSeasons: shared,
          matchCount: totalGare,
          holder: {
            managerId: mA.id,
            managerName: `${mA.name} vs ${mB.name}`,
            teamName: crestA.teamName,
            logo: crestA.logo,
            fallbackCrest: crestA.fallbackCrest,
            value: shared,
            formattedValue: `${shared} Campionati`,
            detail: `~${totalGare} scontri diretti disputati`
          }
        });
      }
    }
  }

  pairMatches.sort((a, b) => b.sharedSeasons - a.sharedSeasons || b.matchCount - a.matchCount);

  if (pairMatches.length > 0) {
    const maxShared = pairMatches[0].sharedSeasons;
    const topTied = pairMatches.filter(p => p.sharedSeasons === maxShared);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = pairMatches
      .filter(p => p.sharedSeasons < maxShared)
      .slice(0, 2)
      .map(p => p.holder);

    records.push({
      id: 'most_frequent_rivalry',
      title: 'Duello Più Frequente in Serie Atlas',
      category: 'h2h',
      icon: 'fa-solid fa-handshake-angle',
      watermark: '⚔️',
      badgeLabel: 'Classica di Lega',
      badgeColor: 'indigo',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'La rivalità più longeva di sempre: i due allenatori che hanno condiviso più edizioni e battaglie in campionato.'
    });
  }

  return records;
}
