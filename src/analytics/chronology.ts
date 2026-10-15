import type {
  Manager,
  CompetitionRecord,
  ManagerTrajectoryMetrics,
  ManagerTierDistribution,
  SeasonParityMetrics,
  VolatilityCategory
} from '@/types';
import { state } from '@/state';

/**
 * Computes career trajectory, average finish, rank oscillation,
 * dynamic 4-tier distribution, baricenter score, volatility, podiums, spoons, and streaks for each manager.
 */
export function computeManagerTrajectoryMetrics(
  managers: Manager[],
  competitions?: CompetitionRecord[]
): ManagerTrajectoryMetrics[] {
  const championshipComps = (competitions || []).filter(
    c => c.category === 'Campionato' || (c.name && c.name.toLowerCase().includes('serie'))
  );

  let latestSeason = championshipComps.reduce((latest, c) => {
    const y = parseInt(c.season?.slice(0, 4) || '0', 10);
    const lY = parseInt(latest?.slice(0, 4) || '0', 10);
    return y > lY ? c.season : latest;
  }, '');

  if (!latestSeason && managers?.length) {
    managers.forEach(m => {
      m.history?.forEach(h => {
        const y = parseInt(h.season?.slice(0, 4) || '0', 10);
        const lY = parseInt(latestSeason?.slice(0, 4) || '0', 10);
        if (y > lY && h.season) latestSeason = h.season;
      });
    });
  }

  return (managers || []).map(m => {
    const meritList: number[] = [];
    const ranksList: number[] = [];
    const safetyList: boolean[] = [];
    const podiumList: boolean[] = [];
    let totalSpoons = 0;

    let podiumCount = 0; // Tier 4: Vertice / Podio (1°-3°)
    let highCount = 0;   // Tier 3: Alta Classifica (Europa)
    let midCount = 0;    // Tier 2: Metà Classifica
    let riskCount = 0;   // Tier 1: Rischio Cucchiaio / Playout

    // Collect all chronological seasons from m.history
    const history = [...(m.history || [])].sort((a, b) => {
      const yA = parseInt(a.season?.slice(0, 4) || '0', 10);
      const yB = parseInt(b.season?.slice(0, 4) || '0', 10);
      return yA - yB;
    });

    const isActive = history.some(h => h.season === latestSeason);

    history.forEach(h => {
      const comp = championshipComps.find(c => c.season === h.season);
      const isInProgress = Boolean(h.in_progress || h.status === 'in_progress' || comp?.in_progress || comp?.status === 'in_progress');

      if (!isInProgress && typeof h.rank === 'number' && h.rank > 0) {
        const teamCount = comp?.ranking?.length
          ? comp.ranking.length
          : h.season.includes('16/17') || h.season.includes('17/18')
            ? 8
            : h.season.includes('18/19') || h.season.includes('19/20')
              ? 10
              : 12;

        const merit =
          teamCount > 1
            ? ((teamCount - h.rank) / (teamCount - 1)) * 100
            : 100;

        meritList.push(merit);
        ranksList.push(h.rank);

        // Check if podium (1st, 2nd, 3rd)
        const isPodium = h.rank <= 3;
        podiumList.push(isPodium);

        // Check if spoon (last place or spoon achievement)
        const hasSpoonBadge = h.achievements?.some(a => a.badge === 'spoon');
        const isLastPlace = h.rank === teamCount;
        if (hasSpoonBadge || isLastPlace) {
          totalSpoons++;
        }

        // Check if safe (not last place, and no spoon achievement)
        const isSafe = !hasSpoonBadge && !isLastPlace;
        safetyList.push(isSafe);

        // Map to 4 Dynamic Tiers based on league size (8, 10, 12 teams)
        if (isPodium) {
          podiumCount++;
        } else if (
          (teamCount === 8 && h.rank === 4) ||
          (teamCount === 10 && (h.rank === 4 || h.rank === 5)) ||
          (teamCount === 12 && h.rank >= 4 && h.rank <= 6)
        ) {
          highCount++;
        } else if (h.rank >= teamCount - 1 || hasSpoonBadge) {
          riskCount++;
        } else {
          midCount++;
        }
      }
    });

    const seasonsPlayed = meritList.length;
    const isRookieInProgress = seasonsPlayed === 0 && (history.some(h => Boolean(h.in_progress || h.status === 'in_progress')) || isActive);

    let avgRank = 0;
    let stdDevRank = 0;
    let avgMeritPct = 0;
    let stdDevMeritPct = 0;
    let cvPct = 0;
    let volatilityCategory: VolatilityCategory = 'esordiente';
    let volatilityLabel = isRookieInProgress ? 'Debuttante' : 'Esordiente';
    let volatilityIcon = '🌱';
    let volatilityColor = '#94a3b8';

    if (seasonsPlayed > 0) {
      avgRank = ranksList.reduce((acc, v) => acc + v, 0) / seasonsPlayed;
      avgMeritPct = meritList.reduce((acc, v) => acc + v, 0) / seasonsPlayed;

      if (seasonsPlayed >= 3) {
        const rankVariance =
          ranksList.reduce((acc, v) => acc + Math.pow(v - avgRank, 2), 0) / seasonsPlayed;
        stdDevRank = Math.sqrt(rankVariance);

        const meritVariance =
          meritList.reduce((acc, v) => acc + Math.pow(v - avgMeritPct, 2), 0) / seasonsPlayed;
        stdDevMeritPct = Math.sqrt(meritVariance);
        cvPct = avgMeritPct > 0 ? (stdDevMeritPct / avgMeritPct) * 100 : 0;

        // Categorizzazione intuitiva basata sull'oscillazione in posizioni (stdDevRank)
        if (stdDevRank < 2.0) {
          volatilityCategory = 'metronomo';
          volatilityLabel = 'Metronomo';
          volatilityIcon = '⏱️';
          volatilityColor = '#10b981';
        } else if (stdDevRank <= 3.5) {
          volatilityCategory = 'equilibrato';
          volatilityLabel = 'Equilibrato';
          volatilityIcon = '⚖️';
          volatilityColor = '#3b82f6';
        } else {
          volatilityCategory = 'altalenante';
          volatilityLabel = 'Altalenante';
          volatilityIcon = '🎢';
          volatilityColor = '#f59e0b';
        }
      } else {
        // < 3 seasons played
        stdDevRank = 0;
        stdDevMeritPct = 0;
        cvPct = 0;
        volatilityCategory = 'esordiente';
        volatilityLabel = 'Esordiente';
        volatilityIcon = '🌱';
        volatilityColor = '#94a3b8';
      }
    }

    // Compute Tier Distribution and Baricenter Score (1.0 - 4.0)
    let podiumPct = 0;
    let highPct = 0;
    let midPct = 0;
    let riskPct = 0;
    let baricenterScore = 0;
    let baricenterLabel = isRookieInProgress ? 'Debuttante' : 'In attesa di dati';
    let baricenterColor = '#94a3b8';
    let baricenterIcon = '🌱';

    if (seasonsPlayed > 0) {
      podiumPct = Math.round((podiumCount / seasonsPlayed) * 100);
      highPct = Math.round((highCount / seasonsPlayed) * 100);
      midPct = Math.round((midCount / seasonsPlayed) * 100);
      riskPct = Math.round((riskCount / seasonsPlayed) * 100);

      const rawBaricenter = (4 * podiumCount + 3 * highCount + 2 * midCount + 1 * riskCount) / seasonsPlayed;
      baricenterScore = Math.round(rawBaricenter * 10) / 10;

      if (baricenterScore >= 3.5) {
        baricenterLabel = 'Élite Vertice';
        baricenterColor = '#eab308';
        baricenterIcon = '🥇';
      } else if (baricenterScore >= 2.8) {
        baricenterLabel = 'Alta Classifica';
        baricenterColor = '#10b981';
        baricenterIcon = '⭐';
      } else if (baricenterScore >= 2.0) {
        baricenterLabel = 'Metà Classifica';
        baricenterColor = '#3b82f6';
        baricenterIcon = '⚖️';
      } else {
        baricenterLabel = 'Zona Rischio';
        baricenterColor = '#ef4444';
        baricenterIcon = '🥄';
      }
    }

    const tierDistribution: ManagerTierDistribution = {
      podiumCount,
      highCount,
      midCount,
      riskCount,
      podiumPct,
      highPct,
      midPct,
      riskPct,
      baricenterScore,
      baricenterLabel,
      baricenterColor,
      baricenterIcon
    };

    // Compute max streaks
    const calcMaxStreak = (arr: boolean[]): number => {
      let max = 0;
      let curr = 0;
      arr.forEach(val => {
        if (val) {
          curr++;
          if (curr > max) max = curr;
        } else {
          curr = 0;
        }
      });
      return max;
    };

    const calcCurrentStreak = (arr: boolean[]): number => {
      let curr = 0;
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i]) curr++;
        else break;
      }
      return curr;
    };

    const maxPodiumStreak = calcMaxStreak(podiumList);
    const currentPodiumStreak = calcCurrentStreak(podiumList);
    const maxSafetyStreak = calcMaxStreak(safetyList);
    const currentSafetyStreak = calcCurrentStreak(safetyList);

    const bestRank = ranksList.length > 0 ? Math.min(...ranksList) : null;
    const worstRank = ranksList.length > 0 ? Math.max(...ranksList) : null;
    const totalPodiums = podiumList.filter(Boolean).length;

    return {
      id: m.id,
      name: m.name,
      seasonsPlayed,
      isRookieInProgress,
      avgRank: Math.round(avgRank * 10) / 10,
      stdDevRank: Math.round(stdDevRank * 10) / 10,
      avgMeritPct: Math.round(avgMeritPct * 10) / 10,
      stdDevMeritPct: Math.round(stdDevMeritPct * 10) / 10,
      cvPct: Math.round(cvPct * 10) / 10,
      volatilityCategory,
      volatilityLabel,
      volatilityIcon,
      volatilityColor,
      bestRank,
      worstRank,
      totalPodiums,
      totalSpoons,
      maxPodiumStreak,
      maxSafetyStreak,
      currentPodiumStreak,
      currentSafetyStreak,
      isActive,
      tierDistribution
    };
  });
}

/**
 * Computes seasonal parity metrics, step gap (pt per position), compactness index (0-100),
 * total gap (1°-ultimo), podium gap (1°-3°) and wooden spoon escape gap (penultimate-last).
 */
export function computeSeasonalParityMetrics(
  competitions: CompetitionRecord[],
  managers?: Manager[]
): SeasonParityMetrics[] {
  const effectiveManagers = managers && managers.length > 0 ? managers : (state?.managers || []);
  const managersMap = new Map<string, string>();
  effectiveManagers.forEach(m => {
    managersMap.set(m.id, m.name);
  });

  const getManagerDisplayName = (entry?: { managerId?: string | null; coach?: string | null }): string => {
    if (!entry) return 'N/D';
    if (entry.managerId && managersMap.has(entry.managerId)) {
      return managersMap.get(entry.managerId)!;
    }
    if (entry.coach) {
      const match = effectiveManagers.find(m =>
        m.id === entry.coach ||
        m.name.toLowerCase() === entry.coach?.toLowerCase() ||
        (m.coach_banners && m.coach_banners.some(b => b.toLowerCase() === entry.coach?.toLowerCase()))
      );
      if (match) return match.name;
      return entry.coach;
    }
    return entry.managerId || 'N/D';
  };

  const championshipComps = (competitions || [])
    .filter(
      c =>
        (c.category === 'Campionato' || (c.name && c.name.toLowerCase().includes('serie'))) &&
        !c.in_progress &&
        c.status !== 'in_progress'
    )
    .sort((a, b) => {
      const yA = parseInt(a.season?.slice(0, 4) || '0', 10);
      const yB = parseInt(b.season?.slice(0, 4) || '0', 10);
      return yB - yA; // Newest season first
    });

  // Step 1: Precompute raw stats, totalGap and stepGap
  const seasonStats = championshipComps.map(c => {
    const ranking = c.ranking || [];
    const teamCount = ranking.length;

    const validPoints = ranking
      .map(r => r.points)
      .filter((p): p is number => typeof p === 'number' && p !== null && p > 0);

    const hasPointsData = validPoints.length >= Math.min(8, ranking.length * 0.7);

    let meanPts: number | null = null;
    let stdDevPts: number | null = null;

    if (hasPointsData) {
      meanPts = validPoints.reduce((acc, v) => acc + v, 0) / validPoints.length;
      const variance =
        validPoints.reduce((acc, v) => acc + Math.pow(v - meanPts!, 2), 0) / validPoints.length;
      stdDevPts = Math.sqrt(variance);
    }

    const numericRanks = ranking
      .map(r => r.rank)
      .filter((rk): rk is number => typeof rk === 'number' && rk > 0);
    const maxRank = numericRanks.length > 0 ? Math.max(...numericRanks) : teamCount;

    const champ = ranking.find(r => r.rank === 1);
    const third = ranking.find(r => r.rank === 3);
    const penultimate = ranking.find(r => r.rank === maxRank - 1);
    const spoon = ranking.find(r => r.rank === maxRank);

    let totalGap: number | null = null;
    let stepGap: number | null = null;

    if (champ && spoon && typeof champ.points === 'number' && typeof spoon.points === 'number') {
      totalGap = Math.round((champ.points - spoon.points) * 10) / 10;
      if (teamCount > 1) {
        stepGap = Math.round((totalGap / (teamCount - 1)) * 100) / 100;
      }
    }

    let podiumGap: number | null = null;
    if (champ && third && typeof champ.points === 'number' && typeof third.points === 'number') {
      podiumGap = Math.round((champ.points - third.points) * 10) / 10;
    }

    let spoonGap: number | null = null;
    if (penultimate && spoon && typeof penultimate.points === 'number' && typeof spoon.points === 'number') {
      spoonGap = Math.round((penultimate.points - spoon.points) * 10) / 10;
    }

    return {
      comp: c,
      ranking,
      teamCount,
      hasPointsData,
      meanPts,
      stdDevPts,
      champ,
      spoon,
      totalGap,
      stepGap,
      podiumGap,
      spoonGap
    };
  });

  // Calculate stepGap range across valid seasons for normalized compactness
  const validStepGaps = seasonStats
    .map(s => s.stepGap)
    .filter((g): g is number => typeof g === 'number' && g > 0);

  const minStepGap = validStepGaps.length > 0 ? Math.min(...validStepGaps) : 1.9;
  const maxStepGap = validStepGaps.length > 0 ? Math.max(...validStepGaps) : 5.8;
  const stepGapRange = maxStepGap - minStepGap;

  // Step 2: Format final records
  return seasonStats.map(s => {
    let compactnessScore: number | null = null;
    if (s.hasPointsData && s.stepGap !== null) {
      compactnessScore =
        stepGapRange > 0
          ? Math.round(100 - ((s.stepGap - minStepGap) / stepGapRange) * 100)
          : 100;
    }

    // Podium Narrative Badge
    let podiumBadge = 'Podio Regolare';
    let podiumBadgeColor = '#3b82f6';
    if (s.podiumGap !== null) {
      if (s.podiumGap <= 4) {
        podiumBadge = 'Volata a Tre 🏁';
        podiumBadgeColor = '#10b981';
      } else if (s.podiumGap <= 9) {
        podiumBadge = 'Corsa Aperta ⚔️';
        podiumBadgeColor = '#3b82f6';
      } else {
        podiumBadge = 'Podio Sgranato 🚀';
        podiumBadgeColor = '#f59e0b';
      }
    } else {
      podiumBadge = 'N/D';
      podiumBadgeColor = '#94a3b8';
    }

    // Spoon Narrative Badge
    let spoonBadge = 'Salvezza Regolare';
    let spoonBadgeColor = '#3b82f6';
    if (s.spoonGap !== null) {
      if (s.spoonGap <= 2) {
        spoonBadge = 'Playout Thriller ⚡';
        spoonBadgeColor = '#ef4444';
      } else if (s.spoonGap <= 7) {
        spoonBadge = 'Lotta Salvezza 🛡️';
        spoonBadgeColor = '#f59e0b';
      } else {
        spoonBadge = 'Crollo Isolato 📉';
        spoonBadgeColor = '#64748b';
      }
    } else {
      spoonBadge = 'N/D';
      spoonBadgeColor = '#94a3b8';
    }

    return {
      season: s.comp.season,
      competitionId: s.comp.id,
      competitionName: s.comp.name,
      teamCount: s.teamCount,
      hasPointsData: s.hasPointsData,
      meanPts: s.meanPts !== null ? Math.round(s.meanPts * 10) / 10 : null,
      stdDevPts: s.stdDevPts !== null ? Math.round(s.stdDevPts * 10) / 10 : null,
      compactnessScore,
      totalGap: s.totalGap,
      stepGap: s.stepGap,
      podiumGap: s.podiumGap,
      spoonGap: s.spoonGap,
      championName: getManagerDisplayName(s.champ),
      championTeam: s.champ?.teamName || 'N/D',
      championPts: s.champ?.points ?? null,
      spoonName: getManagerDisplayName(s.spoon),
      spoonTeam: s.spoon?.teamName || 'N/D',
      spoonPts: s.spoon?.points ?? null,
      podiumBadge,
      podiumBadgeColor,
      spoonBadge,
      spoonBadgeColor
    };
  });
}
