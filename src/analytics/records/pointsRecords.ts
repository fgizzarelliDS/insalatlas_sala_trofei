import type { Manager, CompetitionRecord, LeagueRecord, RecordHolder } from '@/types';
import {
  getSeasonMatchdays,
  resolveManagerName,
  getCompletedChampionships,
  resolveManagerRecordCrest
} from './helpers';

/**
 * Computes all records in the 'points' category:
 * - Single-season absolute points record
 * - Lowest points scudetto (cynical champion)
 * - Highest points wooden spoon (honorable last place)
 * - Career best PPG (consistency top >= 3 seasons)
 */
export function computePointsRecords(
  managers: Manager[],
  competitions: CompetitionRecord[]
): LeagueRecord[] {
  const records: LeagueRecord[] = [];
  const completedChampionships = getCompletedChampionships(competitions);

  // -------------------------------------------------------------
  // Record 1.1: Record Punti Singola Stagione
  // -------------------------------------------------------------
  const allSeasonPoints: {
    season: string;
    points: number;
    ppg: number;
    matchdays: number;
    holder: RecordHolder;
  }[] = [];

  completedChampionships.forEach(c => {
    const s = c.season;
    const teamCount = c.ranking?.length || 12;
    const matchdays = getSeasonMatchdays(s, teamCount);

    (c.ranking || []).forEach(r => {
      if (typeof r.points === 'number' && r.points > 0) {
        const ppg = Number((r.points / matchdays).toFixed(3));
        const crest = resolveManagerRecordCrest(r.managerId || '', s, r.teamName, managers, competitions);

        allSeasonPoints.push({
          season: s,
          points: r.points,
          ppg,
          matchdays,
          holder: {
            managerId: r.managerId || '',
            managerName: resolveManagerName(r.managerId, r.coach, managers),
            teamName: crest.teamName,
            logo: crest.logo,
            fallbackCrest: crest.fallbackCrest,
            season: s,
            value: r.points,
            formattedValue: `${r.points.toFixed(1)} pt`,
            normalizedDetail: `${ppg.toFixed(2)} pt/g · ${matchdays} giornate`
          }
        });
      }
    });
  });

  allSeasonPoints.sort((a, b) => b.points - a.points || b.ppg - a.ppg);

  if (allSeasonPoints.length > 0) {
    const maxPts = allSeasonPoints[0].points;
    const topTied = allSeasonPoints.filter(p => p.points === maxPts);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allSeasonPoints
      .filter(p => p.points < maxPts)
      .slice(0, 2)
      .map(p => p.holder);

    records.push({
      id: 'max_single_season_points',
      title: 'Record Punti Singola Stagione',
      category: 'points',
      icon: 'fa-solid fa-bolt',
      watermark: '⚡',
      badgeLabel: 'Punti Assoluti',
      badgeColor: 'amber',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Miglior punteggio assoluto registrato in una singola edizione della Serie Atlas.'
    });
  }

  // -------------------------------------------------------------
  // Record 1.2: Scudetto Più Economico (Min Punti per Vincere)
  // -------------------------------------------------------------
  const allScudettiPoints: {
    season: string;
    points: number;
    ppg: number;
    matchdays: number;
    holder: RecordHolder;
  }[] = [];

  completedChampionships.forEach(c => {
    const s = c.season;
    const teamCount = c.ranking?.length || 12;
    const matchdays = getSeasonMatchdays(s, teamCount);
    const champ = (c.ranking || []).find(r => r.rank === 1);

    if (champ && typeof champ.points === 'number' && champ.points > 0) {
      const ppg = Number((champ.points / matchdays).toFixed(3));
      const crest = resolveManagerRecordCrest(champ.managerId || '', s, champ.teamName, managers, competitions);

      allScudettiPoints.push({
        season: s,
        points: champ.points,
        ppg,
        matchdays,
        holder: {
          managerId: champ.managerId || '',
          managerName: resolveManagerName(champ.managerId, champ.coach, managers),
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          season: s,
          value: champ.points,
          formattedValue: `${champ.points.toFixed(1)} pt`,
          normalizedDetail: `${ppg.toFixed(2)} pt/g · ${matchdays} giornate`
        }
      });
    }
  });

  allScudettiPoints.sort((a, b) => a.points - b.points || a.ppg - b.ppg);

  if (allScudettiPoints.length > 0) {
    const minPts = allScudettiPoints[0].points;
    const topTied = allScudettiPoints.filter(p => p.points === minPts);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allScudettiPoints
      .filter(p => p.points > minPts)
      .slice(0, 2)
      .map(p => p.holder);

    records.push({
      id: 'lowest_points_champion',
      title: 'Scudetto con Meno Punti',
      category: 'points',
      icon: 'fa-solid fa-trophy',
      watermark: '🛡️',
      badgeLabel: 'Cinismo Estremo',
      badgeColor: 'emerald',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il titolo conquistato con il minor bottino di punti, massimizzando il rendimento di ogni singolo scontro.'
    });
  }

  // -------------------------------------------------------------
  // Record 1.3: Cucchiaio Più Onorevole (Max Punti da Ultimo)
  // -------------------------------------------------------------
  const allSpoonsPoints: {
    season: string;
    points: number;
    ppg: number;
    matchdays: number;
    holder: RecordHolder;
  }[] = [];

  completedChampionships.forEach(c => {
    const s = c.season;
    const ranking = c.ranking || [];
    const teamCount = ranking.length || 12;
    const matchdays = getSeasonMatchdays(s, teamCount);
    const lastRank = Math.max(...ranking.map(r => r.rank || 0));
    const spoonTeam = ranking.find(r => r.rank === lastRank);

    if (spoonTeam && typeof spoonTeam.points === 'number' && spoonTeam.points > 0) {
      const ppg = Number((spoonTeam.points / matchdays).toFixed(3));
      const crest = resolveManagerRecordCrest(spoonTeam.managerId || '', s, spoonTeam.teamName, managers, competitions);

      allSpoonsPoints.push({
        season: s,
        points: spoonTeam.points,
        ppg,
        matchdays,
        holder: {
          managerId: spoonTeam.managerId || '',
          managerName: resolveManagerName(spoonTeam.managerId, spoonTeam.coach, managers),
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          season: s,
          value: spoonTeam.points,
          formattedValue: `${spoonTeam.points.toFixed(1)} pt`,
          normalizedDetail: `${ppg.toFixed(2)} pt/g · ${matchdays} giornate`
        }
      });
    }
  });

  allSpoonsPoints.sort((a, b) => b.points - a.points || b.ppg - a.ppg);

  if (allSpoonsPoints.length > 0) {
    const maxSpoonPts = allSpoonsPoints[0].points;
    const topTied = allSpoonsPoints.filter(p => p.points === maxSpoonPts);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allSpoonsPoints
      .filter(p => p.points < maxSpoonPts)
      .slice(0, 2)
      .map(p => p.holder);

    records.push({
      id: 'highest_points_wooden_spoon',
      title: 'Cucchiaio Più Onorevole',
      category: 'points',
      icon: 'fa-solid fa-utensils',
      watermark: '🥄',
      badgeLabel: 'Sfortuna Nera',
      badgeColor: 'rose',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il maggior numero di punti conquistati chiudendo comunque all’ultimo posto della classifica.'
    });
  }

  // -------------------------------------------------------------
  // Record 1.4: Miglior Media Punti a Partita in Carriera
  // -------------------------------------------------------------
  const careerAverages: {
    managerId: string;
    managerName: string;
    totalPoints: number;
    totalMatchdays: number;
    careerPpg: number;
    seasonsCount: number;
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    let totPts = 0;
    let totDays = 0;
    let seasonsPlayed = 0;

    (m.history || []).forEach(h => {
      if (h.season === '2026/27' || h.in_progress) return;
      if (typeof h.points === 'number' && h.points > 0) {
        const comp = completedChampionships.find(c => c.season === h.season);
        const teamCount = comp?.ranking?.length || 12;
        const days = getSeasonMatchdays(h.season, teamCount);
        totPts += h.points;
        totDays += days;
        seasonsPlayed += 1;
      }
    });

    if (seasonsPlayed >= 3 && totDays > 0) {
      const careerPpg = Number((totPts / totDays).toFixed(3));
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);

      careerAverages.push({
        managerId: m.id,
        managerName: m.name,
        totalPoints: totPts,
        totalMatchdays: totDays,
        careerPpg,
        seasonsCount: seasonsPlayed,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: careerPpg,
          formattedValue: `${careerPpg.toFixed(2)} pt/g`,
          normalizedDetail: `${totPts.toFixed(1)} pt in ${totDays} gare (${seasonsPlayed} st.)`
        }
      });
    }
  });

  careerAverages.sort((a, b) => b.careerPpg - a.careerPpg);

  if (careerAverages.length > 0) {
    const topPpg = careerAverages[0].careerPpg;
    const topTied = careerAverages.filter(p => p.careerPpg === topPpg);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = careerAverages
      .filter(p => p.careerPpg < topPpg)
      .slice(0, 2)
      .map(p => p.holder);

    records.push({
      id: 'career_best_ppg',
      title: 'Miglior Media Punti a Partita',
      category: 'points',
      icon: 'fa-solid fa-chart-line',
      watermark: '📈',
      badgeLabel: 'Costanza Top (≥ 3 st.)',
      badgeColor: 'blue',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il fantallenatore con la media punti per singola giornata più alta della storia della lega.'
    });

    // -------------------------------------------------------------
    // Record 1.5: Peggior Media Punti a Partita in Carriera
    // -------------------------------------------------------------
    const worstCareerAverages = [...careerAverages].sort((a, b) => a.careerPpg - b.careerPpg);
    const lowestPpg = worstCareerAverages[0].careerPpg;
    const worstTied = worstCareerAverages.filter(p => p.careerPpg === lowestPpg);
    const worstPrimaryHolders = worstTied.map(t => t.holder);
    const worstRunnerUps = worstCareerAverages
      .filter(p => p.careerPpg > lowestPpg)
      .slice(0, 2)
      .map(p => p.holder);

    records.push({
      id: 'career_worst_ppg',
      title: 'Peggior Media Punti a Partita',
      category: 'points',
      icon: 'fa-solid fa-arrow-trend-down',
      watermark: '📉',
      badgeLabel: 'Blackout Offensivo (≥ 3 st.)',
      badgeColor: 'rose',
      primaryHolders: worstPrimaryHolders,
      primaryHolder: worstPrimaryHolders[0],
      runnerUps: worstRunnerUps,
      description: 'Il rendimento medio più basso registrato per singola giornata di campionato tra tutti i fantallenatori con almeno 3 stagioni all’attivo.'
    });
  }

  return records;
}
