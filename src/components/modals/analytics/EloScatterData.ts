/**
 * src/components/modals/analytics/EloScatterData.ts
 * Data Preparation, OLS Statistics, and Geometry Helpers for Elo Studio Scatter Plots:
 * - Tab 2: ⚽ Elo vs Golo Score (Tactical Efficiency & Over/Underperformance)
 * - Tab 3: 📊 Elo vs FantaPunti (Raw Scoring Power vs Elo Conversion)
 * - Tab 4: 🍀 Sfiga & SOS (Schedule Luck & H2H vs All-Play Disparity)
 */

import type { EloTrackMode } from '@/types/analytics';
import { getManagerEloTrack, formatElo } from '@/analytics/analyticsCore';
import { resolveTeamLogo } from '@/crests';
import type { EloProfileEntry } from './EloKpis';
import { MANAGER_COLORS } from './EloTrajectoryChart';

export type ScatterMetricView = 'golo' | 'fp' | 'luck';
export type LuckScatterSubMode = 'allPlay' | 'h2hVsAtlas';

export interface ScatterPoint {
  managerId: string;
  teamName: string;
  coach: string;
  logo: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  metricLabelX: string;
  metricLabelY: string;
  extraMeta: string;
  quadrant: string;
}

export interface ScatterDataset {
  points: ScatterPoint[];
  labelX: string;
  labelY: string;
  unitX: string;
  unitY: string;
  isParitySupported: boolean;
  parityY?: number;
  crosshairX?: number;
  crosshairY?: number;
  isBisectorSupported: boolean;
  quadrantLabels: { tr: string; tl: string; br: string; bl: string };
}

export interface LayoutPoint extends ScatterPoint {
  rawX: number;
  rawY: number;
  cx: number;
  cy: number;
  cleanId: string;
}

export interface PlotBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Calculates Ordinary Least Squares (OLS) linear regression
 */
export function computeLinearRegression(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
    sumYY += p.y * p.y;
  }
  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) return { slope: 0, intercept: sumY / n, r2: 0 };
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const numR = n * sumXY - sumX * sumY;
  const denR = Math.sqrt(Math.max(1e-9, (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)));
  const r = numR / denR;
  return { slope, intercept, r2: Math.max(0, Math.min(1, r * r)) };
}

/**
 * Pure geometric cluster separation algorithm
 * Distributes near-identical or overlapping coordinates in a delicate radial rosette.
 */
export function applyClusterRepulsion(
  points: LayoutPoint[],
  minDist: number = 26,
  bounds: PlotBounds
): LayoutPoint[] {
  const result: LayoutPoint[] = points.map(p => ({ ...p }));

  for (let i = 0; i < result.length; i++) {
    const cluster: LayoutPoint[] = [result[i]];
    for (let j = 0; j < result.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(result[i].rawX - result[j].rawX, result[i].rawY - result[j].rawY);
      if (d < minDist) {
        cluster.push(result[j]);
      }
    }
    if (cluster.length > 1) {
      const angleStep = (2 * Math.PI) / cluster.length;
      const offsetR = Math.min(13, 6 + cluster.length * 2);
      cluster.forEach((item, k) => {
        const angle = k * angleStep;
        item.cx = item.rawX + Math.cos(angle) * offsetR;
        item.cy = item.rawY + Math.sin(angle) * offsetR;
      });
    }
  }

  // Strict boundary containment for all points (both clustered and solitary)
  result.forEach(item => {
    item.cx = Math.max(bounds.minX + item.radius, Math.min(bounds.maxX - item.radius, item.cx));
    item.cy = Math.max(bounds.minY + item.radius, Math.min(bounds.maxY - item.radius, item.cy));
  });

  return result;
}

/**
 * Determines whether the specified season is currently in progress (active)
 */
export function isSeasonInProgress(season: string): boolean {
  if (!season || season === 'all') return false;
  if (typeof (window as any) !== 'undefined' && (window as any).fantasyData?.competitions) {
    const comps = (window as any).fantasyData.competitions;
    if (Array.isArray(comps)) {
      const found = comps.some((c: any) => c.season === season && (c.in_progress || c.status === 'in_progress'));
      if (found) return true;
    }
  }
  return season === '2026/27';
}

/**
 * Builds data points for the requested scatter view
 */
export function buildScatterPoints(
  profiles: EloProfileEntry[],
  view: ScatterMetricView,
  activeMode: EloTrackMode,
  selectedSeason: string,
  luckSubMode: LuckScatterSubMode = 'allPlay'
): ScatterDataset {
  const points: ScatterPoint[] = [];
  const sKey = selectedSeason;
  const inProgress = isSeasonInProgress(selectedSeason);

  // Filter out any managers who did not take part in the selected season
  const activeProfiles = profiles.filter(p => {
    if (!p.profile.seasonStats) {
      // In minimal mock profiles without seasonStats, keep profile
      return true;
    }
    if (selectedSeason === 'all') {
      const stAll = p.profile.seasonStats['all'];
      return Boolean(stAll && typeof stAll.played === 'number' ? stAll.played > 0 : true);
    }
    const st = p.profile.seasonStats[selectedSeason];
    return Boolean(st && typeof st.played === 'number' ? st.played > 0 : false);
  });

  if (view === 'golo') {
    // X: Active Elo Rating, Y: Golo Score, Radius: Media FP
    activeProfiles.forEach((p, idx) => {
      const tr = getManagerEloTrack(p.profile, activeMode);
      const st = p.profile.seasonStats?.[sKey] || p.profile.seasonStats?.['all'] || {
        golo: 1.0,
        avgFP: 72.0,
        actualPts: 0,
        luckDelta: 0.0,
        played: 0
      };
      const eloVal = tr?.current ?? 1500.0;
      const goloVal = st.golo !== undefined ? st.golo : 1.0;
      const fpVal = st.avgFP ?? 72.0;
      const color = MANAGER_COLORS[idx % MANAGER_COLORS.length];
      const logo = resolveTeamLogo(p.teamName, p.logo);

      // Quadrant logic: Elo threshold = 1500, Golo threshold = 1.00
      let quadrant = 'Strugglers';
      if (eloVal >= 1500 && goloVal >= 1.0) quadrant = '⚡ TITANI (Alto Elo, Alto Golo)';
      else if (eloVal >= 1500 && goloVal < 1.0) quadrant = '🛡️ CORTO MUSO (Alto Elo, Golo Sotto Parità)';
      else if (eloVal < 1500 && goloVal >= 1.0) quadrant = '🌪️ ZEMANLANDIA (Basso Elo, Alto Golo)';
      else quadrant = '📉 STRUGGLERS (Basso Elo, Basso Golo)';

      // Radius normalized between 13 and 22 px for crisp medal badges
      const radius = Math.max(13, Math.min(22, 13 + (fpVal - 64.0) * 0.8));

      points.push({
        managerId: p.managerId,
        teamName: p.teamName,
        coach: p.coach,
        logo,
        x: eloVal,
        y: goloVal,
        radius,
        color,
        metricLabelX: `Elo: ${formatElo(eloVal)}`,
        metricLabelY: `Golo: ${goloVal.toFixed(2)}x`,
        extraMeta: `Media FP: ${fpVal.toFixed(1)} (${st.played} giornate)`,
        quadrant
      });
    });

    return {
      points,
      labelX: 'Rating Elo Attivo (Punti)',
      labelY: 'Golo Score (Efficacia Gol vs xG FantaPunti)',
      unitX: ' pt',
      unitY: '',
      isParitySupported: true,
      parityY: 1.00,
      crosshairX: 1500,
      crosshairY: 1.00,
      isBisectorSupported: false,
      quadrantLabels: {
        tr: '⚡ TITANI (Dominanti)',
        tl: '🌪️ ZEMANLANDIA (Spettacolo)',
        br: '🛡️ CORTO MUSO (Cinici)',
        bl: '📉 STRUGGLERS (Crisi)'
      }
    };
  } else if (view === 'fp') {
    // Calculate mean FP across participating points for crosshair baseline
    let sumFP = 0;
    activeProfiles.forEach(p => {
      const st = p.profile.seasonStats?.[sKey] || p.profile.seasonStats?.['all'] || { avgFP: 72.0 };
      sumFP += st.avgFP ?? 72.0;
    });
    const meanFP = activeProfiles.length > 0 ? sumFP / activeProfiles.length : 72.0;

    // X: Media FantaPunti, Y: Active Elo Rating, Radius: Actual Pts (completed) or Media FP (in progress)
    activeProfiles.forEach((p, idx) => {
      const tr = getManagerEloTrack(p.profile, activeMode);
      const st = p.profile.seasonStats?.[sKey] || p.profile.seasonStats?.['all'] || {
        golo: 1.0,
        avgFP: 72.0,
        actualPts: 0,
        luckDelta: 0.0,
        played: 0
      };
      const eloVal = tr?.current ?? 1500.0;
      const fpVal = st.avgFP ?? 72.0;
      const ptsVal = st.actualPts ?? 0;
      const color = MANAGER_COLORS[idx % MANAGER_COLORS.length];
      const logo = resolveTeamLogo(p.teamName, p.logo);

      // Quadrant logic: FP threshold = meanFP, Elo threshold = 1500
      let quadrant = 'Crisi Tecnica';
      if (fpVal >= meanFP && eloVal >= 1500) quadrant = '👑 DOMINATORI LEGITTIMI (Alto FP, Alto Elo)';
      else if (fpVal < meanFP && eloVal >= 1500) quadrant = '🎯 CINICI / FORTUNATI (Basso FP, Alto Elo)';
      else if (fpVal >= meanFP && eloVal < 1500) quadrant = '🗿 GIGANTI D\'ARGILLA (Alto FP, Basso Elo)';
      else quadrant = '⚠️ CRISI TECNICA (Basso FP, Basso Elo)';

      // When season is in progress, do not scale radius by incomplete points; use FP power
      const radius = inProgress
        ? Math.max(13, Math.min(22, 13 + (fpVal - 64.0) * 0.8))
        : Math.max(13, Math.min(22, 13 + ptsVal * 0.4));

      // Do not include points in the manager detail if season == in corso
      const extraMeta = inProgress
        ? `${st.played} giornate giocate`
        : `Punti Classifica: ${ptsVal} pt (${st.played} giornate)`;

      points.push({
        managerId: p.managerId,
        teamName: p.teamName,
        coach: p.coach,
        logo,
        x: fpVal,
        y: eloVal,
        radius,
        color,
        metricLabelX: `Media FP: ${fpVal.toFixed(1)}`,
        metricLabelY: `Elo: ${formatElo(eloVal)}`,
        extraMeta,
        quadrant
      });
    });

    return {
      points,
      labelX: 'Media FantaPunti per Partita',
      labelY: 'Rating Elo Attivo (Punti)',
      unitX: ' FP',
      unitY: ' pt',
      isParitySupported: false,
      crosshairX: Math.round(meanFP * 10) / 10,
      crosshairY: 1500,
      isBisectorSupported: false,
      quadrantLabels: {
        tr: '👑 DOMINATORI (Legittimi)',
        tl: '🎯 CINICI (Efficienza Max)',
        br: '🗿 GIGANTI D\'ARGILLA (Sfortunati)',
        bl: '⚠️ CRISI TECNICA'
      }
    };
  } else {
    // view === 'luck'
    if (luckSubMode === 'allPlay') {
      // X: Expected Pts All-Play, Y: Actual Pts, Radius: Media FP, Bisector Y=X
      activeProfiles.forEach((p, idx) => {
        const st = p.profile.seasonStats?.[sKey] || p.profile.seasonStats?.['all'] || {
          golo: 1.0,
          avgFP: 72.0,
          actualPts: 0,
          xPts: 0,
          luckDelta: 0.0,
          played: 0
        };
        const xPts = st.xPts ?? 0;
        const actPts = st.actualPts ?? 0;
        const luckDelta = st.luckDelta !== undefined ? st.luckDelta : (actPts - xPts);
        const fpVal = st.avgFP ?? 72.0;
        const color = MANAGER_COLORS[idx % MANAGER_COLORS.length];
        const logo = resolveTeamLogo(p.teamName, p.logo);

        let quadrant = 'In Parità';
        if (luckDelta > 0.5) quadrant = '🍀 BACIATO DALLA FORTUNA (+Schedule Luck)';
        else if (luckDelta < -0.5) quadrant = '💀 BERSAGLIATO DALLA SFIGA (-Schedule Luck)';
        else quadrant = '⚖️ NEUTRO / EQUILIBRATO';

        const radius = Math.max(13, Math.min(22, 13 + (fpVal - 64.0) * 0.8));

        points.push({
          managerId: p.managerId,
          teamName: p.teamName,
          coach: p.coach,
          logo,
          x: xPts,
          y: actPts,
          radius,
          color,
          metricLabelX: `xPts All-Play: ${xPts.toFixed(1)}`,
          metricLabelY: `Punti Reali: ${actPts}`,
          extraMeta: `Sfiga/Fortuna Δ: ${luckDelta > 0 ? '+' : ''}${luckDelta.toFixed(2)} pt`,
          quadrant
        });
      });

      return {
        points,
        labelX: 'Punti Attesi All-Play (xPts)',
        labelY: 'Punti Reali in Classifica',
        unitX: ' pt',
        unitY: ' pt',
        isParitySupported: false,
        isBisectorSupported: true,
        quadrantLabels: {
          tr: '',
          tl: '🍀 OVER-PERFORMER (Punti > xPts)',
          br: '💀 UNDER-PERFORMER (Punti < xPts)',
          bl: ''
        }
      };
    } else {
      // luckSubMode === 'h2hVsAtlas'
      // X: Elo Puro (H2H), Y: Atlas Power (All-Play), Radius: Media FP, Bisector Y=X
      activeProfiles.forEach((p, idx) => {
        const trPuro = getManagerEloTrack(p.profile, 'flat');
        const trAtlas = getManagerEloTrack(p.profile, 'atlas');
        const st = p.profile.seasonStats?.[sKey] || p.profile.seasonStats?.['all'] || { avgFP: 72.0, played: 0 };
        const eloPuro = trPuro?.current ?? 1500.0;
        const eloAtlas = trAtlas?.current ?? 1500.0;
        const disparity = eloAtlas - eloPuro;
        const color = MANAGER_COLORS[idx % MANAGER_COLORS.length];
        const logo = resolveTeamLogo(p.teamName, p.logo);

        let quadrant = 'Neutro';
        if (disparity > 10.0) quadrant = '🔮 FORZA SOMMERSA (All-Play Superiore a H2H)';
        else if (disparity < -10.0) quadrant = '🎲 PRIVILEGIATO DAL CALENDARIO (H2H Superiore)';
        else quadrant = '⚖️ CONSISTENTE (H2H ≈ All-Play)';

        const radius = Math.max(13, Math.min(22, 13 + ((st.avgFP ?? 72.0) - 64.0) * 0.8));

        points.push({
          managerId: p.managerId,
          teamName: p.teamName,
          coach: p.coach,
          logo,
          x: eloPuro,
          y: eloAtlas,
          radius,
          color,
          metricLabelX: `Elo Puro H2H: ${formatElo(eloPuro)}`,
          metricLabelY: `Atlas Power: ${formatElo(eloAtlas)}`,
          extraMeta: `Disparità All-Play vs H2H: ${disparity > 0 ? '+' : ''}${disparity.toFixed(1)} pt`,
          quadrant
        });
      });

      return {
        points,
        labelX: 'Elo Puro H2H (Rating Tradizionale)',
        labelY: 'Atlas Power Rating (Dual-Kernel All-Play)',
        unitX: ' pt',
        unitY: ' pt',
        isParitySupported: false,
        isBisectorSupported: true,
        quadrantLabels: {
          tr: '',
          tl: '🔮 ROSTER POTENTE (All-Play > H2H)',
          br: '🎲 PRIVILEGIATO (H2H > All-Play)',
          bl: ''
        }
      };
    }
  }
}
