import type { Manager, HeadToHeadStats, SharedSeasonDuel } from '@/types';
import { calculateManagerScore } from '@/score';
import { computeManagerClutchMetrics } from './econometrics';
import { computeTailRiskProfile } from './tailRisk';
import { computeStabilityProfile } from './badges';
import { getManagerArchetype } from './archetypes';

/**
 * Computes deep Head-to-Head analytics between two managers:
 * - Direct season duels (shared seasons, relative ranks, wins/losses/ties)
 * - Side-by-side trophy palmares
 * - Advanced econometric indicators (Rating, GCI, NTI, Stability, Archetype)
 * - Dynamic narrative verdict
 */
export function computeHeadToHead(managerA: Manager, managerB: Manager): HeadToHeadStats {
  const historyA = (managerA.history || []).filter(
    (h): h is typeof h & { rank: number } =>
      !h.in_progress && h.status !== 'in_progress' && typeof h.rank === 'number' && h.rank > 0
  );
  const historyB = (managerB.history || []).filter(
    (h): h is typeof h & { rank: number } =>
      !h.in_progress && h.status !== 'in_progress' && typeof h.rank === 'number' && h.rank > 0
  );

  const duels: SharedSeasonDuel[] = [];
  let winsA = 0;
  let winsB = 0;
  let ties = 0;

  historyA.forEach(hA => {
    const hB = historyB.find(item => item.season === hA.season);
    if (hB) {
      let winner: 'A' | 'B' | 'tie' = 'tie';
      if (hA.rank < hB.rank) {
        winner = 'A';
        winsA++;
      } else if (hB.rank < hA.rank) {
        winner = 'B';
        winsB++;
      } else {
        ties++;
      }
      duels.push({
        season: hA.season,
        rankA: hA.rank,
        rankB: hB.rank,
        winner,
        teamA: hA.team || undefined,
        teamB: hB.team || undefined
      });
    }
  });

  // Sort duels chronologically (most recent first)
  duels.sort((a, b) => b.season.localeCompare(a.season));

  const totalTitlesA =
    (managerA.gold || 0) +
    (managerA.cup_gold || 0) +
    (managerA.supercup || 0) +
    (managerA.mundialito || 0);
  const totalTitlesB =
    (managerB.gold || 0) +
    (managerB.cup_gold || 0) +
    (managerB.supercup || 0) +
    (managerB.mundialito || 0);

  const scoreA = calculateManagerScore(managerA);
  const scoreB = calculateManagerScore(managerB);

  const getMetrics = (m: Manager, totalTitles: number, score: number) => {
    const clutchMetrics = computeManagerClutchMetrics(m);
    const risk = computeTailRiskProfile(m);
    const stability = computeStabilityProfile(m);
    const efficiency = m.years > 0 ? parseFloat((totalTitles / m.years).toFixed(2)) : 0;
    const arch = getManagerArchetype(m, totalTitles, efficiency);

    return {
      score,
      gci: clutchMetrics.gci,
      clutchLabel: clutchMetrics.clutch.label,
      clutchIcon: clutchMetrics.clutch.icon,
      clutchColor: clutchMetrics.clutch.color,
      kiPct: clutchMetrics.kiPct,
      crPct: clutchMetrics.crPct,
      nti: risk.nti,
      polarityLabel: risk.label,
      polarityIcon: risk.icon,
      polarityColor: risk.color,
      stabilityCategory: stability.label,
      stabilityIcon: stability.icon,
      stdDevRank: stability.stdDevRank,
      archetypeTag: arch.tag,
      archetypeIcon: arch.icon,
      archetypeColor: arch.color
    };
  };

  const metricsA = getMetrics(managerA, totalTitlesA, scoreA);
  const metricsB = getMetrics(managerB, totalTitlesB, scoreB);

  // Dynamic narrative verdict generator
  let verdict = '';
  const totalShared = duels.length;

  if (totalShared === 0) {
    verdict = `Nessuna stagione disputata contemporaneamente nella lega. Il confronto è puramente teorico basato sui rispettivi palmarès e indici storici.`;
  } else if (winsA > winsB) {
    const diff = winsA - winsB;
    verdict = `${managerA.name} guida il bilancio storico degli scontri diretti (+${diff} ${diff === 1 ? 'vittoria' : 'vittorie'}) su ${totalShared} ${totalShared === 1 ? 'campionato condiviso' : 'campionati condivisi'}. `;
    if (metricsA.gci > metricsB.gci) {
      verdict += `Vanta inoltre una maggior freddezza nei momenti decisivi (${metricsA.clutchIcon} ${metricsA.clutchLabel} vs ${metricsB.clutchIcon} ${metricsB.clutchLabel}).`;
    } else if (metricsB.gci > metricsA.gci) {
      verdict += `Tuttavia, ${managerB.name} si dimostra più cinico nelle finali e negli atti conclusivi (${metricsB.clutchIcon} ${metricsB.clutchLabel}).`;
    } else {
      verdict += `I due contendenti condividono lo stesso livello di freddezza (${metricsA.clutchIcon} ${metricsA.clutchLabel}).`;
    }
  } else if (winsB > winsA) {
    const diff = winsB - winsA;
    verdict = `${managerB.name} comanda il testa a testa storico (+${diff} ${diff === 1 ? 'vittoria' : 'vittorie'}) su ${totalShared} ${totalShared === 1 ? 'campionato condiviso' : 'campionati condivisi'}. `;
    if (metricsB.gci > metricsA.gci) {
      verdict += `Accompagna il vantaggio con una superiore freddezza nelle finali (${metricsB.clutchIcon} ${metricsB.clutchLabel} vs ${metricsA.clutchIcon} ${metricsA.clutchLabel}).`;
    } else if (metricsA.gci > metricsB.gci) {
      verdict += `Nonostante il gap nei piazzamenti, ${managerA.name} risponde con una maggior freddezza da titolo (${metricsA.clutchIcon} ${metricsA.clutchLabel}).`;
    } else {
      verdict += `Entrambi registrano analoga freddezza (${metricsA.clutchIcon} ${metricsA.clutchLabel}).`;
    }
  } else {
    verdict = `Perfetta parità negli scontri diretti: ${winsA} vittorie a testa${ties > 0 ? ` e ${ties} ${ties === 1 ? 'pareggio' : 'pareggi'}` : ''} su ${totalShared} stagioni condivise. `;
    if (scoreA !== scoreB) {
      const ahead = scoreA > scoreB ? managerA.name : managerB.name;
      verdict += `L'ago della bilancia storico pende a favore di ${ahead} per il miglior rating complessivo.`;
    } else {
      verdict += `Un duello all'insegna del perfetto equilibrio competitivo.`;
    }
  }

  return {
    managerA,
    managerB,
    sharedSeasonsCount: totalShared,
    winsA,
    winsB,
    ties,
    duels,
    palmares: {
      gold: { a: managerA.gold || 0, b: managerB.gold || 0 },
      silver: { a: managerA.silver || 0, b: managerB.silver || 0 },
      bronze: { a: managerA.bronze || 0, b: managerB.bronze || 0 },
      cupGold: { a: managerA.cup_gold || 0, b: managerB.cup_gold || 0 },
      supercup: { a: managerA.supercup || 0, b: managerB.supercup || 0 },
      mundialito: { a: managerA.mundialito || 0, b: managerB.mundialito || 0 },
      spoon: { a: managerA.spoon || 0, b: managerB.spoon || 0 },
      cartonato: { a: managerA.cartonato || 0, b: managerB.cartonato || 0 },
      totalTitles: { a: totalTitlesA, b: totalTitlesB },
      ratingScore: { a: scoreA, b: scoreB }
    },
    metricsA,
    metricsB,
    narrativeVerdict: verdict
  };
}
