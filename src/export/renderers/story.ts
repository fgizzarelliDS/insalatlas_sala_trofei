import type { Manager } from '@/types';
import { calculateManagerScore, formatScore } from '@/score';
import {
  computeGlobalClutchIndex,
  getClutchTier,
  computeTailRiskProfile,
  computeStabilityProfile,
  getManagerArchetype,
  computeHeadToHead
} from '@/analytics';
import {
  computeMultiManagerAnalysis,
  type MultiManagerAnalysis
} from '@/analytics/multiManager';
import { renderMultiManagerRadarSVG } from '@/components/modals/h2h/MultiManagerRadar';
import { computeH2HAxes, renderH2HRadarSVG } from '@/components/modals/h2h/HeadToHeadRadar';
import { resolveTeamLogo } from '@/crests';
import { renderNodeToCanvas } from './core';

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const SAFE_ZONE_TOP = 160;
const SAFE_ZONE_BOTTOM = 220;

/**
 * Creates the base 1080x1920 story container with Instagram/WhatsApp safe zones
 */
function createStoryContainer(title: string, subtitle: string): {
  container: HTMLDivElement;
  contentBox: HTMLDivElement;
} {
  const container = document.createElement('div');
  container.id = 'insalatlas-story-export-container';
  container.style.width = `${STORY_WIDTH}px`;
  container.style.height = `${STORY_HEIGHT}px`;
  container.style.maxHeight = `${STORY_HEIGHT}px`;
  container.style.minHeight = `${STORY_HEIGHT}px`;
  container.style.boxSizing = 'border-box';
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';
  container.style.padding = `${SAFE_ZONE_TOP}px 60px ${SAFE_ZONE_BOTTOM}px 60px`;
  container.style.background = 'radial-gradient(ellipse at 50% 12%, #1e1b4b 0%, #090d16 60%, #020617 100%)';
  container.style.color = '#f8fafc';
  container.style.fontFamily = "'Montserrat', 'Inter', system-ui, -apple-system, sans-serif";
  if (container.style && typeof container.style.setProperty === 'function') {
    container.style.setProperty('--text-main', '#f8fafc');
    container.style.setProperty('--text-muted', '#94a3b8');
    container.style.setProperty('--h2h-contender-a', '#f43f5e');
    container.style.setProperty('--h2h-contender-b', '#06b6d4');
    container.style.setProperty('--table-border', '#334155');
    container.style.setProperty('--table-surface', 'rgba(15, 23, 42, 0.7)');
  }

  // Top Safe-Zone Border Indicator / Header Bar
  const headerBar = document.createElement('div');
  headerBar.className = 'w-full flex items-center justify-between pb-6 border-b border-amber-500/30';
  headerBar.innerHTML = `
    <div class="flex items-center gap-3">
      <img src="favicon-64x64.png" alt="Logo" class="w-10 h-10 object-contain drop-shadow-md">
      <div>
        <h1 class="font-sport font-black text-2xl tracking-wider uppercase text-amber-400 leading-none">
          INSALATLAS
        </h1>
        <p class="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">
          ${subtitle}
        </p>
      </div>
    </div>
    <div class="px-3.5 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 font-extrabold text-xs tracking-wider uppercase">
      ${title}
    </div>
  `;
  container.appendChild(headerBar);

  // Content Box (Centered inside Safe Zone)
  const contentBox = document.createElement('div');
  contentBox.className = 'flex-1 flex flex-col justify-around py-6 w-full max-w-[960px] mx-auto';
  container.appendChild(contentBox);

  // Bottom Safe-Zone Watermark Footer
  const footerBar = document.createElement('div');
  footerBar.className = 'w-full pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-bold tracking-wider uppercase';
  footerBar.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
      <span>Sala Trofei Ufficiale</span>
    </div>
    <span class="text-slate-500">insalatlas.it</span>
  `;
  container.appendChild(footerBar);

  return { container, contentBox };
}

/**
 * 1. Renders High-Definition Vertical 9:16 Story for a Manager Profile
 */
export async function renderManagerStoryCanvas(manager: Manager): Promise<HTMLCanvasElement> {
  const { container, contentBox } = createStoryContainer('Scheda Manager', 'Bacheca & Statistiche');

  const score = calculateManagerScore(manager);
  const totalMajor = (manager.gold || 0) + (manager.cup_gold || 0) + (manager.supercup || 0) + (manager.mundialito || 0);
  const efficiency = manager.years > 0 ? parseFloat((totalMajor / manager.years).toFixed(2)) : 0;
  const arch = getManagerArchetype(manager, totalMajor, efficiency);

  const completedYears = manager.history && manager.history.length > 0
    ? manager.history.filter(h => !h.in_progress && h.status !== 'in_progress').length
    : (manager.years || 0);

  const podiums = (manager.gold || 0) + (manager.silver || 0) + (manager.bronze || 0);
  const finalsWon = (manager.cup_gold || 0) + (manager.supercup || 0);
  const finalsPlayed = finalsWon + (manager.cup_silver || 0) + (manager.supercup_silver || 0);
  const gci = computeGlobalClutchIndex(manager.gold || 0, podiums, finalsWon, finalsPlayed, completedYears);
  const clutch = getClutchTier(gci, completedYears);
  const risk = computeTailRiskProfile(manager);
  const stability = computeStabilityProfile(manager);

  const latestTeam = (manager.history && manager.history.length > 0)
    ? manager.history[manager.history.length - 1].team || manager.name
    : manager.name;
  const logoUrl = resolveTeamLogo(latestTeam);

  // Compute 6 normalized axes for radar
  const kiPct = podiums > 0 ? parseFloat((((manager.gold || 0) / podiums) * 100).toFixed(1)) : 0;
  const crPct = finalsPlayed > 0 ? parseFloat(((finalsWon / finalsPlayed) * 100).toFixed(1)) : 0;

  const mockH2HStats = {
    metricsA: {
      score,
      gci,
      clutchLabel: clutch.label,
      clutchIcon: clutch.icon,
      clutchColor: clutch.color,
      kiPct,
      crPct,
      nti: risk.nti,
      polarityLabel: risk.label,
      polarityIcon: risk.icon,
      polarityColor: risk.color,
      stabilityCategory: stability.category,
      stabilityIcon: stability.icon,
      stdDevRank: stability.stdDevRank,
      archetypeTag: arch.tag,
      archetypeIcon: arch.icon,
      archetypeColor: arch.color
    },
    metricsB: {
      score,
      gci,
      clutchLabel: clutch.label,
      clutchIcon: clutch.icon,
      clutchColor: clutch.color,
      kiPct,
      crPct,
      nti: risk.nti,
      polarityLabel: risk.label,
      polarityIcon: risk.icon,
      polarityColor: risk.color,
      stabilityCategory: stability.category,
      stabilityIcon: stability.icon,
      stdDevRank: stability.stdDevRank,
      archetypeTag: arch.tag,
      archetypeIcon: arch.icon,
      archetypeColor: arch.color
    }
  };

  const axes = computeH2HAxes(mockH2HStats as any, 40);
  const radarSvg = renderH2HRadarSVG(axes, manager.name, '', 860, 680);

  contentBox.innerHTML = `
    <!-- Manager Identity Hero -->
    <div class="flex flex-col items-center text-center">
      <div class="relative mb-3">
        <div class="w-32 h-32 rounded-3xl border-2 border-amber-400/50 p-2 bg-slate-900/80 shadow-2xl flex items-center justify-center">
          <img src="${logoUrl}" alt="${manager.name}" class="w-full h-full object-contain drop-shadow-xl" onerror="this.src='favicon-64x64.png'">
        </div>
        <span class="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-lg">
          ${manager.years} ${manager.years === 1 ? 'Anno' : 'Anni'}
        </span>
      </div>

      <h2 class="font-sport font-black text-4xl uppercase tracking-wider text-white mt-1">
        ${manager.name}
      </h2>
      <div class="flex items-center gap-2 mt-2">
        <span class="px-3 py-1 rounded-full font-bold text-xs border" style="color: ${arch.color}; border-color: ${arch.color}50; background-color: ${arch.color}15;">
          <i class="fa-solid ${arch.icon} mr-1"></i>${arch.tag}
        </span>
        <span class="px-3 py-1 rounded-full font-bold text-xs bg-slate-800 text-cyan-300 border border-cyan-500/30">
          ${clutch.icon} ${clutch.label}
        </span>
      </div>
    </div>

    <!-- Rating Banner -->
    <div class="w-full p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-slate-900/80 to-amber-500/15 text-center shadow-xl">
      <div class="text-xs uppercase tracking-widest text-amber-400 font-extrabold mb-1">
        Rating Storico InsalAtlas
      </div>
      <div class="font-sport font-black text-5xl text-amber-400 font-mono tracking-tight drop-shadow-md">
        ${formatScore(score)} <span class="text-2xl text-amber-300">PT</span>
      </div>
      <div class="text-[11px] text-slate-400 font-semibold mt-1">
        <i class="fa-solid ${risk.icon.replace(/^fa-solid\s+/, '')} text-emerald-400 mr-1"></i>${risk.label} • <i class="fa-solid ${stability.icon.replace(/^fa-solid\s+/, '')} text-cyan-400 mr-1"></i>Stabilità: ${stability.category}
      </div>
    </div>

    <!-- Radar Chart Visualizer -->
    <div class="w-full rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 flex flex-col items-center justify-center shadow-inner">
      <div class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
        Impronta Tattica & Prestazioni
      </div>
      <div class="w-full flex justify-center py-2">
        ${radarSvg}
      </div>
    </div>

    <!-- Palmarès Showcase Grid -->
    <div class="w-full grid grid-cols-3 gap-3">
      <div class="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-center flex flex-col items-center">
        <span class="text-2xl">🥇</span>
        <span class="font-black text-2xl text-amber-400 font-mono mt-1">${manager.gold || 0}</span>
        <span class="text-[10px] uppercase font-bold text-slate-300">Scudetti</span>
      </div>
      <div class="p-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-center flex flex-col items-center">
        <span class="text-2xl">🏆</span>
        <span class="font-black text-2xl text-yellow-400 font-mono mt-1">${manager.cup_gold || 0}</span>
        <span class="text-[10px] uppercase font-bold text-slate-300">Coppe Lega</span>
      </div>
      <div class="p-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-center flex flex-col items-center">
        <span class="text-2xl">⭐</span>
        <span class="font-black text-2xl text-yellow-300 font-mono mt-1">${manager.supercup || 0}</span>
        <span class="text-[10px] uppercase font-bold text-slate-300">Supercoppe</span>
      </div>
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}

/**
 * 2. Renders High-Definition Vertical 9:16 Story for a 1vs1 Head-to-Head Duel
 */
export async function renderH2HDuelStoryCanvas(
  managerA: Manager,
  managerB: Manager
): Promise<HTMLCanvasElement> {
  const { container, contentBox } = createStoryContainer('Duello H2H', 'Scontri Diretti & Rivalità');
  contentBox.className = 'flex-1 flex flex-col justify-between py-4 w-full max-w-[960px] mx-auto';

  const stats = computeHeadToHead(managerA, managerB);
  const axes = computeH2HAxes(stats, 40);
  const radarSvg = renderH2HRadarSVG(axes, managerA.name, managerB.name, 860, 680);

  const teamA = (managerA.history && managerA.history.length > 0)
    ? managerA.history[managerA.history.length - 1].team || managerA.name
    : managerA.name;
  const teamB = (managerB.history && managerB.history.length > 0)
    ? managerB.history[managerB.history.length - 1].team || managerB.name
    : managerB.name;

  const logoA = resolveTeamLogo(teamA);
  const logoB = resolveTeamLogo(teamB);

  contentBox.innerHTML = `
    <!-- Face-off Contenders Header -->
    <div class="w-full flex items-center justify-between px-2">
      <!-- Contender A -->
      <div class="flex-1 flex flex-col items-center text-center">
        <div class="w-24 h-24 rounded-2xl border-2 border-rose-500/60 p-2 bg-slate-900/90 shadow-xl flex items-center justify-center mb-2">
          <img src="${logoA}" alt="${managerA.name}" class="w-full h-full object-contain drop-shadow" onerror="this.src='favicon-64x64.png'">
        </div>
        <h3 class="font-sport font-black text-xl uppercase tracking-wider text-rose-400">
          ${managerA.name}
        </h3>
        <span class="text-[11px] font-bold text-slate-400">
          ${formatScore(stats.palmares.ratingScore.a)} PT
        </span>
      </div>

      <!-- VS Badge -->
      <div class="flex flex-col items-center px-4">
        <div class="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black text-base shadow-lg">
          VS
        </div>
        <span class="text-[10px] uppercase font-bold text-slate-500 mt-1">
          ${stats.sharedSeasonsCount} campionati
        </span>
      </div>

      <!-- Contender B -->
      <div class="flex-1 flex flex-col items-center text-center">
        <div class="w-24 h-24 rounded-2xl border-2 border-cyan-500/60 p-2 bg-slate-900/90 shadow-xl flex items-center justify-center mb-2">
          <img src="${logoB}" alt="${managerB.name}" class="w-full h-full object-contain drop-shadow" onerror="this.src='favicon-64x64.png'">
        </div>
        <h3 class="font-sport font-black text-xl uppercase tracking-wider text-cyan-400">
          ${managerB.name}
        </h3>
        <span class="text-[11px] font-bold text-slate-400">
          ${formatScore(stats.palmares.ratingScore.b)} PT
        </span>
      </div>
    </div>

    <!-- Scontri Diretti Big Scoreboard -->
    <div class="w-full p-4 rounded-2xl border border-slate-800 bg-slate-900/80 flex items-center justify-around shadow-xl">
      <div class="text-center">
        <span class="text-xs uppercase font-extrabold text-rose-400">Vittorie</span>
        <div class="font-sport font-black text-5xl text-rose-400 font-mono mt-1">${stats.winsA}</div>
      </div>
      <div class="h-12 w-px bg-slate-800"></div>
      <div class="text-center">
        <span class="text-xs uppercase font-extrabold text-slate-400">Pareggi</span>
        <div class="font-sport font-black text-5xl text-slate-300 font-mono mt-1">${stats.ties}</div>
      </div>
      <div class="h-12 w-px bg-slate-800"></div>
      <div class="text-center">
        <span class="text-xs uppercase font-extrabold text-cyan-400">Vittorie</span>
        <div class="font-sport font-black text-5xl text-cyan-400 font-mono mt-1">${stats.winsB}</div>
      </div>
    </div>

    <!-- Radar Duel Visualizer -->
    <div class="w-full rounded-3xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col items-center justify-center shadow-2xl">
      <div class="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
        Radar Comparativo Scontri Diretti
      </div>
      <div class="w-full flex justify-center py-2">
        ${radarSvg}
      </div>
    </div>

    <!-- Narrative Verdict Badge -->
    <div class="w-full p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
      <span class="text-xs font-bold text-amber-300">
        Verdetto: "${stats.narrativeVerdict}"
      </span>
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}

/**
 * 3. Renders High-Definition Vertical 9:16 Story for Multi-Manager "Tavolo dei Rivali"
 */
export async function renderMultiManagerStoryCanvas(
  managers: Manager[],
  tournamentMode: 'ppg' | 'simultaneous' = 'simultaneous'
): Promise<HTMLCanvasElement> {
  const { container, contentBox } = createStoryContainer('Tavolo Rivali', 'Cluster Multi-Manager');
  contentBox.className = 'flex-1 flex flex-col justify-between py-4 w-full max-w-[960px] mx-auto';

  const analysis: MultiManagerAnalysis = computeMultiManagerAnalysis(managers, tournamentMode);
  const radarSvg = renderMultiManagerRadarSVG(analysis, new Set(), 860, 680);

  const managerChips = analysis.managers
    .map(
      p => `
      <div class="flex items-center gap-2.5 px-4 py-2 rounded-2xl border border-slate-700/80 bg-slate-900/90 text-sm font-black shadow-lg">
        <span class="w-3.5 h-3.5 rounded-full ring-2 ring-white/20" style="background-color: ${p.color};"></span>
        <span class="text-white">${p.manager.name}</span>
      </div>
    `
    )
    .join('');

  const isSimultaneousEmpty = tournamentMode === 'simultaneous' && analysis.sharedSeasonsAcrossAll.length === 0;

  const tableRows = analysis.miniTournament
    .map((entry, idx) => `
      <tr class="border-b border-slate-800/60 text-sm font-semibold">
        <td class="py-3 px-4 text-center font-bold text-amber-400 text-base">${idx === 0 ? '👑' : `${idx + 1}°`}</td>
        <td class="py-3 px-4 font-bold flex items-center gap-3">
          <span class="w-3.5 h-3.5 rounded-full flex-shrink-0" style="background-color: ${entry.color};"></span>
          <span class="text-white text-base">${entry.managerName}</span>
        </td>
        <td class="py-3 px-3 text-center font-mono text-slate-300">${entry.matches}</td>
        <td class="py-3 px-3 text-center font-mono text-emerald-400 font-bold">${entry.wins}</td>
        <td class="py-3 px-3 text-center font-mono text-slate-400">${entry.ties}</td>
        <td class="py-3 px-3 text-center font-mono text-rose-400 font-bold">${entry.losses}</td>
        ${tournamentMode === 'ppg' ? `
          <td class="py-3 px-4 text-center bg-amber-500/5">
            <span class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-black text-sm">
              ${entry.ppg.toFixed(2)}
            </span>
          </td>
        ` : ''}
        <td class="py-3 px-4 text-center font-black font-mono text-amber-300 text-lg">${entry.points}</td>
      </tr>
    `)
    .join('');

  contentBox.innerHTML = `
    <!-- Rivalry Cluster Header -->
    <div class="w-full flex flex-col items-center text-center">
      <h2 class="font-sport font-black text-5xl uppercase tracking-wider text-white">
        Sfida Multi-Rivalità
      </h2>
      <p class="text-lg text-slate-400 font-bold mt-2">
        Confronto diretto a ${managers.length} manager su 6 dimensioni statistiche
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3 mt-4">
        ${managerChips}
      </div>
    </div>

    <!-- Multi-Radar Chart Visualizer -->
    <div class="w-full rounded-3xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col items-center justify-center shadow-2xl">
      <div class="w-full flex justify-center">
        ${radarSvg}
      </div>
    </div>

    <!-- Mini-Torneo Standings Table -->
    <div class="w-full rounded-3xl border border-slate-800 bg-slate-900/85 overflow-hidden shadow-2xl">
      <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-sm uppercase font-extrabold text-amber-400 tracking-wider">
            Classifica Mini-Torneo Scontri Diretti
          </span>
          <span class="px-3 py-1 rounded-full text-xs font-black uppercase ${tournamentMode === 'ppg' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300 border border-slate-700'}">
            ${tournamentMode === 'ppg' ? 'Normalizzata (PPG)' : 'Solo Contemporanee'}
          </span>
        </div>
        <span class="text-xs text-slate-400 font-bold">
          ${tournamentMode === 'ppg' ? `${analysis.totalPairwiseSeasonsCount} stagioni incrociate` : `${analysis.sharedSeasonsAcrossAll.length} ${analysis.sharedSeasonsAcrossAll.length === 1 ? 'stagione contemporanea' : 'stagioni contemporanee'}`}
        </span>
      </div>
      ${isSimultaneousEmpty ? `
        <div class="p-8 text-center text-slate-400 font-bold text-sm">
          Nessuna stagione contemporanea disputata insieme da tutti i ${managers.length} manager.
        </div>
      ` : `
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-slate-800 uppercase text-xs text-slate-400 font-bold bg-slate-950/60">
              <th class="py-3 px-4 text-center">#</th>
              <th class="py-3 px-4">Manager</th>
              <th class="py-3 px-3 text-center">PG</th>
              <th class="py-3 px-3 text-center text-emerald-400">V</th>
              <th class="py-3 px-3 text-center">N</th>
              <th class="py-3 px-3 text-center text-rose-400">P</th>
              ${tournamentMode === 'ppg' ? '<th class="py-3 px-4 text-center text-amber-300 bg-amber-500/10">Media Pt</th>' : ''}
              <th class="py-3 px-4 text-center text-amber-400">PT</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `}
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}

