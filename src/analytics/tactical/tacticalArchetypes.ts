/**
 * src/analytics/tactical/tacticalArchetypes.ts
 * 10 Career Archetype Catalog and Decision Tree Engine 
 */

import type { Manager } from '@/types';
import { computeDisasterMass, computeFeastMass, computeSmoothedFF } from '../tailRisk';
import { extractManagerCupAndHonorMetrics } from './tacticalAxes';
import type { TacticalArchetype, RawManagerTacticalValues } from './types';

export const TACTICAL_ARCHETYPES: Record<string, TacticalArchetype> = {
  // Debutants (years <= 2)
  MATRICOLA_TERRIBILE: {
    id: 'matricola_terribile',
    title: 'LA MATRICOLA TERRIBILE',
    icon: 'fa-rocket',
    color: '#38bdf8', // Sky
    trait: '⚡ Spavaldo & Senza Riverenza',
    motto: '"Nessun timore reverenziale per i senatori: siamo qui per scombinare le gerarchie fin da subito."'
  },
  APPRENDISTA_FANTA: {
    id: 'apprendista_fanta',
    title: "L'APPRENDISTA DEL FANTA",
    icon: 'fa-seedling',
    color: '#94a3b8', // Slate
    trait: '🌱 In Fase di Rodaggio & Sperimentatore',
    motto: '"Si impara più da una batosta all\'ultimo minuto che da un 66 fortunoso."'
  },
  // Veterans (years >= 3)
  MACCHINA_GUERRA: {
    id: 'macchina_guerra',
    title: 'LA MACCHINA DA GUERRA',
    icon: 'fa-shield-halved',
    color: '#10b981', // Emerald
    trait: '⚙️ Metodico & Inossidabile',
    motto: '"Il campionato non è uno sprint, è un logorio metodico. Zero disonori in carriera: la costanza è potere."'
  },
  CECCHINO_COPPE: {
    id: 'cecchino_coppe',
    title: 'IL CECCHINO DA COPPE',
    icon: 'fa-crosshairs',
    color: '#06b6d4', // Cyan
    trait: "❄️ Freddo nei 90' & Letale nei Rigori",
    motto: '"Nel dentro-o-fuori non tremano le mani. Il campionato logora, la coppa consegna all\'eternità."'
  },
  CORTO_MUSO: {
    id: 'corto_muso',
    title: 'IL CORTO MUSO ALLEGRIANO',
    icon: 'fa-chess-knight',
    color: '#f59e0b', // Amber
    trait: '🎯 Cinico & Baciato dal Calendario',
    motto: '"Vincere con 66.0 non è importante, è l\'unica cosa che conta. Un punto in più dell\'avversario e palla al centro."'
  },
  ZEMANIANO_ROMANTICO: {
    id: 'zemaniano_romantico',
    title: 'LO ZEMANIANO ROMANTICO',
    icon: 'fa-fire-flame-curved',
    color: '#f97316', // Orange
    trait: '🔥 Spettacolare & Martire Difensivo',
    motto: '"Se ne prendiamo tre, dobbiamo farne quattro. Lo spettacolo prima del risultatismo."'
  },
  ROULETTE_RUSSA: {
    id: 'roulette_russa',
    title: 'LA ROULETTE RUSSA',
    icon: 'fa-dice',
    color: '#ec4899', // Pink
    trait: '🎲 Imprevedibile & Piromane della Classifica',
    motto: '"O trionfo imperiale o disonore totale: le mezze misure sono per i codardi."'
  },
  ETERNO_INCOMPIUTO: {
    id: 'eterno_incompiuto',
    title: "L'ETERNO INCOMPIUTO",
    icon: 'fa-medal',
    color: '#6366f1', // Indigo
    trait: '🥈 Competitivo & Abbonato al Secondo Posto',
    motto: '"La gloria è vicina, ma il secondo posto è un destino che si ripete."'
  },
  VITTIMA_DESTINO: {
    id: 'vittima_destino',
    title: 'LA VITTIMA DEL DESTINO',
    icon: 'fa-skull',
    color: '#ef4444', // Red
    trait: '💀 Bersagliato & Resiliente',
    motto: '"Chiunque giochi contro di me trova la partita della vita. Ma non mollerò mai."'
  },
  ORACOLO_CAOS: {
    id: 'oracolo_caos',
    title: "L'ORACOLO DEL CAOS",
    icon: 'fa-masks-theater',
    color: '#a855f7', // Purple
    trait: '🎭 Drammatico & Miracolato',
    motto: '"Questa giornata ne prendo quattro... e invece doppietta all\'89°. Il pianto preventivo è la migliore tattica."'
  }
};

export function selectTacticalArchetype(
  manager: Manager,
  raw: RawManagerTacticalValues,
  normalizedScores: { pot: number; cin: number; luk: number; koc: number; reg: number }
): TacticalArchetype {
  const { finalsLost, dishonors, totalMajor, gold, silver, podiums } = extractManagerCupAndHonorMetrics(manager);

  // 1. Debutants & Rookies (years <= 2)
  if (manager.years <= 2) {
    if (podiums >= 1 || normalizedScores.pot >= 65 || raw.luckDelta > 1.5) {
      return TACTICAL_ARCHETYPES.MATRICOLA_TERRIBILE;
    }
    return TACTICAL_ARCHETYPES.APPRENDISTA_FANTA;
  }

  // 2. Veterans (years >= 3) - Dominant Affinity Score Engine
  const candidates: Array<{ archetype: TacticalArchetype; affinity: number }> = [
    { archetype: TACTICAL_ARCHETYPES.ORACOLO_CAOS, affinity: 50.0 }
  ];

  // Candidate A: L'ETERNO INCOMPIUTO (Multiple podiums with 0 scudetti, or >=3 silvers with <=1 scudetto)
  if (
    (podiums >= 2 && gold === 0) ||
    ((silver + finalsLost) >= 3 && gold <= 1)
  ) {
    const affinity = 85.0 + podiums * 5.0 + (silver + finalsLost) * 4.0;
    candidates.push({ archetype: TACTICAL_ARCHETYPES.ETERNO_INCOMPIUTO, affinity });
  }

  // Candidate B: LA ROULETTE RUSSA (Feast or Famine: major titles AND dishonors)
  const dm = computeDisasterMass(manager.spoon || 0, manager.cartonato || 0);
  const fm = computeFeastMass(gold, manager.cup_gold || 0);
  const smoothedFF = computeSmoothedFF(fm + dm, manager.years, 1.0, 0.30);
  if (dishonors >= 1 && (gold >= 1 || raw.finalsWon >= 1) && smoothedFF >= 0.32) {
    const affinity = 78.0 + smoothedFF * 45.0 + (gold + dishonors) * 4.5;
    candidates.push({ archetype: TACTICAL_ARCHETYPES.ROULETTE_RUSSA, affinity });
  }

  // Candidate C: IL CECCHINO DA COPPE (Cup specialist & high KOC score)
  if ((raw.finalsWon >= 3 && normalizedScores.koc >= 60) || raw.finalsWon >= 4) {
    const affinity = 25.0 + 0.65 * normalizedScores.koc + raw.finalsWon * 9.5;
    candidates.push({ archetype: TACTICAL_ARCHETYPES.CECCHINO_COPPE, affinity });
  }

  // Candidate D: LA MACCHINA DA GUERRA (Zero dishonors, high stability & championship titles)
  if (
    dishonors === 0 &&
    ((normalizedScores.reg >= 56 && (gold >= 1 || totalMajor >= 2)) ||
      (gold >= 2 && manager.years >= 6))
  ) {
    const affinity = 0.55 * normalizedScores.reg + 0.25 * normalizedScores.pot + gold * 8.0 + 12.0;
    candidates.push({ archetype: TACTICAL_ARCHETYPES.MACCHINA_GUERRA, affinity });
  }

  // Candidate E: IL CORTO MUSO ALLEGRIANO (High close-win rate & positive schedule luck)
  if (normalizedScores.cin >= 58 && (normalizedScores.luk >= 48 || raw.luckDelta >= 0.5)) {
    const affinity = 0.60 * normalizedScores.cin + 0.40 * normalizedScores.luk + gold * 3.0;
    candidates.push({ archetype: TACTICAL_ARCHETYPES.CORTO_MUSO, affinity });
  }

  // Candidate F: LO ZEMANIANO ROMANTICO (Explosive firepower & low close-win cynicism)
  if (normalizedScores.pot >= 60 && normalizedScores.cin <= 52) {
    const affinity = 0.75 * normalizedScores.pot + 0.25 * (100 - normalizedScores.cin);
    candidates.push({ archetype: TACTICAL_ARCHETYPES.ZEMANIANO_ROMANTICO, affinity });
  }

  // Candidate G: LA VITTIMA DEL DESTINO (Severe schedule unluckiness)
  if (normalizedScores.luk <= 38 || raw.luckDelta <= -2.5) {
    const affinity = 0.80 * (100 - normalizedScores.luk) + 0.20 * normalizedScores.pot;
    candidates.push({ archetype: TACTICAL_ARCHETYPES.VITTIMA_DESTINO, affinity });
  }

  candidates.sort((a, b) => b.affinity - a.affinity);
  return candidates[0].archetype;
}
