import type { Manager, LeagueConcentrationAnalysis, ManagerAnalyticsProfile, DishonorShare } from './types';
import { calculateManagerScore } from './score';

/**
 * Computes behavioral archetype for an individual manager based on performance distribution
 */
export function getManagerArchetype(m: Manager, trophies: number, efficiency: number): { tag: string; color: string; icon: string } {
  const finalsWon = (m.gold || 0) + (m.cup_gold || 0);
  const finalsPlayed = (m.gold || 0) + (m.cup_gold || 0) + (m.silver || 0) + (m.cup_silver || 0);
  const conversionRatePct = finalsPlayed > 0 ? (finalsWon / finalsPlayed) * 100 : 0;
  const dishonors = (m.spoon || 0) + (m.cartonato || 0); // Spoon (Last Place) + Cartonato (Playout)
  const feastOrFamineRatio = m.years > 0 ? ((m.gold || 0) + dishonors) / m.years : 0;

  if (trophies >= 4 && efficiency >= 0.5) {
    return {
      tag: 'Dominatore Dinastico',
      color: '#eab308', // Amber
      icon: 'fa-crown'
    };
  }
  if (finalsPlayed >= 2 && conversionRatePct >= 70) {
    return {
      tag: 'Cinico Chirurgico',
      color: '#10b981', // Emerald
      icon: 'fa-crosshairs'
    };
  }
  if (((m.silver || 0) + (m.cup_silver || 0)) >= 2 && conversionRatePct <= 35) {
    return {
      tag: 'Eterno Secondo',
      color: '#6366f1', // Indigo
      icon: 'fa-medal'
    };
  }
  if (feastOrFamineRatio >= 0.6 && (m.gold || 0) >= 1 && dishonors >= 1) {
    return {
      tag: 'All-or-Nothing',
      color: '#f97316', // Orange
      icon: 'fa-dice'
    };
  }
  if (dishonors >= 2 && trophies === 0) {
    return {
      tag: 'Vittima Sacrificale',
      color: '#ef4444', // Red
      icon: 'fa-skull-crossbones'
    };
  }
  if (feastOrFamineRatio <= 0.25 && dishonors === 0 && m.years >= 3) {
    return {
      tag: 'Grinder Metodico',
      color: '#06b6d4', // Cyan
      icon: 'fa-shield-halved'
    };
  }

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
      tierTitle: 'Dati Insufficienti',
      tierDescription: 'Nessun manager presente nel database.',
      tierColor: '#94a3b8',
      profiles: [],
      top3SilverwareNames: [],
      dishonorShares: []
    };
  }

  // 1. Compute Base Quantities & Profiles per manager
  const rawProfiles = managers.map(m => {
    const trophies = (m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0);
    const dishonors = (m.spoon || 0) + (m.cartonato || 0); // Spoon (Last Place) + Cartonato (Playout)
    const finalsWon = (m.gold || 0) + (m.cup_gold || 0);
    const finalsPlayed = (m.gold || 0) + (m.cup_gold || 0) + (m.silver || 0) + (m.cup_silver || 0);
    const conversionRatePct = finalsPlayed > 0 ? parseFloat(((finalsWon / finalsPlayed) * 100).toFixed(1)) : 0;
    const efficiency = m.years > 0 ? parseFloat((trophies / m.years).toFixed(2)) : 0;
    const feastOrFamineRatio = m.years > 0 ? parseFloat((((m.gold || 0) + dishonors) / m.years).toFixed(2)) : 0;
    const score = calculateManagerScore(m);

    const archetype = getManagerArchetype(m, trophies, efficiency);

    return {
      id: m.id,
      name: m.name,
      years: m.years,
      trophies,
      dishonors,
      finalsWon,
      finalsPlayed,
      conversionRatePct,
      efficiency,
      feastOrFamineRatio,
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
  let tierTitle = 'Competizione Aperta';
  let tierDescription = 'Alternanza equilibrata con rotazione dei campioni e classe media viva.';
  let tierColor = '#3b82f6';

  if (giniTrophies <= 0.30 && cr3Pct <= 45) {
    tierTitle = 'Far West (Parità Assoluta)';
    tierDescription = 'Campionato anarchico: il potere è frammentato e chiunque può vincere.';
    tierColor = '#10b981';
  } else if (giniTrophies > 0.60 || cr3Pct >= 70) {
    tierTitle = 'Feudalesimo Assoluto';
    tierDescription = 'Monopolio dinastico: pochissime squadre accentrano quasi tutti i titoli.';
    tierColor = '#ef4444';
  } else if (giniTrophies > 0.45 || cr3Pct >= 55) {
    tierTitle = 'Lega a Tre Velocità';
    tierDescription = 'Oligarchia consolidata: una cerchia ristretta monopolizza le finali.';
    tierColor = '#f59e0b';
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
    tierTitle,
    tierDescription,
    tierColor,
    profiles,
    top3SilverwareNames,
    dishonorShares
  };
}
