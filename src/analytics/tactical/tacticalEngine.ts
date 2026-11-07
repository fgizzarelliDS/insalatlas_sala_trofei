/**
 * src/analytics/tactical/tacticalEngine.ts
 * Main Tactical Profiler Orchestration Engine 
 */

import type { Manager } from '@/types';
import { getLiveSeasonDetails } from '@/state';
import { getCachedAnalyticsManagers } from '../analyticsCore';
import type {
  TacticalArchetype,
  TacticalStyleAxes,
  TacticalStatPill,
  TacticalProfile,
  RawManagerTacticalValues,
  TacticalAxisKey,
  TacticalAxisData
} from './types';
import { getCachedManagerLore } from './tacticalLore';
import { selectTacticalArchetype } from './tacticalArchetypes';
import {
  extractManagerCupAndHonorMetrics,
  computeRawManagerValues,
  computeRawManagerSeasonalValues,
  calculateRadarSvgPoints
} from './tacticalAxes';
import { computeSeasonalMindset } from './tacticalMindset';

export function generatePhilosophyStats(
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

export function computeManagerTacticalProfile(
  manager: Manager,
  allManagers: Manager[],
  liveData = getLiveSeasonDetails(),
  analyticsManagers = getCachedAnalyticsManagers(),
  scope: 'career' | 'season' = 'career'
): TacticalProfile {

  // 1. Calculate career raw values for baseline archetype determination
  const careerRaws = allManagers.map(m => ({
    id: m.id,
    raw: computeRawManagerValues(m, analyticsManagers)
  }));

  const computeStatsForPool = (pool: Array<{ id: string; raw: RawManagerTacticalValues }>, key: 'pot' | 'cin' | 'luk' | 'koc' | 'reg') => {
    const vals = pool.map(r => r.raw[key]);
    const mean = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const denom = vals.length > 1 ? vals.length - 1 : 1;
    const variance = vals.length > 0 ? vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / denom : 1;
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev: stdDev < 1e-6 ? 1 : stdDev };
  };

  // Z-Score + Hyperbolic Tangent Normalization: guarantees exact Mean = 50 on all 5 axes
  const normalizeZ = (val: number, st: { mean: number; stdDev: number }): number => {
    const z = (val - st.mean) / st.stdDev;
    const score = Math.round(50 + 45 * Math.tanh(z / 1.8));
    return Math.min(98, Math.max(5, score));
  };

  const targetCareerRaw = careerRaws.find(r => r.id === manager.id)?.raw ?? computeRawManagerValues(manager, analyticsManagers);

  // Baseline Career Normalized Scores for Archetype Selection
  const careerStatsPot = computeStatsForPool(careerRaws, 'pot');
  const careerStatsCin = computeStatsForPool(careerRaws, 'cin');
  const careerStatsLuk = computeStatsForPool(careerRaws, 'luk');
  const careerStatsKoc = computeStatsForPool(careerRaws, 'koc');
  const careerStatsReg = computeStatsForPool(careerRaws, 'reg');

  const careerNormalizedScores = {
    pot: normalizeZ(targetCareerRaw.pot, careerStatsPot),
    cin: normalizeZ(targetCareerRaw.cin, careerStatsCin),
    luk: normalizeZ(targetCareerRaw.luk, careerStatsLuk),
    koc: normalizeZ(targetCareerRaw.koc, careerStatsKoc),
    reg: normalizeZ(targetCareerRaw.reg, careerStatsReg)
  };

  // 2. Select Archetype & Apply Custom Lore Overrides based strictly on Career DNA
  const baseArchetype = selectTacticalArchetype(manager, targetCareerRaw, careerNormalizedScores);
  const loreCatalog = getCachedManagerLore();
  const customLore = loreCatalog[manager.id] ||
    Object.entries(loreCatalog).find(([k]) => k.toLowerCase() === manager.name?.toLowerCase())?.[1];

  const archetype: TacticalArchetype = {
    ...baseArchetype,
    motto: customLore?.customMotto || baseArchetype.motto,
    trait: customLore?.customTrait || baseArchetype.trait
  };

  // 3. Determine Active Raws and Normalization based on requested scope ('career' vs 'season')
  const isSeasonalRequested = scope === 'season' && Boolean(liveData && liveData.standings && liveData.standings.length > 0);
  let activeRaws = careerRaws;
  let targetRaw = targetCareerRaw;

  if (isSeasonalRequested) {
    const seasonalList: Array<{ id: string; raw: RawManagerTacticalValues }> = [];
    for (const m of allManagers) {
      const sRaw = computeRawManagerSeasonalValues(m, liveData, analyticsManagers);
      if (sRaw) {
        seasonalList.push({ id: m.id, raw: sRaw });
      }
    }

    if (seasonalList.length >= 2) {
      activeRaws = seasonalList;
      const targetSeasonal = computeRawManagerSeasonalValues(manager, liveData, analyticsManagers);
      if (targetSeasonal) {
        targetRaw = targetSeasonal;
      }
    }
  }

  const statsPot = computeStatsForPool(activeRaws, 'pot');
  const statsCin = computeStatsForPool(activeRaws, 'cin');
  const statsLuk = computeStatsForPool(activeRaws, 'luk');
  const statsKoc = computeStatsForPool(activeRaws, 'koc');
  const statsReg = computeStatsForPool(activeRaws, 'reg');

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

  // 4. Seasonal Mindset
  const mindset = computeSeasonalMindset(manager, liveData);

  const isCurrentSeasonal = Boolean(targetRaw.isSeasonal);

  // 5. Bar Helpers & Styles with Real Metric Deviations vs Active Benchmark Pool
  const meanAvgFP = activeRaws.length > 0 ? activeRaws.reduce((acc, r) => acc + r.raw.avgFP, 0) / activeRaws.length : 70.0;
  const meanCloseWinRate = activeRaws.length > 0 ? activeRaws.reduce((acc, r) => acc + r.raw.closeWinRate, 0) / activeRaws.length : 50.0;

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
    deltaNum: number,
    subRaw?: string
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
      barColor,
      subRaw
    };
  };

  const axes: TacticalStyleAxes = {
    pot: makeAxisData(
      'pot',
      isCurrentSeasonal ? 'Potenza Offensiva Live (Fantamedia 2026/27)' : 'Potenza Offensiva (Media FP)',
      'POTENZA',
      'POT',
      isCurrentSeasonal ? `${targetRaw.avgFP.toFixed(1)} FM` : `${targetRaw.avgFP.toFixed(1)} FP`,
      scorePot,
      deltaPotStr,
      deltaPotPct
    ),
    cin: makeAxisData(
      'cin',
      isCurrentSeasonal ? 'Cinismo Corto Muso Live (Vittorie ≤1 gol)' : 'Cinismo Corto Muso (Vittorie ≤1 gol)',
      'CINISMO',
      'CIN',
      `${Math.round(targetRaw.closeWinRate)}%`,
      scoreCin,
      deltaCinStr,
      deltaCinPct
    ),
    luk: makeAxisData(
      'luk',
      isCurrentSeasonal ? 'Fattore Fortuna Live (Punti vs xPTS)' : 'Fattore Fortuna (Punti vs xPTS)',
      'FORTUNA',
      'LUK',
      `${targetRaw.luckDelta >= 0 ? '+' : ''}${targetRaw.luckDelta.toFixed(1)} pt`,
      scoreLuk,
      deltaLukStr,
      targetRaw.luckDelta
    ),
    koc: makeAxisData(
      'koc',
      isCurrentSeasonal ? 'Rendimento Big Match (vs Top 4)' : 'Freddezza da Coppe (Finali Vinte)',
      isCurrentSeasonal ? 'BIG MATCH' : 'COPPE',
      isCurrentSeasonal ? 'BIG' : 'KOC',
      isCurrentSeasonal
        ? `${targetRaw.bigMatchPts ?? 0} PT`
        : `${targetRaw.finalsWon} ${targetRaw.finalsWon === 1 ? 'Trofeo' : 'Trofei'}`,
      scoreKoc,
      deltaKocStr,
      deltaKocNum,
      isCurrentSeasonal ? `(${targetRaw.bigMatchPlayed ?? 0} ${targetRaw.bigMatchPlayed === 1 ? 'gara' : 'gare'})` : undefined
    ),
    reg: makeAxisData(
      'reg',
      isCurrentSeasonal ? 'Costanza Punteggio Live (Anti-Varianza FP)' : 'Stabilità Rendimento (Anti-Varianza)',
      'STABILITÀ',
      'REG',
      isCurrentSeasonal ? `σ ${targetRaw.stdDevRank.toFixed(1)} FP` : `σ ${targetRaw.stdDevRank.toFixed(1)} pos`,
      scoreReg,
      deltaRegStr,
      deltaRegNum
    ),
    radarPoints: calculateRadarSvgPoints(normalizedScores)
  };

  // 6. Philosophy Stats
  const stats = generatePhilosophyStats(manager, archetype, targetRaw);

  // 7. Sub-meta and Team info
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
    mindset,
    scope: isCurrentSeasonal ? 'season' : 'career'
  };
}
