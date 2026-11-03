import type {
  Manager,
  TradingCardBadge,
  StabilityProfile,
  TieredManagerBadge,
  ManagerBadgeScoreboard,
  BadgeTier
} from '@/types';
import { getManagerArchetype } from './archetypes';
import { computeTailRiskProfile } from './tailRisk';
import { computeManagerClutchMetrics } from './econometrics';

/**
 * Computes stability category, oscillation metrics, and badge metadata for a manager.
 * Based on rank standard deviation (sigma_R) across championship seasons:
 * - < 3 seasons: Esordiente (Rookie)
 * - >= 3 seasons:
 *   - sigma_R < 2.0: Metronomo di Lega
 *   - 2.0 <= sigma_R <= 3.5: Equilibrato
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
      category: 'equilibrato',
      label: 'Equilibrato',
      badgeLabel: 'Stabilità: Equilibrato',
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

  // 4. Global Clutch Index (GCI) & Cold-Bloodedness
  const clutchMetrics = computeManagerClutchMetrics(manager);
  const clutchBadgeLabel = `Freddezza: ${clutchMetrics.clutch.label}`;

  badges.push({
    label: clutchBadgeLabel,
    icon: clutchMetrics.clutch.icon,
    customStyle: `background: ${clutchMetrics.clutch.color}25; color: ${clutchMetrics.clutch.color}; border: 1px solid ${clutchMetrics.clutch.color}60;`
  });

  // 5. Harmonized Honorary & Merit Badges
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

/**
 * Evaluates progress against a 4-tier milestone ladder (Bronze -> Silver -> Gold -> Platinum).
 */
function evaluateTierMilestone(
  value: number,
  tiers: { bronze: number; silver: number; gold: number; platinum: number }
): {
  tier: BadgeTier | 'locked';
  currentTier: BadgeTier | null;
  nextTier: BadgeTier | null;
  targetValue: number;
  nextTargetValue: number | null;
  progressPercent: number;
  pointsScore: number;
  tierLabel: string;
  tierColor: string;
  tierBg: string;
  tierBorder: string;
} {
  if (value >= tiers.platinum) {
    return {
      tier: 'platinum',
      currentTier: 'platinum',
      nextTier: null,
      targetValue: tiers.platinum,
      nextTargetValue: null,
      progressPercent: 100,
      pointsScore: 10,
      tierLabel: 'Platino',
      tierColor: '#38bdf8',
      tierBg: 'rgba(56, 189, 248, 0.16)',
      tierBorder: 'rgba(56, 189, 248, 0.45)'
    };
  }

  if (value >= tiers.gold) {
    const range = tiers.platinum - tiers.gold;
    const progress = range > 0 ? Math.min(100, Math.round(((value - tiers.gold) / range) * 100)) : 100;
    return {
      tier: 'gold',
      currentTier: 'gold',
      nextTier: 'platinum',
      targetValue: tiers.gold,
      nextTargetValue: tiers.platinum,
      progressPercent: progress,
      pointsScore: 5,
      tierLabel: 'Oro',
      tierColor: '#eab308',
      tierBg: 'rgba(234, 179, 8, 0.16)',
      tierBorder: 'rgba(234, 179, 8, 0.45)'
    };
  }

  if (value >= tiers.silver) {
    const range = tiers.gold - tiers.silver;
    const progress = range > 0 ? Math.min(100, Math.round(((value - tiers.silver) / range) * 100)) : 100;
    return {
      tier: 'silver',
      currentTier: 'silver',
      nextTier: 'gold',
      targetValue: tiers.silver,
      nextTargetValue: tiers.gold,
      progressPercent: progress,
      pointsScore: 3,
      tierLabel: 'Argento',
      tierColor: '#94a3b8',
      tierBg: 'rgba(148, 163, 184, 0.14)',
      tierBorder: 'rgba(148, 163, 184, 0.35)'
    };
  }

  if (value >= tiers.bronze) {
    const range = tiers.silver - tiers.bronze;
    const progress = range > 0 ? Math.min(100, Math.round(((value - tiers.bronze) / range) * 100)) : 100;
    return {
      tier: 'bronze',
      currentTier: 'bronze',
      nextTier: 'silver',
      targetValue: tiers.bronze,
      nextTargetValue: tiers.silver,
      progressPercent: progress,
      pointsScore: 1,
      tierLabel: 'Bronzo',
      tierColor: '#d97706',
      tierBg: 'rgba(217, 119, 6, 0.14)',
      tierBorder: 'rgba(217, 119, 6, 0.35)'
    };
  }

  const progress = tiers.bronze > 0 ? Math.min(100, Math.round((Math.max(0, value) / tiers.bronze) * 100)) : 0;
  return {
    tier: 'locked',
    currentTier: null,
    nextTier: 'bronze',
    targetValue: tiers.bronze,
    nextTargetValue: tiers.bronze,
    progressPercent: progress,
    pointsScore: 0,
    tierLabel: 'Bloccato',
    tierColor: '#64748b',
    tierBg: 'rgba(100, 116, 139, 0.08)',
    tierBorder: 'rgba(100, 116, 139, 0.2)'
  };
}

/**
 * Computes official 4-tier milestone badges for a manager across the 8 Hall of Fame verticals:
 * 1. Bacheca Reale (Palmarès Maggiore)
 * 2. Continuità Dinastica (Anni a Podio Consecutivi)
 * 3. Maratoneta di Lega (Stagioni Giocate)
 * 4. Club dei Punti (Punti Assoluti)
 * 5. Maestro dei Duelli (Scontri Diretti Storici Vinti)
 * 6. Collezionista di Cucchiai (Ultimi Posti)
 * 7. Incubo Playout (Cartonati)
 * 8. Muro d'Acciaio (Clean Sheet Placeholder)
 */
export function computeTieredManagerBadges(
  manager: Manager,
  allManagers: Manager[] = []
): TieredManagerBadge[] {
  const badges: TieredManagerBadge[] = [];

  // 1. Bacheca Reale (Major Titles: Scudetti + Coppe + Supercoppe + Mundialito)
  const totalMajor =
    (manager.gold || 0) +
    (manager.cup_gold || 0) +
    (manager.supercup || 0) +
    (manager.mundialito || 0);
  const evalMajor = evaluateTierMilestone(totalMajor, { bronze: 1, silver: 3, gold: 5, platinum: 8 });
  badges.push({
    id: 'bacheca_reale',
    name: 'Bacheca Reale',
    description: 'Trofei maggiori vinti in carriera (Scudetti, Coppe, Supercoppe, Mundialito)',
    category: 'dynasty',
    icon: 'fa-solid fa-trophy',
    currentValue: totalMajor,
    isUnlocked: evalMajor.tier !== 'locked',
    ...evalMajor
  });

  // 2. Continuità Dinastica (Consecutive Podium Finishes: 1°-3° posto)
  const validHistory = (manager.history || [])
    .filter(h => typeof h.rank === 'number' && h.rank > 0 && !h.in_progress && h.status !== 'in_progress')
    .sort((a, b) => a.season.localeCompare(b.season));

  let maxPodiumStreak = 0;
  let currentPodiumStreak = 0;
  for (const h of validHistory) {
    if (h.rank! <= 3) {
      currentPodiumStreak++;
      if (currentPodiumStreak > maxPodiumStreak) maxPodiumStreak = currentPodiumStreak;
    } else {
      currentPodiumStreak = 0;
    }
  }
  const evalPodium = evaluateTierMilestone(maxPodiumStreak, { bronze: 2, silver: 3, gold: 4, platinum: 5 });
  badges.push({
    id: 'continuita_dinastica',
    name: 'Continuità Dinastica',
    description: 'Stagioni consecutive concluse a podio (1°-3° posto) in campionato',
    category: 'dynasty',
    icon: 'fa-solid fa-crown',
    currentValue: maxPodiumStreak,
    isUnlocked: evalPodium.tier !== 'locked',
    ...evalPodium
  });

  // 3. Maratoneta di Lega (Seasons Played Loyalty)
  const seasonsPlayed = manager.years || 0;
  const evalSeasons = evaluateTierMilestone(seasonsPlayed, { bronze: 3, silver: 6, gold: 9, platinum: 12 });
  badges.push({
    id: 'maratoneta',
    name: 'Maratoneta di Lega',
    description: 'Edizioni di campionato disputate nella storia della lega',
    category: 'milestone',
    icon: 'fa-solid fa-hourglass-half',
    currentValue: seasonsPlayed,
    isUnlocked: evalSeasons.tier !== 'locked',
    ...evalSeasons
  });

  // 4. Club dei Punti (Total Championship Points)
  const totalPoints = (manager.history || [])
    .reduce((acc, h) => acc + (typeof h.points === 'number' && h.points > 0 ? h.points : 0), 0);
  const roundedPoints = Math.round(totalPoints);
  const evalPoints = evaluateTierMilestone(roundedPoints, { bronze: 150, silver: 300, gold: 450, platinum: 550 });
  badges.push({
    id: 'mille_punti',
    name: 'Club dei Punti',
    description: 'Punti assoluti conquistati nella storia del campionato',
    category: 'milestone',
    icon: 'fa-solid fa-chart-line',
    currentValue: roundedPoints,
    isUnlocked: evalPoints.tier !== 'locked',
    ...evalPoints
  });

  // 5. Maestro dei Duelli (Head-to-head season duels won)
  let duelWins = 0;
  if (allManagers && allManagers.length > 0) {
    const myHistory: Record<string, number> = {};
    (manager.history || []).forEach(h => {
      if (typeof h.rank === 'number' && h.rank > 0 && !h.in_progress && h.status !== 'in_progress') {
        myHistory[h.season] = h.rank;
      }
    });

    allManagers.forEach(other => {
      if (other.id === manager.id) return;
      (other.history || []).forEach(h => {
        if (typeof h.rank === 'number' && h.rank > 0 && !h.in_progress && h.status !== 'in_progress') {
          const myRank = myHistory[h.season];
          if (myRank !== undefined && myRank < h.rank) {
            duelWins++;
          }
        }
      });
    });
  }
  const evalDuels = evaluateTierMilestone(duelWins, { bronze: 15, silver: 30, gold: 50, platinum: 70 });
  badges.push({
    id: 'duellante_eccelso',
    name: 'Maestro dei Duelli',
    description: 'Duelli diretti stagionali vinti chiudendo davanti a un rivale di lega',
    category: 'milestone',
    icon: 'fa-solid fa-shield-halved',
    currentValue: duelWins,
    isUnlocked: evalDuels.tier !== 'locked',
    ...evalDuels
  });

  // 6. Collezionista di Cucchiai (Wooden Spoons)
  const spoons = manager.spoon || 0;
  const evalSpoons = evaluateTierMilestone(spoons, { bronze: 1, silver: 2, gold: 3, platinum: 4 });
  badges.push({
    id: 'collezionista_cucchiai',
    name: 'Collezionista di Cucchiai',
    description: 'Cucchiai di legno (ultimi posti in campionato) collezionati',
    category: 'irony',
    icon: 'fa-solid fa-utensils',
    currentValue: spoons,
    isUnlocked: evalSpoons.tier !== 'locked',
    ...evalSpoons
  });

  // 7. Incubo Playout (Cartonati)
  const cartonati = manager.cartonato || 0;
  const evalCartonati = evaluateTierMilestone(cartonati, { bronze: 1, silver: 2, gold: 3, platinum: 4 });
  badges.push({
    id: 'incubo_playout',
    name: 'Incubo Playout',
    description: 'Trofei del Cartonato vinti nei playout o coppa dei perdenti',
    category: 'irony',
    icon: 'fa-solid fa-skull-crossbones',
    currentValue: cartonati,
    isUnlocked: evalCartonati.tier !== 'locked',
    ...evalCartonati
  });

  // 8. Muro d'Acciaio (Clean Sheet & Iron Defense - Placeholder)
  badges.push({
    id: 'muro_acciaio',
    name: "Muro d'Acciaio",
    description: "Clean Sheet difensivi e partite sub-66 concesse (In arrivo con l'archivio matchday pre-2025)",
    category: 'performance',
    icon: 'fa-solid fa-lock',
    tier: 'locked',
    currentTier: null,
    nextTier: 'bronze',
    currentValue: 0,
    targetValue: 10,
    nextTargetValue: 10,
    progressPercent: 0,
    pointsScore: 0,
    isUnlocked: false,
    isPlaceholder: true,
    tierLabel: 'In Arrivo',
    tierColor: '#64748b',
    tierBg: 'rgba(100, 116, 139, 0.08)',
    tierBorder: 'rgba(100, 116, 139, 0.2)'
  });

  return badges;
}

/**
 * Computes league-wide Hall of Fame scoreboard ranked by cumulative badge score:
 * (1 pt Bronze, 3 pt Silver, 5 pt Gold, 10 pt Platinum).
 */
export function computeManagerBadgeScoreboard(managers: Manager[]): ManagerBadgeScoreboard[] {
  const scoreboard: ManagerBadgeScoreboard[] = managers.map(m => {
    const badges = computeTieredManagerBadges(m, managers);
    let totalScore = 0;
    let bronzeCount = 0;
    let silverCount = 0;
    let goldCount = 0;
    let platinumCount = 0;

    badges.forEach(b => {
      totalScore += b.pointsScore;
      if (b.currentTier === 'bronze') bronzeCount++;
      else if (b.currentTier === 'silver') silverCount++;
      else if (b.currentTier === 'gold') goldCount++;
      else if (b.currentTier === 'platinum') platinumCount++;
    });

    return {
      managerId: m.id,
      managerName: m.name,
      totalScore,
      bronzeCount,
      silverCount,
      goldCount,
      platinumCount,
      badges
    };
  });

  scoreboard.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.platinumCount !== a.platinumCount) return b.platinumCount - a.platinumCount;
    if (b.goldCount !== a.goldCount) return b.goldCount - a.goldCount;
    if (b.silverCount !== a.silverCount) return b.silverCount - a.silverCount;
    return b.bronzeCount - a.bronzeCount;
  });

  return scoreboard;
}
