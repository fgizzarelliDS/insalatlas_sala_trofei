import type { Manager, LeagueConcentrationAnalysis, ManagerAnalyticsProfile, DishonorShare } from '@/types';
import { calculateManagerScore } from '@/score';
import { computeDisasterMass, computeFeastMass, computeSmoothedFF, computeNetTailSkew, getNTIPolarity } from './tailRisk';
import { PRESTIGE_WEIGHTS, getManagerArchetype } from './archetypes';

/**
 * Computes multi-dimensional league concentration, clutch indices, and risk profiles.
 */
export function computeLeagueConcentration(managers: Manager[]): LeagueConcentrationAnalysis {
  const n = managers.length;

  if (n === 0) {
    return {
      totalTrophies: 0,
      totalPrestige: 0,
      totalDishonors: 0,
      giniTrophies: 0,
      giniPrestige: 0,
      giniRating: 0,
      cr3Pct: 0,
      cr3PrestigePct: 0,
      cr3DishonorPct: 0,
      hhi: 0,
      hhiDescription: 'Nessun Dato',
      hhiPrestige: 0,
      hhiPrestigeDescription: 'Nessun Dato',
      relativeEntropy: 0,
      relativeEntropyPrestige: 0,
      leagueAverageFF: 0,
      tierTitle: 'Dati Insufficienti',
      tierDescription: 'Nessun manager presente nel database.',
      tierColor: '#94a3b8',
      profiles: [],
      top3SilverwareNames: [],
      top3PrestigeNames: [],
      dishonorShares: []
    };
  }

  // League-wide aggregate FF for empirical Bayes prior
  const totalYears = managers.reduce((acc, m) => acc + (m.years || 0), 0);
  const totalLeagueTailMass = managers.reduce((acc, m) => {
    const fm = computeFeastMass(m.gold || 0, m.cup_gold || 0);
    const dm = computeDisasterMass(m.spoon || 0, m.cartonato || 0);
    return acc + fm + dm;
  }, 0);
  const leagueAverageFF = totalYears > 0 ? parseFloat((totalLeagueTailMass / totalYears).toFixed(2)) : 0.30;

  // 1. Compute Base Quantities & Profiles per manager
  const rawProfiles = managers.map(m => {
    const trophies = (m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0);
    const prestigeScore = parseFloat((
      (m.gold || 0) * PRESTIGE_WEIGHTS.gold +
      (m.cup_gold || 0) * PRESTIGE_WEIGHTS.cup_gold +
      (m.supercup || 0) * PRESTIGE_WEIGHTS.supercup +
      (m.mundialito || 0) * PRESTIGE_WEIGHTS.mundialito
    ).toFixed(2));
    const efficiency = m.years > 0 ? parseFloat((trophies / m.years).toFixed(2)) : 0;
    const prestigeEfficiency = m.years > 0 ? parseFloat((prestigeScore / m.years).toFixed(2)) : 0;

    const podiums = (m.gold || 0) + (m.silver || 0) + (m.bronze || 0);
    const podiumRatePct = m.years > 0 ? parseFloat(((podiums / m.years) * 100).toFixed(1)) : 0;
    const killerInstinctPct = podiums > 0 ? parseFloat((((m.gold || 0) / podiums) * 100).toFixed(1)) : 0;
    const finalsWon = (m.cup_gold || 0) + (m.supercup || 0);
    const finalsPlayed = finalsWon + (m.cup_silver || 0) + (m.supercup_silver || 0);
    const conversionRatePct = finalsPlayed > 0 ? parseFloat(((finalsWon / finalsPlayed) * 100).toFixed(1)) : 0;
    const dishonors = (m.spoon || 0) + (m.cartonato || 0); // Spoon (Last Place) + Cartonato (Playout)
    const feastMass = computeFeastMass(m.gold || 0, m.cup_gold || 0);
    const disasterMass = computeDisasterMass(m.spoon || 0, m.cartonato || 0);
    const totalTailMass = feastMass + disasterMass;
    const tailMass = totalTailMass;
    const feastOrFamineRatio = m.years > 0 ? parseFloat((totalTailMass / m.years).toFixed(2)) : 0;
    const smoothedFeastOrFamine = computeSmoothedFF(totalTailMass, m.years, 2.0, leagueAverageFF);
    const netTailSkew = computeNetTailSkew(feastMass, disasterMass, 1.5);
    const netTailIndex = parseFloat((smoothedFeastOrFamine * netTailSkew).toFixed(2));
    const polarity = getNTIPolarity(netTailIndex);
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
      smoothedFeastOrFamine,
      prestigeScore,
      prestigeEfficiency
    );

    return {
      id: m.id,
      name: m.name,
      years: m.years,
      gold: m.gold || 0,
      trophies,
      trophySharePct: 0,
      efficiency,
      prestigeScore,
      prestigeSharePct: 0,
      prestigeEfficiency,
      podiums,
      podiumRatePct,
      killerInstinctPct,
      finalsWon,
      finalsPlayed,
      conversionRatePct,
      dishonors,
      feastMass,
      disasterMass,
      tailMass,
      totalTailMass,
      feastOrFamineRatio,
      smoothedFeastOrFamine,
      netTailSkew,
      netTailSkewLabel: polarity.label,
      netTailIndex,
      polarityLabel: polarity.label,
      polarityColor: polarity.color,
      polarityIcon: polarity.icon,
      score,
      archetypeTag: archetype.tag,
      archetypeColor: archetype.color,
      archetypeIcon: archetype.icon
    };
  });

  const totalTrophies = rawProfiles.reduce((acc, p) => acc + p.trophies, 0);
  const totalPrestige = parseFloat(rawProfiles.reduce((acc, p) => acc + p.prestigeScore, 0).toFixed(2));
  const totalDishonors = rawProfiles.reduce((acc, p) => acc + p.dishonors, 0);

  // 2. Profiles with Silverware and Prestige Share
  const profiles: ManagerAnalyticsProfile[] = rawProfiles
    .map(p => ({
      ...p,
      trophySharePct: totalTrophies > 0 ? parseFloat(((p.trophies / totalTrophies) * 100).toFixed(1)) : 0,
      prestigeSharePct: totalPrestige > 0 ? parseFloat(((p.prestigeScore / totalPrestige) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.prestigeScore - a.prestigeScore || b.prestigeEfficiency - a.prestigeEfficiency);

  // 3. Top-3 Concentration Ratio (CR3) for Raw Trophies & Prestige
  const sortedByTrophies = [...profiles].sort((a, b) => b.trophies - a.trophies || b.efficiency - a.efficiency);
  const top3Trophies = sortedByTrophies.slice(0, 3).reduce((acc, p) => acc + p.trophies, 0);
  const cr3Pct = totalTrophies > 0 ? parseFloat(((top3Trophies / totalTrophies) * 100).toFixed(1)) : 0;
  const top3SilverwareNames = sortedByTrophies.slice(0, 3).filter(p => p.trophies > 0).map(p => p.name);

  const sortedByPrestige = [...profiles].sort((a, b) => b.prestigeScore - a.prestigeScore || b.prestigeEfficiency - a.prestigeEfficiency);
  const top3Prestige = sortedByPrestige.slice(0, 3).reduce((acc, p) => acc + p.prestigeScore, 0);
  const cr3PrestigePct = totalPrestige > 0 ? parseFloat(((top3Prestige / totalPrestige) * 100).toFixed(1)) : 0;
  const top3PrestigeNames = sortedByPrestige.slice(0, 3).filter(p => p.prestigeScore > 0).map(p => p.name);

  // 4. Herfindahl-Hirschman Index (HHI) for Raw Trophies & Prestige
  const hhi = totalTrophies > 0
    ? Math.round(profiles.reduce((acc, p) => acc + Math.pow(p.trophySharePct, 2), 0))
    : 0;

  let hhiDescription = 'Mercato Aperto (Parità)';
  if (hhi > 2500) {
    hhiDescription = 'Alta Concentrazione';
  } else if (hhi >= 1800) {
    hhiDescription = 'Moderata Concentrazione';
  }

  const hhiPrestige = totalPrestige > 0
    ? Math.round(profiles.reduce((acc, p) => acc + Math.pow(p.prestigeSharePct, 2), 0))
    : 0;

  let hhiPrestigeDescription = 'Mercato Aperto (Parità)';
  if (hhiPrestige > 2500) {
    hhiPrestigeDescription = 'Alta Concentrazione';
  } else if (hhiPrestige >= 1800) {
    hhiPrestigeDescription = 'Moderata Concentrazione';
  }

  // 5. Normalized Information Entropy (H_rel) for Raw Trophies & Prestige
  let entropyRawSum = 0;
  if (totalTrophies > 0 && n > 1) {
    for (const p of profiles) {
      if (p.trophies > 0) {
        const prob = p.trophies / totalTrophies;
        entropyRawSum += prob * Math.log(prob);
      }
    }
  }
  const relativeEntropy = (totalTrophies > 0 && n > 1)
    ? parseFloat(Math.max(0, Math.min(1, -entropyRawSum / Math.log(n))).toFixed(2))
    : 0;

  let entropyPrestigeSum = 0;
  if (totalPrestige > 0 && n > 1) {
    for (const p of profiles) {
      if (p.prestigeScore > 0) {
        const prob = p.prestigeScore / totalPrestige;
        entropyPrestigeSum += prob * Math.log(prob);
      }
    }
  }
  const relativeEntropyPrestige = (totalPrestige > 0 && n > 1)
    ? parseFloat(Math.max(0, Math.min(1, -entropyPrestigeSum / Math.log(n))).toFixed(2))
    : 0;

  // 6. Gini on Raw Major Silverware & Prestige
  const sortedTrophiesAsc = [...profiles].sort((a, b) => a.trophies - b.trophies);
  let cumulativeTrophySum = 0;
  for (let i = 0; i < n; i++) {
    cumulativeTrophySum += (i + 1) * sortedTrophiesAsc[i].trophies;
  }
  const giniTrophies = totalTrophies > 0
    ? parseFloat(Math.max(0, Math.min(1, (2 * cumulativeTrophySum) / (n * totalTrophies) - (n + 1) / n)).toFixed(2))
    : 0;

  const sortedPrestigeAsc = [...profiles].sort((a, b) => a.prestigeScore - b.prestigeScore);
  let cumulativePrestigeSum = 0;
  for (let i = 0; i < n; i++) {
    cumulativePrestigeSum += (i + 1) * sortedPrestigeAsc[i].prestigeScore;
  }
  const giniPrestige = totalPrestige > 0
    ? parseFloat(Math.max(0, Math.min(1, (2 * cumulativePrestigeSum) / (n * totalPrestige) - (n + 1) / n)).toFixed(2))
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

  // 9. Qualitative Narrative Tier (Evaluated on default Prestige model)
  const isExtremeMonopoly = (giniPrestige > 0.75 && cr3PrestigePct >= 72) || hhiPrestige >= 2500;
  const isOligarchy = giniPrestige > 0.55 || cr3PrestigePct >= 58 || hhiPrestige >= 1800;
  const isAbsoluteParity = giniPrestige <= 0.40 && cr3PrestigePct <= 45 && hhiPrestige < 1400;

  let tierTitle = 'Competizione Aperta';
  let tierDescription = 'Alternanza equilibrata con rotazione dei campioni e classe media viva.';
  let tierColor = '#3b82f6';

  if (isAbsoluteParity) {
    tierTitle = 'Far West (Parità Assoluta)';
    tierDescription = 'Campionato anarchico: il potere è frammentato e chiunque può vincere.';
    tierColor = '#10b981'; // Green
  } else if (isExtremeMonopoly) {
    tierTitle = 'Feudalesimo Assoluto';
    tierDescription = 'Monopolio dinastico: pochissime squadre (1-2) accentrano quasi tutti i titoli pesanti.';
    tierColor = '#ef4444'; // Red
  } else if (isOligarchy) {
    tierTitle = 'Lega a Tre Velocità';
    tierDescription = 'Oligarchia consolidata: una cerchia ristretta (3-4 potenze) si contende i titoli.';
    tierColor = '#f59e0b'; // Amber
  }

  return {
    totalTrophies,
    totalPrestige,
    totalDishonors,
    giniTrophies,
    giniPrestige,
    giniRating,
    cr3Pct,
    cr3PrestigePct,
    cr3DishonorPct,
    hhi,
    hhiDescription,
    hhiPrestige,
    hhiPrestigeDescription,
    relativeEntropy,
    relativeEntropyPrestige,
    leagueAverageFF,
    tierTitle,
    tierDescription,
    tierColor,
    profiles,
    top3SilverwareNames,
    top3PrestigeNames,
    dishonorShares
  };
}
