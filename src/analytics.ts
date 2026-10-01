import type { Manager, LeagueConcentrationAnalysis, ManagerTrophyShare, DishonorShare } from './types';
import { calculateManagerScore } from './score';

/**
 * Computes econometric concentration metrics on major wins, points, and dishonors (Cartonato).
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
      tierTitle: 'Dati Insufficienti',
      tierDescription: 'Nessun manager presente nel database.',
      tierColor: '#94a3b8',
      shares: [],
      top3Names: [],
      dishonorShares: []
    };
  }

  // 1. Calculate major trophies per manager (gold + cup_gold + supercup + mundialito)
  const managerTrophies = managers.map(m => {
    const trophies = (m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0);
    const efficiency = m.years > 0 ? parseFloat((trophies / m.years).toFixed(2)) : 0;
    return {
      id: m.id,
      name: m.name,
      years: m.years,
      trophies,
      efficiency,
      score: calculateManagerScore(m)
    };
  });

  const totalTrophies = managerTrophies.reduce((acc, m) => acc + m.trophies, 0);

  // 2. Shares and ranking
  const shares: ManagerTrophyShare[] = managerTrophies
    .map(m => ({
      id: m.id,
      name: m.name,
      trophies: m.trophies,
      sharePct: totalTrophies > 0 ? parseFloat(((m.trophies / totalTrophies) * 100).toFixed(1)) : 0,
      years: m.years,
      efficiency: m.efficiency
    }))
    .sort((a, b) => b.trophies - a.trophies || b.efficiency - a.efficiency);

  // 3. Top-3 Concentration Ratio (CR3)
  const top3Trophies = shares.slice(0, 3).reduce((acc, s) => acc + s.trophies, 0);
  const cr3Pct = totalTrophies > 0 ? parseFloat(((top3Trophies / totalTrophies) * 100).toFixed(1)) : 0;
  const top3Names = shares.slice(0, 3).filter(s => s.trophies > 0).map(s => s.name);

  // 4. Herfindahl-Hirschman Index (HHI)
  const hhi = totalTrophies > 0
    ? Math.round(shares.reduce((acc, s) => acc + Math.pow(s.sharePct, 2), 0))
    : 0;

  let hhiDescription = 'Mercato Aperto (Parità)';
  if (hhi > 2500) {
    hhiDescription = 'Mercato Chiuso (Oligarchia)';
  } else if (hhi >= 1500) {
    hhiDescription = 'Moderata Concentrazione';
  }

  // 5. Gini on Major wins
  const sortedTrophiesAsc = [...shares].sort((a, b) => a.trophies - b.trophies);
  let cumulativeTrophySum = 0;
  for (let i = 0; i < n; i++) {
    cumulativeTrophySum += (i + 1) * sortedTrophiesAsc[i].trophies;
  }
  const giniTrophies = totalTrophies > 0
    ? parseFloat(Math.max(0, Math.min(1, (2 * cumulativeTrophySum) / (n * totalTrophies) - (n + 1) / n)).toFixed(2))
    : 0;

  // 6. Gini on Historical Rating (Offset to non-negative domain)
  const rawScores = managerTrophies.map(m => m.score);
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

  // 7. Dishonor Concentration
  const managerDishonors = managers.map(m => ({
    name: m.name,
    count: m.cartonato || 0
  }));
  const totalDishonors = managerDishonors.reduce((acc, m) => acc + m.count, 0);
  const dishonorShares: DishonorShare[] = managerDishonors
    .map(m => ({
      name: m.name,
      count: m.count,
      sharePct: totalDishonors > 0 ? parseFloat(((m.count / totalDishonors) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.count - a.count);

  const top3Dishonors = dishonorShares.slice(0, 3).reduce((acc, d) => acc + d.count, 0);
  const cr3DishonorPct = totalDishonors > 0 ? parseFloat(((top3Dishonors / totalDishonors) * 100).toFixed(1)) : 0;

  // 8. Qualitative Tiering
  let tierTitle = 'Competizione Aperta';
  let tierDescription = 'Alternanza regolare al vertice con una classe media competitiva.';
  let tierColor = '#3b82f6';

  if (giniTrophies <= 0.30 && cr3Pct <= 45) {
    tierTitle = 'Far West (Parità Assoluta)';
    tierDescription = 'Campionato imprevedibile: il potere è frammentato e chiunque può vincere.';
    tierColor = '#10b981';
  } else if (giniTrophies > 0.60 || cr3Pct >= 70) {
    tierTitle = 'Feudalesimo Assoluto';
    tierDescription = 'Monopolio dinastico: pochissime squadre accentrano quasi tutti i titoli.';
    tierColor = '#ef4444';
  } else if (giniTrophies > 0.45 || cr3Pct >= 55) {
    tierTitle = 'Lega a Tre Velocità';
    tierDescription = 'Oligarchia consolidata: una cerchia ristretta si contende la maggior parte dei titoli.';
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
    tierTitle,
    tierDescription,
    tierColor,
    shares,
    top3Names,
    dishonorShares
  };
}
