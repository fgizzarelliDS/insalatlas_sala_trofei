import type { Manager, TradingCardBadge, StabilityProfile } from '@/types';
import { getManagerArchetype } from './archetypes';
import { computeTailRiskProfile } from './tailRisk';

/**
 * Computes stability category, oscillation metrics, and badge metadata for a manager.
 * Based on rank standard deviation (sigma_R) across championship seasons:
 * - < 3 seasons: Esordiente (Rookie)
 * - >= 3 seasons:
 *   - sigma_R < 2.0: Metronomo di Lega
 *   - 2.0 <= sigma_R <= 3.5: Rendimento Costante
 *   - sigma_R > 3.5: Montagna Russa
 */
export function computeStabilityProfile(manager: Manager): StabilityProfile {
  const ranksList = (manager.history || [])
    .map(h => h.rank)
    .filter((r): r is number => typeof r === 'number' && r > 0);

  const seasonsPlayed = ranksList.length > 0 ? ranksList.length : (manager.years || 0);

  if (seasonsPlayed < 3 || ranksList.length < 3) {
    return {
      category: 'esordiente',
      label: 'Esordiente',
      badgeLabel: 'Stabilità: Esordiente',
      stdDevRank: 0,
      icon: 'fa-seedling',
      emoji: '🌱',
      color: '#94a3b8'
    };
  }

  const avgRank = ranksList.reduce((acc, v) => acc + v, 0) / ranksList.length;
  const variance =
    ranksList.reduce((acc, v) => acc + Math.pow(v - avgRank, 2), 0) / ranksList.length;
  const stdDevRank = parseFloat(Math.sqrt(variance).toFixed(2));

  if (stdDevRank < 2.0) {
    return {
      category: 'metronomo',
      label: 'Metronomo di Lega',
      badgeLabel: 'Stabilità: Metronomo di Lega',
      stdDevRank,
      icon: 'fa-stopwatch',
      emoji: '⏱️',
      color: '#10b981'
    };
  } else if (stdDevRank <= 3.5) {
    return {
      category: 'regolare',
      label: 'Rendimento Costante',
      badgeLabel: 'Stabilità: Rendimento Costante',
      stdDevRank,
      icon: 'fa-scale-balanced',
      emoji: '⚖️',
      color: '#3b82f6'
    };
  } else {
    return {
      category: 'altalenante',
      label: 'Montagna Russa',
      badgeLabel: 'Stabilità: Montagna Russa',
      stdDevRank,
      icon: 'fa-wave-square',
      emoji: '🎢',
      color: '#f59e0b'
    };
  }
}

/**
 * Computes unified honorary and behavioral badges for a manager.
 * Single source of truth used across Profile Modal, Trading Card, and Share cards.
 */
export function computeManagerBadges(manager: Manager): TradingCardBadge[] {
  const badges: TradingCardBadge[] = [];

  const totalMajor =
    (manager.gold || 0) +
    (manager.cup_gold || 0) +
    (manager.supercup || 0) +
    (manager.mundialito || 0);
  const efficiency = manager.years > 0 ? parseFloat((totalMajor / manager.years).toFixed(2)) : 0;

  // 1. Behavioral Archetype
  const arch = getManagerArchetype(manager, totalMajor, efficiency);
  badges.push({
    label: `Profilo: ${arch.tag}`,
    icon: arch.icon,
    customStyle: `background: ${arch.color}25; color: ${arch.color}; border: 1px solid ${arch.color}60;`
  });

  // 2. Net Tail Risk (NTI) Polarity
  const risk = computeTailRiskProfile(manager);
  badges.push({
    label: `Rischio: ${risk.label}`,
    icon: risk.icon,
    customStyle: `background: ${risk.color}25; color: ${risk.color}; border: 1px solid ${risk.color}60;`
  });

  // 3. Historical Stability (Position Dispersion)
  const stability = computeStabilityProfile(manager);
  badges.push({
    label: stability.badgeLabel,
    icon: stability.icon,
    customStyle: `background: ${stability.color}25; color: ${stability.color}; border: 1px solid ${stability.color}60;`
  });

  // 4. Harmonized Honorary & Merit Badges
  if (manager.years >= 6) {
    badges.push({
      label: 'Veterano della Lega',
      icon: 'fa-shield-halved',
      color: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/60'
    });
  }
  if (totalMajor >= 4) {
    badges.push({
      label: 'Re dei Titoli',
      icon: 'fa-crown',
      color: 'bg-amber-900/60 text-amber-300 border-amber-600/60'
    });
  }
  if ((manager.gold || 0) >= 2) {
    badges.push({
      label: 'Campione Seriale',
      icon: 'fa-star',
      color: 'bg-yellow-900/60 text-yellow-300 border-yellow-600/60'
    });
  }
  if ((manager.gold || 0) >= 1 && (manager.cup_gold || 0) >= 1) {
    badges.push({
      label: 'Double Winner',
      icon: 'fa-star',
      color: 'bg-yellow-900/60 text-yellow-300 border-yellow-600/60'
    });
  }
  if ((manager.cup_gold || 0) + (manager.supercup || 0) >= 3) {
    badges.push({
      label: 'Re delle Coppe',
      icon: 'fa-trophy',
      color: 'bg-blue-900/60 text-blue-300 border-blue-600/60'
    });
  }
  if ((manager.cartonato || 0) >= 2) {
    badges.push({
      label: 'Incubo Playout',
      icon: 'fa-skull-crossbones',
      color: 'bg-rose-950/70 text-rose-300 border-rose-700/60'
    });
  }
  if ((manager.spoon || 0) >= 2) {
    badges.push({
      label: 'Collezionista Cucchiai',
      icon: 'fa-utensils',
      color: 'bg-amber-950/80 text-amber-500 border-amber-800/60'
    });
  }

  return badges;
}
