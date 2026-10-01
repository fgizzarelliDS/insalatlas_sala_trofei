import type { Manager, LeagueConcentrationAnalysis, ManagerAnalyticsProfile, DishonorShare } from './types';
import { calculateManagerScore } from './score';

/**
 * Computes normalized disaster mass to discount joint spoon + cartonato occurrences
 */
export function computeDisasterMass(spoon: number, cartonato: number): number {
  return Math.max(spoon, cartonato) + 0.5 * Math.min(spoon, cartonato);
}

/**
 * Computes Bayesian-smoothed Feast-or-Famine ratio using Empirical Bayes prior
 */
export function computeSmoothedFF(tailMass: number, years: number, k: number = 2.0, priorFF: number = 0.30): number {
  return parseFloat(((tailMass + k * priorFF) / (years + k)).toFixed(2));
}

/**
 * Computes Net Tail Skew and qualitative polarity label
 */
export function computeNetTailSkew(gold: number, disasterMass: number): { nts: number; label: string } {
  const tailMass = gold + disasterMass;
  if (tailMass === 0) {
    return { nts: 0, label: 'Equilibrato' };
  }
  const nts = parseFloat(((gold - disasterMass) / tailMass).toFixed(2));
  let label = 'Bipolar / Equilibrato';
  if (nts >= 0.50) {
    label = 'Feast-Dominant';
  } else if (nts <= -0.50) {
    label = 'Famine-Dominant';
  }
  return { nts, label };
}

/**
 * Computes behavioral archetype for an individual manager based on performance distribution
 */
export function getManagerArchetype(
  m: Manager,
  trophies?: number,
  efficiency?: number,
  podiums?: number,
  podiumRatePct?: number,
  killerInstinctPct?: number,
  finalsPlayed?: number,
  conversionRatePct?: number,
  dishonors?: number,
  smoothedFF?: number
): { tag: string; color: string; icon: string } {
  const actualTrophies = trophies !== undefined ? trophies : ((m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0));
  const actualEfficiency = efficiency !== undefined ? efficiency : (m.years > 0 ? actualTrophies / m.years : 0);
  const actualPodiums = podiums !== undefined ? podiums : ((m.gold || 0) + (m.silver || 0) + (m.bronze || 0));
  const actualPodiumRatePct = podiumRatePct !== undefined ? podiumRatePct : (m.years > 0 ? (actualPodiums / m.years) * 100 : 0);
  const actualKillerInstinctPct = killerInstinctPct !== undefined ? killerInstinctPct : (actualPodiums > 0 ? ((m.gold || 0) / actualPodiums) * 100 : 0);
  const finalsWon = (m.gold || 0) + (m.cup_gold || 0);
  const actualFinalsPlayed = finalsPlayed !== undefined ? finalsPlayed : (finalsWon + (m.silver || 0) + (m.cup_silver || 0));
  const actualConversionRatePct = conversionRatePct !== undefined ? conversionRatePct : (actualFinalsPlayed > 0 ? (finalsWon / actualFinalsPlayed) * 100 : 0);
  const actualDishonors = dishonors !== undefined ? dishonors : ((m.spoon || 0) + (m.cartonato || 0));
  const dm = computeDisasterMass(m.spoon || 0, m.cartonato || 0);
  const tm = (m.gold || 0) + dm;
  const actualSmoothedFF = smoothedFF !== undefined ? smoothedFF : computeSmoothedFF(tm, m.years, 2.0, 0.30);

  // 1. Dominatore Dinastico: trofei >= 4 e (efficienza >= 0.40 oppure almeno 2 Scudetti)
  if (actualTrophies >= 4 && (actualEfficiency >= 0.40 || (m.gold || 0) >= 2)) {
    return {
      tag: 'Dominatore Dinastico',
      color: '#eab308', // Amber
      icon: 'fa-crown'
    };
  }

  // 2. Vittima Sacrificale: disonori >= 3 oppure (disonori >= 2 e 0 trofei)
  if (actualDishonors >= 3 || (actualDishonors >= 2 && actualTrophies === 0)) {
    return {
      tag: 'Vittima Sacrificale',
      color: '#ef4444', // Red
      icon: 'fa-skull-crossbones'
    };
  }

  // 3. Cannibale del Podio: PR >= 50% e Killer Instinct >= 60% (min. 2 Podi)
  if (actualPodiumRatePct >= 50 && actualKillerInstinctPct >= 60 && actualPodiums >= 2) {
    return {
      tag: 'Cannibale del Podio',
      color: '#f59e0b', // Amber-Gold
      icon: 'fa-trophy'
    };
  }

  // 4. Cinico Chirurgico: almeno 2 finali disputate e conversione >= 70%
  if (actualFinalsPlayed >= 2 && actualConversionRatePct >= 70) {
    return {
      tag: 'Cinico Chirurgico',
      color: '#10b981', // Emerald
      icon: 'fa-crosshairs'
    };
  }

  // 5. Il Grande Piazzato: almeno 3 podi e Killer Instinct <= 25%
  if (actualPodiums >= 3 && actualKillerInstinctPct <= 25) {
    return {
      tag: 'Il Grande Piazzato',
      color: '#d97706', // Warm Amber
      icon: 'fa-ranking-star'
    };
  }

  // 6. Eterno Secondo: almeno 2 argenti e conversione finali <= 35%
  if (((m.silver || 0) + (m.cup_silver || 0)) >= 2 && actualConversionRatePct <= 35) {
    return {
      tag: 'Eterno Secondo',
      color: '#6366f1', // Indigo
      icon: 'fa-medal'
    };
  }

  // 7. All-or-Nothing: smoothed FF >= 0.45, almeno 1 oro/coppa e almeno 1 disonore
  if (actualSmoothedFF >= 0.45 && ((m.gold || 0) >= 1 || (m.cup_gold || 0) >= 1) && actualDishonors >= 1) {
    return {
      tag: 'All-or-Nothing',
      color: '#f97316', // Orange
      icon: 'fa-dice'
    };
  }

  // 8. Grinder Metodico: Tasso Podio >= 30%, 0 disonori e almeno 3 anni
  if (actualPodiumRatePct >= 30 && actualDishonors === 0 && m.years >= 3) {
    return {
      tag: 'Grinder Metodico',
      color: '#06b6d4', // Cyan
      icon: 'fa-shield-halved'
    };
  }

  // 9. Manager Ufficiale: Default
  return {
    tag: 'Manager Ufficiale',
    color: '#94a3b8', // Slate
    icon: 'fa-user-tie'
  };
}

/**
 * Computes multi-dimensional league concentration, clutch indices, and risk profiles.
 */
export function computeLeagueConcentration(managers: Manager[]): LeagueConcentrationAnalysis {
  const n = managers.length;

  if (n === 0) {
    return {
      totalTrophies: 0,
      totalDishonors: 0,
      giniTrophies: 0,
      giniRating: 0,
      cr3Pct: 0,
      cr3DishonorPct: 0,
      hhi: 0,
      hhiDescription: 'Nessun Dato',
      relativeEntropy: 0,
      leagueAverageFF: 0,
      tierTitle: 'Dati Insufficienti',
      tierDescription: 'Nessun manager presente nel database.',
      tierColor: '#94a3b8',
      profiles: [],
      top3SilverwareNames: [],
      dishonorShares: []
    };
  }

  // League-wide aggregate FF for empirical Bayes prior
  const totalYears = managers.reduce((acc, m) => acc + (m.years || 0), 0);
  const totalGolds = managers.reduce((acc, m) => acc + (m.gold || 0), 0);
  const totalDishonorCounts = managers.reduce((acc, m) => acc + (m.spoon || 0) + (m.cartonato || 0), 0);
  const leagueAverageFF = totalYears > 0 ? parseFloat(((totalGolds + totalDishonorCounts) / totalYears).toFixed(2)) : 0.30;

  // 1. Compute Base Quantities & Profiles per manager
  const rawProfiles = managers.map(m => {
    const trophies = (m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0);
    const podiums = (m.gold || 0) + (m.silver || 0) + (m.bronze || 0);
    const podiumRatePct = m.years > 0 ? parseFloat(((podiums / m.years) * 100).toFixed(1)) : 0;
    const killerInstinctPct = podiums > 0 ? parseFloat((((m.gold || 0) / podiums) * 100).toFixed(1)) : 0;
    const finalsWon = (m.gold || 0) + (m.cup_gold || 0);
    const finalsPlayed = (m.gold || 0) + (m.cup_gold || 0) + (m.silver || 0) + (m.cup_silver || 0);
    const conversionRatePct = finalsPlayed > 0 ? parseFloat(((finalsWon / finalsPlayed) * 100).toFixed(1)) : 0;
    const efficiency = m.years > 0 ? parseFloat((trophies / m.years).toFixed(2)) : 0;
    const dishonors = (m.spoon || 0) + (m.cartonato || 0); // Spoon (Last Place) + Cartonato (Playout)
    const disasterMass = computeDisasterMass(m.spoon || 0, m.cartonato || 0);
    const tailMass = (m.gold || 0) + disasterMass;
    const feastOrFamineRatio = m.years > 0 ? parseFloat(((((m.gold || 0) + dishonors) / m.years)).toFixed(2)) : 0;
    const smoothedFeastOrFamine = computeSmoothedFF(tailMass, m.years, 2.0, leagueAverageFF);
    const { nts: netTailSkew, label: netTailSkewLabel } = computeNetTailSkew(m.gold || 0, disasterMass);
    const score = calculateManagerScore(m);

    const archetype = getManagerArchetype(
      m,
      trophies,
      efficiency,
      podiums,
      podiumRatePct,
      killerInstinctPct,
      finalsPlayed,
      conversionRatePct,
      dishonors,
      smoothedFeastOrFamine
    );

    return {
      id: m.id,
      name: m.name,
      years: m.years,
      gold: m.gold || 0,
      trophies,
      podiums,
      podiumRatePct,
      killerInstinctPct,
      finalsWon,
      finalsPlayed,
      conversionRatePct,
      efficiency,
      dishonors,
      disasterMass,
      tailMass,
      feastOrFamineRatio,
      smoothedFeastOrFamine,
      netTailSkew,
      netTailSkewLabel,
      score,
      archetypeTag: archetype.tag,
      archetypeColor: archetype.color,
      archetypeIcon: archetype.icon
    };
  });

  const totalTrophies = rawProfiles.reduce((acc, p) => acc + p.trophies, 0);
  const totalDishonors = rawProfiles.reduce((acc, p) => acc + p.dishonors, 0);

  // 2. Profiles with Silverware Share
  const profiles: ManagerAnalyticsProfile[] = rawProfiles
    .map(p => ({
      ...p,
      trophySharePct: totalTrophies > 0 ? parseFloat(((p.trophies / totalTrophies) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.trophies - a.trophies || b.efficiency - a.efficiency);

  // 3. Top-3 Concentration Ratio (CR3)
  const top3Trophies = profiles.slice(0, 3).reduce((acc, p) => acc + p.trophies, 0);
  const cr3Pct = totalTrophies > 0 ? parseFloat(((top3Trophies / totalTrophies) * 100).toFixed(1)) : 0;
  const top3SilverwareNames = profiles.slice(0, 3).filter(p => p.trophies > 0).map(p => p.name);

  // 4. Herfindahl-Hirschman Index (HHI)
  const hhi = totalTrophies > 0
    ? Math.round(profiles.reduce((acc, p) => acc + Math.pow(p.trophySharePct, 2), 0))
    : 0;

  let hhiDescription = 'Mercato Aperto (Parità)';
  if (hhi > 2500) {
    hhiDescription = 'Mercato Chiuso (Oligarchia)';
  } else if (hhi >= 1500) {
    hhiDescription = 'Moderata Concentrazione';
  }

  // 5. Normalized Information Entropy (H_rel)
  let entropySum = 0;
  if (totalTrophies > 0 && n > 1) {
    for (const p of profiles) {
      if (p.trophies > 0) {
        const prob = p.trophies / totalTrophies;
        entropySum += prob * Math.log(prob);
      }
    }
  }
  const relativeEntropy = (totalTrophies > 0 && n > 1)
    ? parseFloat(Math.max(0, Math.min(1, -entropySum / Math.log(n))).toFixed(2))
    : 0;

  // 6. Gini on Major Silverware
  const sortedTrophiesAsc = [...profiles].sort((a, b) => a.trophies - b.trophies);
  let cumulativeTrophySum = 0;
  for (let i = 0; i < n; i++) {
    cumulativeTrophySum += (i + 1) * sortedTrophiesAsc[i].trophies;
  }
  const giniTrophies = totalTrophies > 0
    ? parseFloat(Math.max(0, Math.min(1, (2 * cumulativeTrophySum) / (n * totalTrophies) - (n + 1) / n)).toFixed(2))
    : 0;

  // 7. Gini on Historical Rating (Offset to non-negative domain)
  const rawScores = profiles.map(p => p.score);
  const minScore = Math.min(...rawScores);
  const offset = minScore < 0 ? Math.abs(minScore) : 0;
  const nonNegativeScores = rawScores.map(s => s + offset).sort((a, b) => a - b);
  const totalScore = nonNegativeScores.reduce((a, b) => a + b, 0);

  let cumulativeScoreSum = 0;
  for (let i = 0; i < n; i++) {
    cumulativeScoreSum += (i + 1) * nonNegativeScores[i];
  }
  const giniRating = totalScore > 0
    ? parseFloat(Math.max(0, Math.min(1, (2 * cumulativeScoreSum) / (n * totalScore) - (n + 1) / n)).toFixed(2))
    : 0;

  // 8. Dishonor Concentration (Cucchiai di Legno + Cartonati Playout)
  const dishonorShares: DishonorShare[] = managers
    .map(m => ({
      name: m.name,
      count: (m.spoon || 0) + (m.cartonato || 0)
    }))
    .sort((a, b) => b.count - a.count)
    .map(d => ({
      ...d,
      sharePct: totalDishonors > 0 ? parseFloat(((d.count / totalDishonors) * 100).toFixed(1)) : 0
    }));

  const top3DishonorSum = dishonorShares.slice(0, 3).reduce((acc, d) => acc + d.count, 0);
  const cr3DishonorPct = totalDishonors > 0 ? parseFloat(((top3DishonorSum / totalDishonors) * 100).toFixed(1)) : 0;

  // 9. Qualitative Narrative Tier
  const isExtremeMonopoly = (giniTrophies > 0.75 && cr3Pct >= 72) || hhi >= 2500;
  const isOligarchy = giniTrophies > 0.55 || cr3Pct >= 58 || hhi >= 1800;
  const isAbsoluteParity = giniTrophies <= 0.40 && cr3Pct <= 45 && hhi < 1400;

  let tierTitle = 'Competizione Aperta';
  let tierDescription = 'Alternanza equilibrata con rotazione dei campioni e classe media viva.';
  let tierColor = '#3b82f6';

  if (isAbsoluteParity) {
    tierTitle = 'Far West (Parità Assoluta)';
    tierDescription = 'Campionato anarchico: il potere è frammentato e chiunque può vincere.';
    tierColor = '#10b981'; // Green
  } else if (isExtremeMonopoly) {
    tierTitle = 'Feudalesimo Assoluto';
    tierDescription = 'Monopolio dinastico: pochissime squadre (1-2) accentrano quasi tutti i titoli.';
    tierColor = '#ef4444'; // Red
  } else if (isOligarchy) {
    tierTitle = 'Lega a Tre Velocità';
    tierDescription = 'Oligarchia consolidata: una cerchia ristretta (3-4 potenze) si contende i titoli.';
    tierColor = '#f59e0b'; // Amber
  }

  return {
    totalTrophies,
    totalDishonors,
    giniTrophies,
    giniRating,
    cr3Pct,
    cr3DishonorPct,
    hhi,
    hhiDescription,
    relativeEntropy,
    leagueAverageFF,
    tierTitle,
    tierDescription,
    tierColor,
    profiles,
    top3SilverwareNames,
    dishonorShares
  };
}
