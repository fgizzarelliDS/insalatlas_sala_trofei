/**
 * src/analytics/tacticalProfiler.ts
 * Tactical Profiler & Psychological Identikit Engine for Fantasy Football Managers 
 *
 * 100% Client-Side TypeScript engine that computes:
 * 1. Deterministic Career Tactical Archetype (8 Veteran + 2 Rookie Archetypes)
 * 2. 5 Min-Max Normalized Tactical Style Axes (POT, CIN, LUK, KOC, REG) with 50% league benchmark
 * 3. Seasonal Live Mindset (5 dynamic states for active managers, clean historical archive for inactives)
 * 4. The 3 Numbers of Philosophy
 * 5. Preformatted WhatsApp Banter with Markdown & Emoji
 */

import type { Manager } from '@/types';
import { LEAGUE, getActiveCompetitions } from '@/config';
import { getManagerTrophyCount, getManagerTotalTrophies } from '@/score';
import { getLiveSeasonDetails } from '@/state';
import { computeStabilityProfile } from './badges';
import { computeDisasterMass, computeFeastMass, computeSmoothedFF } from './tailRisk';
import { getCachedAnalyticsManagers } from './analyticsCore';

export type TacticalAxisKey = 'pot' | 'cin' | 'luk' | 'koc' | 'reg';

export interface TacticalAxisData {
  key: TacticalAxisKey;
  label: string;
  shortTitle: string;
  acronym: string;
  raw: string;
  score: number; // 5 to 100
  deltaPct: string; // e.g. "(+32%)" or "(-10%)"
  deltaNumeric: number; // score - 50
  barColor: string;
}

export interface TacticalStyleAxes {
  pot: TacticalAxisData;
  cin: TacticalAxisData;
  luk: TacticalAxisData;
  koc: TacticalAxisData;
  reg: TacticalAxisData;
  radarPoints: string; // "x1,y1 x2,y2 x3,y3 x4,y4 x5,y5"
}

export interface TacticalStatPill {
  title: string;
  val: string;
  lbl: string;
}

export interface TacticalArchetype {
  id: string;
  title: string;
  icon: string;
  color: string;
  trait: string;
  motto: string;
}

export interface SeasonalMindset {
  isActive: boolean;
  pill: string;
  desc: string;
  momentum: string;
  luckDelta: string;
  icon: string;
}

export interface TacticalProfile {
  managerId: string;
  managerName: string;
  teamName: string;
  crestText: string;
  subMeta: string;
  archetype: TacticalArchetype;
  axes: TacticalStyleAxes;
  stats: [TacticalStatPill, TacticalStatPill, TacticalStatPill];
  mindset: SeasonalMindset;
}

// ---------------------------------------------------------------------------
// MANAGER LORE CUSTOMIZATION (SPEC-25 Lore & Banter Extension)
// ---------------------------------------------------------------------------

export interface ManagerLoreItem {
  customMotto?: string;
  customTrait?: string;
  customBanter?: string;
  notes?: string;
}

export type ManagerLoreCatalog = Record<string, ManagerLoreItem>;

let cachedManagerLore: ManagerLoreCatalog = {};
let managerLoreFetchPromise: Promise<ManagerLoreCatalog> | null = null;

/**
 * Asynchronously loads custom manager lore from public/data/manager_lore.json
 */
export async function loadManagerLore(): Promise<ManagerLoreCatalog> {
  if (managerLoreFetchPromise) return managerLoreFetchPromise;
  if (typeof fetch === 'undefined') return cachedManagerLore;

  managerLoreFetchPromise = (async () => {
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './';
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const urls = [
      `${normalizedBase}manager_lore.json`,
      `manager_lore.json`,
      `./manager_lore.json`,
      `/manager_lore.json`,
      `${normalizedBase}data/manager_lore.json`
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            cachedManagerLore = data;
            return cachedManagerLore;
          }
        }
      } catch {
        // try next candidate
      }
    }
    return cachedManagerLore;
  })();

  return managerLoreFetchPromise;
}

export function getCachedManagerLore(): ManagerLoreCatalog {
  return cachedManagerLore;
}

export function setManagerLore(lore: ManagerLoreCatalog): void {
  cachedManagerLore = lore;
}

// ---------------------------------------------------------------------------
// 10 ARCHETYPES CATALOG
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// RAW AXIS COMPUTATION HELPERS
// ---------------------------------------------------------------------------

interface RawManagerTacticalValues {
  pot: number;
  cin: number;
  luk: number;
  koc: number;
  reg: number;
  avgFP: number;
  closeWinRate: number;
  luckDelta: number;
  finalsPlayed: number;
  finalsWon: number;
  stdDevRank: number;
}

function extractManagerCupAndHonorMetrics(manager: Manager) {
  const activeComps = getActiveCompetitions();
  let finalsWon = 0;
  let finalsLost = 0;
  let dishonors = 0;

  for (const comp of activeComps) {
    if (comp.type === 'dishonor' || comp.type === 'banners') {
      dishonors += getManagerTrophyCount(manager, comp.id, 'gold');
    } else if (comp.id !== 'championship') {
      finalsWon += getManagerTrophyCount(manager, comp.id, 'gold');
      finalsLost += getManagerTrophyCount(manager, comp.id, 'silver');
    }
  }

  const totalMajor = getManagerTotalTrophies(manager, activeComps);
  const gold = getManagerTrophyCount(manager, 'championship', 'gold');
  const silver = getManagerTrophyCount(manager, 'championship', 'silver');
  const bronze = getManagerTrophyCount(manager, 'championship', 'bronze');
  const podiums = gold + silver + bronze;

  return { finalsWon, finalsLost, dishonors, totalMajor, gold, silver, bronze, podiums };
}

function computeRawManagerValues(
  manager: Manager,
  analyticsManagers = getCachedAnalyticsManagers()
): RawManagerTacticalValues {
  const eloProfile = analyticsManagers ? analyticsManagers[manager.id] : null;
  const allStats = eloProfile?.seasonStats?.['all'];
  const { finalsWon, finalsLost, dishonors, gold, silver, bronze } = extractManagerCupAndHonorMetrics(manager);

  // 1. POT (Potenza Offensiva)
  const completedHistory = (manager.history || []).filter(
    h => !h.in_progress && h.status !== 'in_progress' && typeof h.rank === 'number' && h.rank > 0
  );
  let avgFP = allStats?.avgFP ?? 0;
  if (avgFP <= 0) {
    if (completedHistory.length > 0) {
      const avgRank = completedHistory.reduce((s, h) => s + (h.rank as number), 0) / completedHistory.length;
      avgFP = parseFloat((73.0 - (avgRank - 1) * 0.45 + Math.min(1.5, gold * 0.35)).toFixed(2));
    } else if (gold > 0) {
      avgFP = 71.0 + Math.min(2.5, gold * 0.6);
    } else if (manager.years <= 2 && (silver > 0 || bronze > 0)) {
      avgFP = 72.0;
    } else {
      avgFP = 70.0;
    }
  }
  const goalsPerMatch = allStats && allStats.played > 0
    ? (allStats.gf / allStats.played)
    : Math.max(0.8, 1.35 + (avgFP - 70.0) * 0.12);
  const rawPOT = 0.70 * avgFP + 0.30 * (goalsPerMatch * 48.0);

  // 2. CIN (Cinismo Corto Muso)
  let closeWinRate = 50.0;
  if (eloProfile?.flat?.trajectory && eloProfile.flat.trajectory.length > 0) {
    const trajectory = eloProfile.flat.trajectory;
    const wins = trajectory.filter(m => m.result === 'W');
    if (wins.length >= 3) {
      const closeWins = wins.filter(m => {
        const goalDiff = (m.gf ?? 0) - (m.ga ?? 0);
        const lowScore = typeof m.fpFor === 'number' && m.fpFor > 0 && m.fpFor <= 68.0;
        return goalDiff === 1 || lowScore;
      });
      closeWinRate = parseFloat(((closeWins.length / wins.length) * 100).toFixed(1));
    } else {
      closeWinRate = 50.0 + (gold * 5.0) - (silver * 3.0);
    }
  } else {
    closeWinRate = 50.0 + (gold * 6.0) - (silver * 2.5);
  }
  const rawCIN = Math.min(95, Math.max(20, closeWinRate));

  // 3. LUK (Fattore Fortuna)
  const luckDelta = allStats?.luckDelta ?? 0.0;
  const rawLUK = luckDelta;

  // 4. KOC (Freddezza da Coppe) - Monotonic Bayesian Shrinkage
  const finalsPlayed = finalsWon + finalsLost;
  const bayesianWinRate = (finalsWon + 0.5) / (finalsPlayed + 1.5);
  const rawKOC = (finalsWon * 22.0) + (finalsLost * 7.0) + (15.0 * bayesianWinRate);

  // 5. REG (Regolarità Metodica)
  const stability = computeStabilityProfile(manager);
  let rawREG = Math.max(15, 100 - (stability.stdDevRank * 14.0) - (dishonors * 12.0));
  if (manager.years <= 2) {
    // Shrink rookie stability toward neutral 55 so 1-2 seasons don't artificially distort career stability
    rawREG = 0.35 * rawREG + 0.65 * 55.0;
  }

  return {
    pot: rawPOT,
    cin: rawCIN,
    luk: rawLUK,
    koc: rawKOC,
    reg: rawREG,
    avgFP,
    closeWinRate,
    luckDelta,
    finalsPlayed,
    finalsWon,
    stdDevRank: stability.stdDevRank
  };
}

// ---------------------------------------------------------------------------
// 5-AXIS RADAR SVG COORDINATE GENERATOR
// ---------------------------------------------------------------------------

/**
 * Calculates SVG polygon points string for a 5-axis radar chart
 * Center (120, 110), Max Radius = 80
 * Angles: POT (-90°), CIN (-18°), LUK (54°), REG (126°), KOC (198°)
 */
export function calculateRadarSvgPoints(
  scores: { pot: number; cin: number; luk: number; reg: number; koc: number },
  cx = 120,
  cy = 110,
  maxRadius = 80
): string {
  const angles = [
    -Math.PI / 2,                  // 0: POT (top)
    -Math.PI / 2 + (2 * Math.PI) / 5, // 1: CIN (top right)
    -Math.PI / 2 + (4 * Math.PI) / 5, // 2: LUK (bottom right)
    -Math.PI / 2 + (6 * Math.PI) / 5, // 3: REG (bottom left)
    -Math.PI / 2 + (8 * Math.PI) / 5  // 4: KOC (top left)
  ];

  const axisValues = [scores.pot, scores.cin, scores.luk, scores.reg, scores.koc];

  const points = axisValues.map((score, idx) => {
    const fraction = Math.min(100, Math.max(5, score)) / 100;
    const r = fraction * maxRadius;
    const x = Math.round(cx + r * Math.cos(angles[idx]));
    const y = Math.round(cy + r * Math.sin(angles[idx]));
    return `${x},${y}`;
  });

  return points.join(' ');
}

// ---------------------------------------------------------------------------
// ARCHETYPE SELECTION DECISION TREE
// ---------------------------------------------------------------------------

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
    const affinity = 0.65 * normalizedScores.koc + raw.finalsWon * 9.5;
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

// ---------------------------------------------------------------------------
// SEASONAL MINDSET EVALUATION (LIVE 2026/27)
// ---------------------------------------------------------------------------

export function computeSeasonalMindset(
  manager: Manager,
  liveData = getLiveSeasonDetails()
): SeasonalMindset {
  if (!liveData || !liveData.standings || liveData.standings.length === 0) {
    return {
      isActive: false,
      pill: '🏛️ ARCHIVIO STORICO',
      desc: `Manager con ${manager.years} ${manager.years === 1 ? 'stagione disputata' : 'stagioni disputate'} nella storia di lega.`,
      momentum: '-',
      luckDelta: '-',
      icon: 'fa-landmark'
    };
  }

  const standing = liveData.standings.find(
    s => s.managerId === manager.id || s.coach?.toLowerCase() === manager.name?.toLowerCase()
  );

  if (!standing) {
    return {
      isActive: false,
      pill: '🏛️ ARCHIVIO STORICO',
      desc: `Manager non attivo nella stagione in corso (${manager.years} campionati disputati).`,
      momentum: '-',
      luckDelta: '-',
      icon: 'fa-landmark'
    };
  }

  // Calculate Momentum L5 from recentForm
  const recentForm = standing.recentForm || [];
  let momentumVal = 0.50;
  if (recentForm.length > 0) {
    const l5 = recentForm.slice(-5);
    const pts = l5.reduce((acc, r) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
    momentumVal = parseFloat((pts / (l5.length * 3)).toFixed(2));
  }
  const momentumStr = `${momentumVal.toFixed(2)} / 1.00`;

  // Calculate Delta Luck
  const points = standing.points ?? 0;
  const xPts = standing.scheduleLuck?.xPoints ?? points;
  const deltaLuck = parseFloat((points - xPts).toFixed(1));
  const deltaLuckStr = `${deltaLuck >= 0 ? '+' : ''}${deltaLuck} pt`;

  // Evaluate Mindset State
  const lastThreeWins = recentForm.slice(-3).filter(r => r === 'W').length >= 3;
  const lastMatchWon = recentForm.length > 0 && recentForm[recentForm.length - 1] === 'W';
  const previousTwoLost = recentForm.length >= 3 && recentForm[recentForm.length - 2] === 'L' && recentForm[recentForm.length - 3] === 'L';

  if (standing.rank <= 3 && deltaLuck >= 3.5) {
    return {
      isActive: true,
      pill: "⚖️ SINDROME DELL'IMPOSTORE",
      desc: `In vetta alla classifica con marcato overperforming da calendario (${deltaLuckStr} vs xPTS).`,
      momentum: momentumStr,
      luckDelta: deltaLuckStr,
      icon: 'fa-scale-balanced'
    };
  }

  if (momentumVal >= 0.70 || lastThreeWins) {
    return {
      isActive: true,
      pill: '🔥 IN TRANCE AGONISTICA',
      desc: `Passo da schiacciasassi nelle ultime giornate (${deltaLuckStr} ΔLuck), ritmo vertiginoso.`,
      momentum: momentumStr,
      luckDelta: deltaLuckStr,
      icon: 'fa-fire'
    };
  }

  if (lastMatchWon && previousTwoLost) {
    return {
      isActive: true,
      pill: '⚡ RESURREZIONE IMPROVVISA',
      desc: `Squillante ritorno alla vittoria nell'ultimo turno dopo un passaggio a vuoto.`,
      momentum: momentumStr,
      luckDelta: deltaLuckStr,
      icon: 'fa-bolt'
    };
  }

  if (standing.rank >= liveData.standings.length - 2 || momentumVal < 0.25) {
    return {
      isActive: true,
      pill: '🧊 CRISI DI NERVI',
      desc: `Fase critica di risultati (${deltaLuckStr} ΔLuck), necessario un cambio di marcia immediato.`,
      momentum: momentumStr,
      luckDelta: deltaLuckStr,
      icon: 'fa-snowflake'
    };
  }

  return {
    isActive: true,
    pill: '🎯 PAZIENZA MONASTICA',
    desc: `Rendimento solido e baricentro costante, in attesa del momento giusto per colpire.`,
    momentum: momentumStr,
    luckDelta: deltaLuckStr,
    icon: 'fa-bullseye'
  };
}

// ---------------------------------------------------------------------------
// 3 NUMBERS OF PHILOSOPHY GENERATOR
// ---------------------------------------------------------------------------

function generatePhilosophyStats(
  manager: Manager,
  archetype: TacticalArchetype,
  raw: RawManagerTacticalValues
): [TacticalStatPill, TacticalStatPill, TacticalStatPill] {
  const { dishonors, totalMajor, gold, podiums } = extractManagerCupAndHonorMetrics(manager);

  if (archetype.id === 'corto_muso') {
    const podiumConv = podiums > 0 ? (gold / podiums) * 100 : 0;
    const goldLabel = gold === 1 ? '1 Scudetto' : `${gold} Scudetti`;
    const podLabel = podiums === 1 ? '1 Podio conquistato' : `${podiums} Podi conquistati`;
    return [
      {
        title: 'EFFICIENZA 1-0',
        val: `${raw.closeWinRate}%`,
        lbl: 'delle vittorie con scarto ≤ 1 gol'
      },
      {
        title: 'FATTORE C*LO ALL-TIME',
        val: `${raw.luckDelta >= 0 ? '+' : ''}${raw.luckDelta.toFixed(1)} pt`,
        lbl: 'punti reali sopra gli xPTS attesi'
      },
      {
        title: 'CONVERSIONE PODIO',
        val: `${podiumConv.toFixed(1)}%`,
        lbl: `${goldLabel} su ${podLabel}`
      }
    ];
  }

  if (archetype.id === 'cecchino_coppe') {
    const conversion = raw.finalsPlayed > 0 ? (raw.finalsWon / raw.finalsPlayed) * 100 : 0;
    return [
      {
        title: 'RECORD COPPE',
        val: `${raw.finalsWon} ${raw.finalsWon === 1 ? 'Trofeo' : 'Trofei'}`,
        lbl: 'tra Coppe e Supercoppe vinte'
      },
      {
        title: 'CLUTCH NELLE FINALI',
        val: `${conversion.toFixed(1)}%`,
        lbl: `${raw.finalsWon} finali vinte su ${raw.finalsPlayed} disputate`
      },
      {
        title: 'PALMARÈS TOTALE',
        val: `${totalMajor} ${totalMajor === 1 ? 'Titolo' : 'Titoli'}`,
        lbl: 'trofei maggiori bacheca All-Time'
      }
    ];
  }

  if (archetype.id === 'macchina_guerra') {
    return [
      {
        title: 'ANTI-DISONORE',
        val: `${dishonors} ${dishonors === 1 ? 'Cucchiaio' : 'Cucchiai'}`,
        lbl: 'zero piazzamenti infamanti in carriera'
      },
      {
        title: 'STABILITÀ REGULAR',
        val: `${raw.stdDevRank.toFixed(2)}`,
        lbl: 'deviazione minima di rank annuo'
      },
      {
        title: 'DOMINIO METODICO',
        val: `${gold} ${gold === 1 ? 'Scudetto' : 'Scudetti'}`,
        lbl: `${manager.years} ${manager.years === 1 ? 'anno' : 'anni'} ai vertici di lega`
      }
    ];
  }

  if (archetype.id === 'matricola_terribile' || archetype.id === 'apprendista_fanta') {
    return [
      {
        title: 'POTENZA DI FUOCO',
        val: `${raw.avgFP.toFixed(1)} FP`,
        lbl: 'fanta-media al debutto assoluto'
      },
      {
        title: 'ESPERIENZA MATRICOLA',
        val: `${manager.years} ${manager.years === 1 ? 'Anno' : 'Anni'}`,
        lbl: 'confidenza preliminare di carriera'
      },
      {
        title: 'IMPATTO IMMEDIATO',
        val: `${podiums} ${podiums === 1 ? 'Podio' : 'Podi'}`,
        lbl: 'piazzamenti sul podio conquistati'
      }
    ];
  }

  if (archetype.id === 'vittima_destino') {
    return [
      {
        title: 'FANTAMEDIA CARRIERA',
        val: `${raw.avgFP.toFixed(1)} FP`,
        lbl: 'punteggio solido non premiato'
      },
      {
        title: 'CREDITO COL DESTINO',
        val: `${raw.luckDelta.toFixed(1)} pt`,
        lbl: 'punti sottratti dalla Dea Bendata'
      },
      {
        title: 'RESILIENZA STORICA',
        val: `${manager.years} ${manager.years === 1 ? 'Anno' : 'Anni'}`,
        lbl: 'in prima linea nonostante il calendario'
      }
    ];
  }

  // Default philosophy stats
  return [
    {
      title: 'MEDIA DI FUOCO',
      val: `${raw.avgFP.toFixed(1)} FP`,
      lbl: 'fanta-media di rendimento storico'
    },
    {
      title: 'FATTORE FORTUNA',
      val: `${raw.luckDelta >= 0 ? '+' : ''}${raw.luckDelta.toFixed(1)} pt`,
      lbl: 'scarto storico punti vs xPTS'
    },
    {
      title: 'TITOLI CARRIERA',
      val: `${totalMajor} ${totalMajor === 1 ? 'Titolo' : 'Titoli'}`,
      lbl: 'trofei all-time tra campionato e coppe'
    }
  ];
}

// ---------------------------------------------------------------------------
// MAIN TACTICAL PROFILER ENTRYPOINT
// ---------------------------------------------------------------------------

export function computeManagerTacticalProfile(
  manager: Manager,
  allManagers: Manager[],
  liveData = getLiveSeasonDetails(),
  analyticsManagers = getCachedAnalyticsManagers()
): TacticalProfile {

  // 1. Calculate raw values for all managers to establish league mean & standard deviation
  const allRaws = allManagers.map(m => ({
    id: m.id,
    raw: computeRawManagerValues(m, analyticsManagers)
  }));

  const computeStats = (key: 'pot' | 'cin' | 'luk' | 'koc' | 'reg') => {
    const vals = allRaws.map(r => r.raw[key]);
    const mean = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const denom = vals.length > 1 ? vals.length - 1 : 1;
    const variance = vals.length > 0 ? vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / denom : 1;
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev: stdDev < 1e-6 ? 1 : stdDev };
  };

  const statsPot = computeStats('pot');
  const statsCin = computeStats('cin');
  const statsLuk = computeStats('luk');
  const statsKoc = computeStats('koc');
  const statsReg = computeStats('reg');

  // Z-Score + Hyperbolic Tangent Normalization: guarantees exact Mean = 50 on all 5 axes
  const normalizeZ = (val: number, st: { mean: number; stdDev: number }): number => {
    const z = (val - st.mean) / st.stdDev;
    const score = Math.round(50 + 45 * Math.tanh(z / 1.8));
    return Math.min(98, Math.max(5, score));
  };

  const targetRaw = allRaws.find(r => r.id === manager.id)?.raw ?? computeRawManagerValues(manager, analyticsManagers);

  const scorePot = normalizeZ(targetRaw.pot, statsPot);
  const scoreCin = normalizeZ(targetRaw.cin, statsCin);
  const scoreLuk = normalizeZ(targetRaw.luk, statsLuk);
  const scoreKoc = normalizeZ(targetRaw.koc, statsKoc);
  const scoreReg = normalizeZ(targetRaw.reg, statsReg);

  const normalizedScores = {
    pot: scorePot,
    cin: scoreCin,
    luk: scoreLuk,
    koc: scoreKoc,
    reg: scoreReg
  };

  // 2. Select Archetype & Apply Custom Lore Overrides 
  const baseArchetype = selectTacticalArchetype(manager, targetRaw, normalizedScores);
  const loreCatalog = getCachedManagerLore();
  const customLore = loreCatalog[manager.id] ||
    Object.entries(loreCatalog).find(([k]) => k.toLowerCase() === manager.name?.toLowerCase())?.[1];

  const archetype: TacticalArchetype = {
    ...baseArchetype,
    motto: customLore?.customMotto || baseArchetype.motto,
    trait: customLore?.customTrait || baseArchetype.trait
  };

  // 3. Seasonal Mindset
  const mindset = computeSeasonalMindset(manager, liveData);

  // 4. Bar Helpers & Styles with Real Metric Deviations vs League Benchmark
  const meanAvgFP = allRaws.length > 0 ? allRaws.reduce((acc, r) => acc + r.raw.avgFP, 0) / allRaws.length : 70.0;
  const meanCloseWinRate = allRaws.length > 0 ? allRaws.reduce((acc, r) => acc + r.raw.closeWinRate, 0) / allRaws.length : 50.0;

  const deltaPotPct = ((targetRaw.avgFP - meanAvgFP) / (meanAvgFP || 1)) * 100;
  const deltaPotStr = `(${deltaPotPct >= 0 ? '+' : ''}${deltaPotPct.toFixed(1)}%)`;

  const deltaCinPct = targetRaw.closeWinRate - meanCloseWinRate;
  const deltaCinStr = `(${deltaCinPct >= 0 ? '+' : ''}${Math.round(deltaCinPct)}%)`;

  const deltaLukStr = `(${targetRaw.luckDelta >= 0 ? '+' : ''}${targetRaw.luckDelta.toFixed(1)} vs xPTS)`;

  const deltaKocNum = scoreKoc - 50;
  const deltaKocStr = `(${deltaKocNum >= 0 ? '+' : ''}${deltaKocNum}%)`;

  const deltaRegNum = scoreReg - 50;
  const deltaRegStr = `(${deltaRegNum >= 0 ? '+' : ''}${deltaRegNum}%)`;

  const makeAxisData = (
    key: TacticalAxisKey,
    label: string,
    shortTitle: string,
    acronym: string,
    rawStr: string,
    score: number,
    deltaPctStr: string,
    deltaNum: number
  ): TacticalAxisData => {
    let barColor = 'bg-slate-400';
    if (score >= 65) barColor = 'bg-emerald-500';
    else if (score >= 50) barColor = 'bg-amber-500';
    else if (score <= 35) barColor = 'bg-rose-500';

    return {
      key,
      label,
      shortTitle,
      acronym,
      raw: rawStr,
      score,
      deltaPct: deltaPctStr,
      deltaNumeric: deltaNum,
      barColor
    };
  };

  const axes: TacticalStyleAxes = {
    pot: makeAxisData(
      'pot',
      'Potenza Offensiva (Media FP)',
      'POTENZA',
      'POT',
      `${targetRaw.avgFP.toFixed(1)} FP`,
      scorePot,
      deltaPotStr,
      deltaPotPct
    ),
    cin: makeAxisData(
      'cin',
      'Cinismo Corto Muso (Vittorie ≤1 gol)',
      'CINISMO',
      'CIN',
      `${Math.round(targetRaw.closeWinRate)}%`,
      scoreCin,
      deltaCinStr,
      deltaCinPct
    ),
    luk: makeAxisData(
      'luk',
      'Fattore Fortuna (Punti vs xPTS)',
      'FORTUNA',
      'LUK',
      `${targetRaw.luckDelta >= 0 ? '+' : ''}${targetRaw.luckDelta.toFixed(1)} pt`,
      scoreLuk,
      deltaLukStr,
      targetRaw.luckDelta
    ),
    koc: makeAxisData(
      'koc',
      'Freddezza da Coppe (Finali Vinte)',
      'COPPE',
      'KOC',
      `${targetRaw.finalsWon} ${targetRaw.finalsWon === 1 ? 'Trofeo' : 'Trofei'}`,
      scoreKoc,
      deltaKocStr,
      deltaKocNum
    ),
    reg: makeAxisData(
      'reg',
      'Stabilità Rendimento (Anti-Varianza)',
      'STABILITÀ',
      'REG',
      `σ ${targetRaw.stdDevRank.toFixed(1)}`,
      scoreReg,
      deltaRegStr,
      deltaRegNum
    ),
    radarPoints: calculateRadarSvgPoints(normalizedScores)
  };

  // 5. Philosophy Stats
  const stats = generatePhilosophyStats(manager, archetype, targetRaw);

  // 6. Sub-meta and Team info (resolve newest season or live standing team name)
  const standing = liveData?.standings?.find(
    s => s.managerId === manager.id || s.coach?.toLowerCase() === manager.name?.toLowerCase()
  );
  const sortedHistory = [...(manager.history || [])]
    .filter(h => h.team && h.team.trim() !== '')
    .sort((a, b) => (b.season || '').localeCompare(a.season || ''));
  const latestTeam = standing?.teamName || (sortedHistory.length > 0 ? sortedHistory[0].team! : manager.name);

  const crestText = latestTeam
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .substring(0, 3)
    .toUpperCase();

  const { totalMajor, gold, podiums } = extractManagerCupAndHonorMetrics(manager);
  const podiumRate = manager.years > 0 ? Math.round((podiums / manager.years) * 100) : 0;

  const subMeta = `${manager.years} ${manager.years === 1 ? 'Anno' : 'Anni'} di Battaglie • ${gold} Scudetti • ${totalMajor} Trofei Maggiori • ${podiumRate}% Podio`;

  return {
    managerId: manager.id,
    managerName: manager.name,
    teamName: latestTeam,
    crestText,
    subMeta,
    archetype,
    axes,
    stats,
    mindset
  };
}

// ---------------------------------------------------------------------------
// WHATSAPP BANTER GENERATOR
// ---------------------------------------------------------------------------

export function formatTacticalWhatsAppBanter(
  profile: TacticalProfile,
  baseUrl = LEAGUE.siteUrl
): string {
  const url = `${baseUrl.replace(/\/+$/, '')}/?manager=${profile.managerId}`;
  const brandHeader = `${LEAGUE.brand.name.toUpperCase()} ${LEAGUE.brand.mainTitle.toUpperCase()}`;

  return `🗞️ *PAGELLA TATTICA • ${brandHeader}*

👤 *Mister:* ${profile.managerName} (${profile.teamName})
🎭 *Identikit:* *${profile.archetype.title}*
🏷️ *Tratto:* ${profile.archetype.trait}

💬 *Motto Ufficiale:*
_${profile.archetype.motto}_

📊 *I Numeri della Filosofia:*
• 🎯 *${profile.stats[0].title}:* ${profile.stats[0].val} (${profile.stats[0].lbl})
• 🍀 *${profile.stats[1].title}:* ${profile.stats[1].val} (${profile.stats[1].lbl})
• 🏆 *${profile.stats[2].title}:* ${profile.stats[2].val} (${profile.stats[2].lbl})

${profile.mindset.pill}
_${profile.mindset.desc}_

👉 *Consulta la scheda completa e il radar a 5 assi:*
${url}`;
}
