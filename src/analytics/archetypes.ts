import type { Manager } from '@/types';
import { computeDisasterMass, computeFeastMass, computeSmoothedFF } from './tailRisk';

export const PRESTIGE_WEIGHTS = {
  gold: 3.0,
  cup_gold: 1.5,
  supercup: 0.75,
  mundialito: 0.50
} as const;

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
  smoothedFF?: number,
  prestigeScore?: number,
  prestigeEfficiency?: number
): { tag: string; color: string; icon: string } {
  const actualTrophies = trophies !== undefined ? trophies : ((m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0));
  const actualEfficiency = efficiency !== undefined ? efficiency : (m.years > 0 ? actualTrophies / m.years : 0);
  const actualPrestige = prestigeScore !== undefined
    ? prestigeScore
    : parseFloat(((m.gold || 0) * PRESTIGE_WEIGHTS.gold + (m.cup_gold || 0) * PRESTIGE_WEIGHTS.cup_gold + (m.supercup || 0) * PRESTIGE_WEIGHTS.supercup + (m.mundialito || 0) * PRESTIGE_WEIGHTS.mundialito).toFixed(2));
  const actualPrestigeEfficiency = prestigeEfficiency !== undefined
    ? prestigeEfficiency
    : (m.years > 0 ? parseFloat((actualPrestige / m.years).toFixed(2)) : 0);

  const actualPodiums = podiums !== undefined ? podiums : ((m.gold || 0) + (m.silver || 0) + (m.bronze || 0));
  const actualPodiumRatePct = podiumRatePct !== undefined ? podiumRatePct : (m.years > 0 ? (actualPodiums / m.years) * 100 : 0);
  const actualKillerInstinctPct = killerInstinctPct !== undefined ? killerInstinctPct : (actualPodiums > 0 ? ((m.gold || 0) / actualPodiums) * 100 : 0);
  const finalsWon = (m.cup_gold || 0) + (m.supercup || 0);
  const actualFinalsPlayed = finalsPlayed !== undefined ? finalsPlayed : (finalsWon + (m.cup_silver || 0) + (m.supercup_silver || 0));
  const actualConversionRatePct = conversionRatePct !== undefined ? conversionRatePct : (actualFinalsPlayed > 0 ? (finalsWon / actualFinalsPlayed) * 100 : 0);
  const actualDishonors = dishonors !== undefined ? dishonors : ((m.spoon || 0) + (m.cartonato || 0));
  const dm = computeDisasterMass(m.spoon || 0, m.cartonato || 0);
  const fm = computeFeastMass(m.gold || 0, m.cup_gold || 0);
  const tm = fm + dm;
  const actualSmoothedFF = smoothedFF !== undefined ? smoothedFF : computeSmoothedFF(tm, m.years, 2.0, 0.30);

  // 1. Dominatore Dinastico: (Prestige >= 10 e (Prestige Efficiency >= 0.50 o Efficienza >= 0.40)) OPPURE (Scudetti >= 2 e Prestige >= 7.00)
  if ((actualPrestige >= 10 && (actualPrestigeEfficiency >= 0.50 || actualEfficiency >= 0.40)) || ((m.gold || 0) >= 2 && actualPrestige >= 7.00)) {
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
  if (((m.silver || 0) + (m.cup_silver || 0) + (m.supercup_silver || 0)) >= 2 && actualConversionRatePct <= 35) {
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

  // 9. Partecipante: Default
  return {
    tag: 'Partecipante',
    color: '#94a3b8', // Slate
    icon: 'fa-user-tie'
  };
}
