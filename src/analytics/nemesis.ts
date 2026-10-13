import type {
  Manager,
  RivalryOpponent,
  ManagerRivalryStats,
  NemesisMatrixCell,
  NemesisMatrixData
} from '@/types';

/**
 * Extracts latest season string across all managers
 */
export function getLatestSeason(managers: Manager[]): string {
  let maxYear = 0;
  let latest = '';
  managers.forEach(m => {
    (m.history || []).forEach(h => {
      const year = parseInt(h.season?.slice(0, 4) || '0', 10);
      if (year > maxYear) {
        maxYear = year;
        latest = h.season;
      }
    });
  });
  return latest;
}

/**
 * Filters managers for the Nemesis Matrix by scope
 */
export function filterManagersForMatrix(
  managers: Manager[],
  filter: 'all' | 'veterans' | 'active',
  latestSeason?: string
): Manager[] {
  if (filter === 'all') return managers;
  if (filter === 'veterans') {
    return managers.filter(
      m =>
        (m.years || 0) >= 3 ||
        (m.history?.filter(h => !h.in_progress && h.rank)?.length || 0) >= 3
    );
  }
  // active
  const targetSeason = latestSeason || getLatestSeason(managers);
  return managers.filter(m => (m.history || []).some(h => h.season === targetSeason));
}

/**
 * Computes pairwise duel record between Manager A and Manager B across all completed shared seasons
 */
export function computePairwiseDuel(
  managerA: Manager,
  managerB: Manager
): {
  sharedSeasons: number;
  winsA: number;
  ties: number;
  winsB: number;
  pointsDiffA: number;
  duels: Array<{
    season: string;
    winner: 'A' | 'B' | 'tie';
    pointsDiff: number;
    rankA: number;
    rankB: number;
  }>;
} {
  const mapB = new Map(
    (managerB.history || [])
      .filter(h => !h.in_progress && typeof h.rank === 'number' && h.rank > 0)
      .map(h => [h.season, h])
  );

  const shared = (managerA.history || []).filter(
    hA => !hA.in_progress && typeof hA.rank === 'number' && hA.rank > 0 && mapB.has(hA.season)
  );

  let winsA = 0;
  let ties = 0;
  let winsB = 0;
  let pointsDiffA = 0;

  const duels = shared.map(hA => {
    const hB = mapB.get(hA.season)!;
    const rankA = hA.rank as number;
    const rankB = hB.rank as number;
    let winner: 'A' | 'B' | 'tie' = 'tie';
    if (rankA < rankB) {
      winsA++;
      winner = 'A';
    } else if (rankA > rankB) {
      winsB++;
      winner = 'B';
    } else {
      ties++;
      winner = 'tie';
    }

    const pA = typeof hA.points === 'number' ? hA.points : 0;
    const pB = typeof hB.points === 'number' ? hB.points : 0;
    const diff = pA - pB;
    pointsDiffA += diff;

    return {
      season: hA.season,
      winner,
      pointsDiff: diff,
      rankA,
      rankB
    };
  });

  return {
    sharedSeasons: shared.length,
    winsA,
    ties,
    winsB,
    pointsDiffA: Math.round(pointsDiffA * 10) / 10,
    duels
  };
}

/**
 * Computes Nemesis (Bestia Nera) and Victim (Babbo Natale) plus historical grudge metrics for a manager
 * @param manager - Target manager
 * @param allManagers - All managers in the league
 * @param minSharedSeasons - Minimum threshold of shared completed seasons (default 2)
 */
export function computeManagerRivalries(
  manager: Manager,
  allManagers: Manager[],
  minSharedSeasons = 2
): ManagerRivalryStats {
  const opponents = allManagers.filter(m => m.id !== manager.id);
  const rivalryCandidates: RivalryOpponent[] = [];

  let biggestBlowout: ManagerRivalryStats['biggestBlowout'] = null;
  let maxBlowoutMargin = -1;
  let titleClashesCount = 0;

  opponents.forEach(opp => {
    const duel = computePairwiseDuel(manager, opp);

    // Track biggest blowout and title clashes across all opponents regardless of minSharedSeasons
    duel.duels.forEach(d => {
      const margin = Math.abs(d.pointsDiff);
      if (margin > maxBlowoutMargin && d.winner !== 'tie') {
        maxBlowoutMargin = margin;
        biggestBlowout = {
          opponent: opp,
          season: d.season,
          margin: Math.round(margin * 10) / 10,
          rankA: d.rankA,
          rankB: d.rankB,
          winner: d.winner === 'A' ? 'A' : 'B'
        };
      }
      if (d.rankA <= 3 && d.rankB <= 3) {
        titleClashesCount++;
      }
    });

    if (duel.sharedSeasons >= minSharedSeasons) {
      // Score formulation: (Wins - Losses) / Shared * 100 + PointsDiff / Shared
      const netWinsRate = (duel.winsA - duel.winsB) / duel.sharedSeasons;
      const avgPointsDiff = duel.pointsDiffA / duel.sharedSeasons;
      const rivalryScore = netWinsRate * 100 + avgPointsDiff;

      rivalryCandidates.push({
        opponent: opp,
        wins: duel.winsA,
        ties: duel.ties,
        losses: duel.winsB,
        pointsDiff: duel.pointsDiffA,
        sharedSeasons: duel.sharedSeasons,
        rivalryScore: Math.round(rivalryScore * 100) / 100
      });
    }
  });

  // Nemesis: lowest rivalryScore (must be < 0 or losses > wins)
  let nemesis: RivalryOpponent | null = null;
  const negativeCandidates = rivalryCandidates.filter(c => c.losses > c.wins || c.rivalryScore < 0);
  if (negativeCandidates.length > 0) {
    negativeCandidates.sort((a, b) => a.rivalryScore - b.rivalryScore);
    nemesis = negativeCandidates[0];
  }

  // Victim (Babbo Natale): highest rivalryScore (must be > 0 or wins > losses)
  let victim: RivalryOpponent | null = null;
  const positiveCandidates = rivalryCandidates.filter(c => c.wins > c.losses || c.rivalryScore > 0);
  if (positiveCandidates.length > 0) {
    positiveCandidates.sort((a, b) => b.rivalryScore - a.rivalryScore);
    victim = positiveCandidates[0];
  }

  return {
    managerId: manager.id,
    nemesis,
    victim,
    biggestBlowout,
    titleClashesCount
  };
}

/**
 * Computes the full interactive Nemesis Matrix cross-table
 */
export function computeNemesisMatrix(managers: Manager[]): NemesisMatrixData {
  const matrix: Record<string, Record<string, NemesisMatrixCell>> = {};

  managers.forEach(mA => {
    matrix[mA.id] = {};
    managers.forEach(mB => {
      if (mA.id === mB.id) {
        matrix[mA.id][mB.id] = {
          managerAId: mA.id,
          managerBId: mB.id,
          sharedSeasons: 0,
          winsA: 0,
          ties: 0,
          winsB: 0,
          pointsDiffA: 0,
          status: 'self'
        };
      } else {
        const duel = computePairwiseDuel(mA, mB);
        let status: NemesisMatrixCell['status'] = 'none';

        if (duel.sharedSeasons > 0) {
          if (duel.winsA > duel.winsB) status = 'positive';
          else if (duel.winsA < duel.winsB) status = 'negative';
          else status = 'neutral';
        }

        matrix[mA.id][mB.id] = {
          managerAId: mA.id,
          managerBId: mB.id,
          sharedSeasons: duel.sharedSeasons,
          winsA: duel.winsA,
          ties: duel.ties,
          winsB: duel.winsB,
          pointsDiffA: duel.pointsDiffA,
          status
        };
      }
    });
  });

  return {
    managers,
    matrix
  };
}
