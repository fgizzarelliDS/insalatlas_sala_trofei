import type { Manager, LeagueRecord, LiveSeasonDetails, LiveTeamMetrics } from '@/types';
import { state } from '@/state';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { calculateManagerScore, formatScore } from '@/score';
import {
  computeManagerClutchMetrics,
  computeSingleManagerRadarAxes,
  computeTailRiskProfile,
  computeStabilityProfile,
  getManagerArchetype,
  computeHeadToHead
} from '@/analytics';
import { computeAllLeagueRecords } from '@/analytics/records';
import {
  computeMultiManagerAnalysis,
  type MultiManagerAnalysis
} from '@/analytics/multiManager';
import { renderMultiManagerRadarSVG } from '@/components/modals/h2h/MultiManagerRadar';
import { computeH2HAxes, renderH2HRadarSVG, type H2HAxisData } from '@/components/modals/h2h/HeadToHeadRadar';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { renderNodeToCanvas } from './core';
import { LEAGUE, LEAGUE_SITE_HOST } from '@/config';

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const SAFE_ZONE_TOP = 160;
const SAFE_ZONE_BOTTOM = 220;

/**
 * Creates the base 1080x1920 story container with Instagram/WhatsApp safe zones
 */
export function createStoryContainer(title: string, subtitle: string): {
  container: HTMLDivElement;
  contentBox: HTMLDivElement;
} {
  const container = document.createElement('div');
  container.id = 'league-story-export-container';
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
          ${LEAGUE.brand.name.toUpperCase()}
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
      <span>${LEAGUE.brand.mainTitle || 'Sala Trofei'} Ufficiale</span>
    </div>
    <span class="text-slate-500">${LEAGUE_SITE_HOST}</span>
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

  const clutchMetrics = computeManagerClutchMetrics(manager);
  const risk = computeTailRiskProfile(manager);
  const stability = computeStabilityProfile(manager);

  const latestTeam = (manager.history && manager.history.length > 0)
    ? manager.history[manager.history.length - 1].team || manager.name
    : manager.name;
  const logoUrl = resolveTeamLogo(latestTeam);

  // Compute 6 normalized axes for radar directly without any mock H2H stats
  const singleAxes = computeSingleManagerRadarAxes(manager, 40);
  const axes: H2HAxisData[] = singleAxes.map(ax => ({
    key: ax.key,
    label: ax.label,
    shortTitle: ax.shortTitle,
    acronym: ax.acronym,
    valA: ax.val,
    valB: 0,
    rawA: ax.raw,
    rawB: ''
  }));

  const radarSvg = renderH2HRadarSVG(axes, manager.name, '', 860, 680);

  contentBox.innerHTML = `
    <!-- Manager Identity Hero -->
    <div class="flex flex-col items-center text-center">
      <div class="relative mb-3">
        <div class="w-32 h-32 rounded-3xl border-2 border-amber-400/50 p-2 bg-slate-900/80 shadow-2xl flex items-center justify-center">
          <img src="${logoUrl}" alt="${manager.name}" class="w-full h-full object-contain drop-shadow-xl" onerror="this.onerror=null; this.src='favicon-64x64.png'">
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
          ${clutchMetrics.clutch.icon} ${clutchMetrics.clutch.label}
        </span>
      </div>
    </div>

    <!-- Rating Banner -->
    <div class="w-full p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-slate-900/80 to-amber-500/15 text-center shadow-xl">
      <div class="text-xs uppercase tracking-widest text-amber-400 font-extrabold mb-1">
        Rating Storico ${LEAGUE.brand.name}
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
          <img src="${logoA}" alt="${managerA.name}" class="w-full h-full object-contain drop-shadow" onerror="this.onerror=null; this.src='favicon-64x64.png'">
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
          <img src="${logoB}" alt="${managerB.name}" class="w-full h-full object-contain drop-shadow" onerror="this.onerror=null; this.src='favicon-64x64.png'">
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

/**
 * 4. Renders High-Definition Vertical 9:16 Story for an Individual Hall of Fame Record
 */
export async function renderRecordStoryCanvas(record: LeagueRecord): Promise<HTMLCanvasElement> {
  const { container, contentBox } = createStoryContainer('Primato Storico', record.category.toUpperCase());
  contentBox.className = 'flex-1 flex flex-col justify-between py-4 w-full max-w-[960px] mx-auto';

  const isCoHolders = record.primaryHolders && record.primaryHolders.length > 1;
  const primary = record.primaryHolder;

  // Render Co-holders or single holder hero
  const coHoldersHTML = isCoHolders ? `
    <div class="w-full rounded-3xl border border-slate-800 bg-slate-900/85 p-5 shadow-2xl">
      <div class="text-xs uppercase font-extrabold text-amber-400 tracking-wider mb-3 text-center">
        🤝 Co-Primatisti Ufficiali (Pari Merito)
      </div>
      <div class="grid grid-cols-${Math.min(record.primaryHolders.length, 3)} gap-3">
        ${record.primaryHolders.map(h => `
          <div class="flex flex-col items-center p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            ${h.logo ? `<img src="${h.logo}" class="w-16 h-16 object-contain drop-shadow-md mb-2" onerror="this.onerror=null; this.src='${h.fallbackCrest || 'favicon-64x64.png'}'">` : `<div class="w-16 h-16 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-black text-xl mb-2">${h.fallbackCrest || h.managerName.charAt(0)}</div>`}
            <span class="font-sport font-black text-lg uppercase text-white truncate max-w-full">${h.managerName}</span>
            ${h.season ? `<span class="text-xs text-amber-400 font-bold mt-0.5">${h.season}</span>` : ''}
            ${h.teamName ? `<span class="text-[11px] text-slate-400 truncate max-w-full italic mt-0.5">${h.teamName}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : `
    <div class="w-full flex flex-col items-center text-center p-6 rounded-3xl border border-slate-800 bg-slate-900/85 shadow-2xl">
      <div class="relative mb-3">
        ${primary.logo ? `<img src="${primary.logo}" class="w-28 h-28 object-contain drop-shadow-xl" onerror="this.onerror=null; this.src='${primary.fallbackCrest || 'favicon-64x64.png'}'">` : `<div class="w-28 h-28 rounded-full bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center font-sport font-black text-4xl shadow-xl">${primary.fallbackCrest || primary.managerName.charAt(0)}</div>`}
        <span class="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg border-2 border-slate-900">👑</span>
      </div>
      <h2 class="font-sport font-black text-4xl uppercase tracking-wider text-white">
        ${primary.managerName}
      </h2>
      ${primary.teamName ? `<p class="text-sm text-slate-400 font-semibold italic mt-1">${primary.teamName}</p>` : ''}
      ${primary.season ? `<div class="mt-2 px-3.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">${primary.season}</div>` : ''}
    </div>
  `;

  // Runner-ups podium box (if any)
  const runnerUpsHTML = (record.runnerUps && record.runnerUps.length > 0) ? `
    <div class="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl">
      <div class="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2.5 text-center">
        🏆 Podio Storico
      </div>
      <div class="flex items-center justify-around divide-x divide-slate-800">
        ${record.runnerUps.slice(0, 3).map((r, i) => {
          const medal = i === 0 ? '🥈' : i === 1 ? '🥉' : '🎖️';
          const posLabel = `${i + 2}° Classificato`;
          const logo = r.logo || (r.teamName ? resolveTeamLogo(r.teamName) : null);
          const fallback = r.fallbackCrest || (r.teamName ? getTeamFallbackCrest(r.teamName) : null);
          const crestImg = logo
            ? `<img src="${logo}" class="w-10 h-10 object-contain drop-shadow-md rounded-full bg-slate-800/50 p-0.5" onerror="this.onerror=null; this.src='${fallback || 'favicon-64x64.png'}'">`
            : fallback
              ? `<img src="${fallback}" class="w-10 h-10 object-contain drop-shadow-md rounded-full bg-slate-800/50 p-0.5" onerror="this.onerror=null; this.src='favicon-64x64.png'">`
              : `<div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm shadow">${r.managerName.charAt(0)}</div>`;

          return `
            <div class="flex-1 px-3 flex flex-col items-center text-center">
              <span class="text-[11px] font-bold text-slate-400 mb-1.5">${posLabel}</span>
              <div class="relative inline-flex mb-1.5">
                ${crestImg}
                <span class="absolute -bottom-1 -right-1.5 text-xs drop-shadow">${medal}</span>
              </div>
              <div class="font-bold text-sm text-slate-200 truncate max-w-full">${r.managerName}</div>
              ${r.teamName ? `<div class="text-[10px] text-slate-400 italic truncate max-w-full mt-0.5">${r.teamName}</div>` : ''}
              <div class="text-xs text-amber-400 font-mono font-bold mt-1">${r.formattedValue || r.value}</div>
              ${r.season ? `<div class="text-[10px] text-slate-500 font-medium mt-0.5">${r.season}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  contentBox.innerHTML = `
    <!-- Top Header: Title & Category -->
    <div class="w-full flex flex-col items-center text-center">
      <div class="flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
        <i class="${record.icon}"></i>
        <span>${record.badgeLabel || 'Primato Storico'}</span>
      </div>
      <h1 class="font-sport font-black text-4xl uppercase tracking-wider text-white leading-tight">
        ${record.title}
      </h1>
      ${record.description ? `<p class="text-sm text-slate-400 font-medium max-w-[800px] mt-2 italic">"${record.description}"</p>` : ''}
    </div>

    <!-- Big Value Showcase Box -->
    <div class="w-full p-6 rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
      <span class="text-7xl absolute opacity-10 select-none">${record.watermark || '🏆'}</span>
      <span class="text-xs font-extrabold uppercase tracking-widest text-amber-400/80 mb-1">Valore Ufficiale Record</span>
      <div class="font-sport font-black text-6xl text-amber-400 font-mono tracking-tight drop-shadow-md">
        ${primary.formattedValue}
      </div>
      ${(primary.normalizedDetail || primary.detail) ? `
        <div class="text-sm font-bold text-slate-300 mt-2 px-4 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80">
          ${primary.normalizedDetail || primary.detail}
        </div>
      ` : ''}
    </div>

    <!-- Holder(s) Section -->
    ${coHoldersHTML}

    <!-- Runner-ups Section -->
    ${runnerUpsHTML}
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}

/**
 * 5. Renders High-Definition Vertical 9:16 Story for Marquee Records Summary Poster
 */
export async function renderRecordsSummaryStoryCanvas(recordsList?: LeagueRecord[]): Promise<HTMLCanvasElement> {
  const champLabel = LEAGUE.brand.championshipLabel || LEAGUE.brand.name;
  const { container, contentBox } = createStoryContainer('Hall of Fame', `Top Primati di ${champLabel}`);
  contentBox.className = 'flex-1 flex flex-col justify-between py-3 w-full max-w-[960px] mx-auto';

  const allRecords = recordsList || computeAllLeagueRecords(state.managers, state.competitions);

  // Marquee record IDs to feature in the top story summary
  const targetIds = [
    'max_single_season_points',
    'most_scudetti',
    'most_cups',
    'debut_best_ppg',
    'debut_best_rank',
    'debut_disaster'
  ];

  const marquee = targetIds
    .map(id => allRecords.find(r => r.id === id))
    .filter((r): r is LeagueRecord => Boolean(r));

  const rowsHTML = marquee.map(r => {
    const h = r.primaryHolder;
    const isTied = r.primaryHolders && r.primaryHolders.length > 1;
    const holderText = isTied
      ? `${r.primaryHolders.map(x => x.managerName).join(' & ')} (Pari)`
      : `${h.managerName}${h.season ? ` (${h.season})` : ''}`;

    return `
      <div class="flex items-center justify-between p-3.5 rounded-2xl border border-slate-800 bg-slate-900/85 shadow-lg">
        <div class="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 text-base">
            <i class="${r.icon}"></i>
          </div>
          <div class="min-w-0">
            <h4 class="font-sport font-black text-sm uppercase text-white truncate">
              ${r.title}
            </h4>
            <div class="flex items-center gap-1.5 text-xs text-slate-400 truncate mt-0.5">
              <span class="text-amber-400 font-bold">👑 ${holderText}</span>
            </div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-sport font-black text-lg text-amber-300 font-mono leading-none">
            ${h.formattedValue}
          </div>
          <span class="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            ${r.badgeLabel || ''}
          </span>
        </div>
      </div>
    `;
  }).join('');

  contentBox.innerHTML = `
    <!-- Poster Top Header -->
    <div class="w-full flex flex-col items-center text-center">
      <div class="flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
        <span>🏆 ALBO DEI PRIMATI ASSOLUTI</span>
      </div>
      <h1 class="font-sport font-black text-5xl uppercase tracking-wider text-white">
        Hall of Fame
      </h1>
      <p class="text-sm text-slate-400 font-bold mt-1.5">
        Le grandi pietre miliari e le leggende di ${champLabel}
      </p>
    </div>

    <!-- Curated Marquee Records Stack -->
    <div class="w-full space-y-2.5 my-auto">
      ${rowsHTML}
    </div>

    <!-- Bottom Trivia Banner -->
    <div class="w-full p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 text-center text-xs text-slate-400 font-medium">
      I record ufficiali sono calcolati su tutte le edizioni storiche disputate.
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}

/**
 * 6. Renders High-Definition Vertical 9:16 Story for Official League Standings
 */
export async function renderStandingsStoryCanvas(
  customLiveData?: LiveSeasonDetails
): Promise<HTMLCanvasElement> {
  const liveData = customLiveData || getLiveSeasonDetails() || (typeof window !== 'undefined' ? (window as any).liveSeasonData : null);
  if (!liveData) {
    throw new Error('Dati di stagione live non disponibili per la generazione della story');
  }

  const seasonLabel = liveData.season || 'Live';
  const standings: LiveTeamMetrics[] = liveData.standings || [];
  const lastRound = liveData.lastCompletedRound || 1;

  const { container, contentBox } = createStoryContainer(
    'Classifica Ufficiale',
    `Stagione ${seasonLabel}`
  );

  // Identify top offense and leader
  const leader = standings[0];
  const topOffense = standings.slice().sort((a, b) => (b.totalFantaPoints || 0) - (a.totalFantaPoints || 0))[0];

  const rowsHTML = standings.map((t, idx) => {
    const rank = idx + 1;
    let rankBadgeStyle = 'border-slate-700 bg-slate-800/80 text-slate-300';
    let rowBorder = 'border-slate-800/60';
    let rowBg = 'bg-slate-900/60';

    if (rank === 1) {
      rankBadgeStyle = 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-sm';
      rowBorder = 'border-amber-500/40';
      rowBg = 'bg-amber-950/20';
    } else if (rank === 2) {
      rankBadgeStyle = 'border-slate-300 bg-slate-400/25 text-slate-100 shadow-sm';
      rowBorder = 'border-slate-400/30';
      rowBg = 'bg-slate-800/40';
    } else if (rank === 3) {
      rankBadgeStyle = 'border-amber-700 bg-amber-800/25 text-amber-500 shadow-sm';
      rowBorder = 'border-amber-700/30';
      rowBg = 'bg-amber-950/10';
    } else if (rank >= standings.length - 1) {
      // Last 2 spots (Cucchiaio zone)
      rankBadgeStyle = 'border-rose-700 bg-rose-900/30 text-rose-300';
    } else if (rank >= standings.length - 3) {
      // Playout zone
      rankBadgeStyle = 'border-amber-800 bg-amber-950/40 text-amber-400';
    }

    const crest = t.logo || resolveTeamLogo(t.teamName);
    const pts = typeof t.points === 'number' ? t.points : (t.played ? (t.won || 0) * 3 + (t.drawn || 0) : 0);
    const played = t.played ?? 0;
    const record = `${t.won ?? 0}-${t.drawn ?? 0}-${t.lost ?? 0}`;
    const gd = (t.goalDiff ?? 0) > 0 ? `+${t.goalDiff}` : `${t.goalDiff ?? 0}`;
    const fp = typeof t.totalFantaPoints === 'number' ? t.totalFantaPoints.toFixed(1) : '-';
    const trend = t.statusBadge || '⚖️';

    return `
      <div class="flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${rowBorder} ${rowBg} text-xs">
        <!-- Rank & Team -->
        <div class="flex items-center gap-2.5 w-[46%] min-w-0">
          <span class="w-6 h-6 rounded-lg border font-sport font-black text-xs flex items-center justify-center shrink-0 ${rankBadgeStyle}">
            ${rank}
          </span>
          <img src="${crest}" alt="${t.teamName}" class="w-7 h-7 object-contain shrink-0" onerror="this.onerror=null; this.src='favicon-64x64.png'">
          <div class="min-w-0 flex-1">
            <div class="font-bold text-white text-sm truncate leading-tight">${t.teamName}</div>
            <div class="text-[10px] text-slate-400 truncate">${t.coach || ''}</div>
          </div>
        </div>

        <!-- Points -->
        <div class="w-[14%] text-center">
          <span class="font-sport font-black text-xl ${rank === 1 ? 'text-amber-400' : 'text-white'} leading-none">
            ${pts}
          </span>
          <span class="text-[9px] uppercase font-bold text-slate-400 block -mt-0.5">PT</span>
        </div>

        <!-- Record & Stats -->
        <div class="w-[28%] text-right font-mono text-[11px] text-slate-300">
          <div><strong class="text-white">${played}</strong> <span class="text-slate-400">g.</span> (${record})</div>
          <div class="text-[10px] text-slate-400">${fp} FP · diff ${gd}</div>
        </div>

        <!-- Trend Status -->
        <div class="w-[8%] text-right text-base shrink-0">
          <span title="${t.statusLabel || ''}">${trend}</span>
        </div>
      </div>
    `;
  }).join('');

  contentBox.innerHTML = `
    <!-- Top Hero -->
    <div class="w-full flex flex-col items-center text-center">
      <div class="flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
        <span>📊 CLASSIFICA UFFICIALE</span>
      </div>
      <h1 class="font-sport font-black text-4xl uppercase tracking-wider text-white">
        Classifica Generale
      </h1>
      <p class="text-sm text-slate-400 font-bold mt-1">
        ${LEAGUE.brand.championshipLabel || 'Serie Atlas'} • Dopo la ${lastRound}ª Giornata
      </p>
    </div>

    <!-- Standings Table Container -->
    <div class="w-full space-y-1.5 my-2">
      ${rowsHTML}
    </div>

    <!-- Bottom Highlights Strip -->
    <div class="grid grid-cols-2 gap-3 w-full">
      <!-- Leader -->
      <div class="p-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex items-center gap-3">
        <span class="text-2xl">👑</span>
        <div class="min-w-0">
          <div class="text-[10px] uppercase font-black text-amber-400 tracking-wider">CAPOLISTA</div>
          <div class="font-bold text-sm text-white truncate">${leader?.teamName || '-'}</div>
          <div class="text-xs text-amber-300 font-sport font-black">${leader?.points ?? 0} Punti</div>
        </div>
      </div>

      <!-- Top Offense -->
      <div class="p-3 rounded-2xl border border-sky-500/40 bg-sky-500/10 flex items-center gap-3">
        <span class="text-2xl">⚡</span>
        <div class="min-w-0">
          <div class="text-[10px] uppercase font-black text-sky-400 tracking-wider">MIGLIOR ATTACCO</div>
          <div class="font-bold text-sm text-white truncate">${topOffense?.teamName || '-'}</div>
          <div class="text-xs text-sky-300 font-mono font-black">${topOffense?.totalFantaPoints ?? 0} Tot. FP</div>
        </div>
      </div>
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}

/**
 * 7. Renders High-Definition Vertical 9:16 Story for Matchday Recap & Results (Sky/Gazzetta Style)
 */
export async function renderMatchdayRecapStoryCanvas(
  targetRound?: number,
  customLiveData?: LiveSeasonDetails
): Promise<HTMLCanvasElement> {
  const liveData = customLiveData || getLiveSeasonDetails() || (typeof window !== 'undefined' ? (window as any).liveSeasonData : null);
  if (!liveData) {
    throw new Error('Dati di stagione live non disponibili per la generazione della story');
  }

  const seasonLabel = liveData.season || 'Live';
  const completedRounds = (liveData.rounds || []).filter((r: any) =>
    (r.matches || []).some((m: any) => m.isPlayed || m.played || (m.homeFantaPoints || 0) > 0 || (m.awayFantaPoints || 0) > 0)
  );

  const roundObj = targetRound
    ? (liveData.rounds || []).find((r: any) => r.roundNumber === targetRound)
    : (completedRounds.length > 0 ? completedRounds[completedRounds.length - 1] : liveData.rounds?.[0]);

  const rNum = roundObj?.roundNumber ?? 1;
  const matches = roundObj?.matches || [];

  const { container, contentBox } = createStoryContainer(
    `Giornata ${rNum}`,
    `Stagione ${seasonLabel}`
  );

  // 1. Compute round MVP (highest FP)
  let mvpTeam = '';
  let mvpScore = 0;
  let mvpLogo = '';
  let mvpOpponent = '';
  let mvpMatchOutcome = '';

  // 2. Track all round performances for single-round luck highlights
  interface TeamRoundPerf {
    team: string;
    logo: string;
    fp: number;
    goals: number;
    opponent: string;
    opponentGoals: number;
    opponentFp: number;
    outcome: 'W' | 'D' | 'L';
  }
  const perfs: TeamRoundPerf[] = [];

  matches.forEach((m: any) => {
    const hFp = Number(m.homeFantaPoints) || 0;
    const aFp = Number(m.awayFantaPoints) || 0;
    const hScore = typeof m.homeScore === 'number' ? m.homeScore : 0;
    const aScore = typeof m.awayScore === 'number' ? m.awayScore : 0;
    const hLogo = m.homeLogo || resolveTeamLogo(m.homeTeam);
    const aLogo = m.awayLogo || resolveTeamLogo(m.awayTeam);

    const hOutcome: 'W' | 'D' | 'L' = hScore > aScore ? 'W' : (hScore < aScore ? 'L' : 'D');
    const aOutcome: 'W' | 'D' | 'L' = aScore > hScore ? 'W' : (aScore < hScore ? 'L' : 'D');

    if (hFp > mvpScore) {
      mvpScore = hFp;
      mvpTeam = m.homeTeam;
      mvpLogo = hLogo;
      mvpOpponent = m.awayTeam;
      mvpMatchOutcome = `${hScore} - ${aScore}`;
    }
    if (aFp > mvpScore) {
      mvpScore = aFp;
      mvpTeam = m.awayTeam;
      mvpLogo = aLogo;
      mvpOpponent = m.homeTeam;
      mvpMatchOutcome = `${aScore} - ${hScore}`;
    }

    perfs.push({ team: m.homeTeam, logo: hLogo, fp: hFp, goals: hScore, opponent: m.awayTeam, opponentGoals: aScore, opponentFp: aFp, outcome: hOutcome });
    perfs.push({ team: m.awayTeam, logo: aLogo, fp: aFp, goals: aScore, opponent: m.homeTeam, opponentGoals: hScore, opponentFp: hFp, outcome: aOutcome });
  });

  // 3. Compute overall round stats for the 8th slot card
  let totalGoals = 0;
  let totalFP = 0;
  let maxGoalsMatch: any = null;
  let maxGoals = -1;

  matches.forEach((m: any) => {
    const g = (typeof m.homeScore === 'number' ? m.homeScore : 0) + (typeof m.awayScore === 'number' ? m.awayScore : 0);
    totalGoals += g;
    totalFP += (Number(m.homeFantaPoints) || 0) + (Number(m.awayFantaPoints) || 0);
    if (g > maxGoals) {
      maxGoals = g;
      maxGoalsMatch = m;
    }
  });
  const avgFP = matches.length > 0 ? (totalFP / (matches.length * 2)).toFixed(1) : '0.0';

  // Calculate single-round luck:
  // - Cynical winner: a winner who won with fewer FP than an unlucky non-winner (stolen win),
  //   OR won with low FP (< avgFP of the round and <= 1 goal).
  //   If all winners legitimately outscored all non-winners, there is NO cynical winner (Turno Regolare).
  const winners = perfs.filter(p => p.outcome === 'W').sort((a, b) => a.fp - b.fp);
  const nonWinners = perfs.filter(p => p.outcome !== 'W').sort((a, b) => b.fp - a.fp);
  const unluckyNonWinner = nonWinners.length > 0 ? nonWinners[0] : null;

  const lowestWinner = winners.length > 0 ? winners[0] : null;
  const avgFPNum = Number(avgFP) || 72.0;

  const isCynical = lowestWinner && (
    (unluckyNonWinner && lowestWinner.fp < unluckyNonWinner.fp) ||
    (lowestWinner.fp < avgFPNum && lowestWinner.goals <= 1)
  );
  const cynicalWinner = isCynical ? lowestWinner : null;

  // Build 2-column Duel Cards (No Name Truncation)
  const cardsHTML = matches.map((m: any, idx: number) => {
    const hScore = m.homeScore ?? '-';
    const aScore = m.awayScore ?? '-';
    const hFp = typeof m.homeFantaPoints === 'number' ? m.homeFantaPoints.toFixed(1) : '-';
    const aFp = typeof m.awayFantaPoints === 'number' ? m.awayFantaPoints.toFixed(1) : '-';
    const hLogo = m.homeLogo || resolveTeamLogo(m.homeTeam);
    const aLogo = m.awayLogo || resolveTeamLogo(m.awayTeam);

    const isHomeWinner = typeof m.homeScore === 'number' && typeof m.awayScore === 'number' && m.homeScore > m.awayScore;
    const isAwayWinner = typeof m.homeScore === 'number' && typeof m.awayScore === 'number' && m.awayScore > m.homeScore;

    return `
      <div class="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-3.5 flex flex-col justify-between shadow-lg">
        <!-- Card Top Bar: Duel Number & Status -->
        <div class="flex items-center justify-between text-[11px] font-mono pb-1.5 mb-1 border-b border-slate-800/80">
          <span class="text-[10px] uppercase font-extrabold tracking-wider text-amber-400/90">DUELLO #${idx + 1}</span>
          <span class="text-[9px] uppercase font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">FINALE</span>
        </div>

        <!-- Team A Row (Full Name, No Truncation) -->
        <div class="flex items-center justify-between gap-2 py-1">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <img src="${hLogo}" alt="${m.homeTeam}" class="w-7 h-7 object-contain rounded-full bg-white/10 shrink-0 drop-shadow" onerror="this.onerror=null; this.src='favicon-64x64.png'">
            <span class="font-bold text-sm leading-tight text-white ${isHomeWinner ? 'text-amber-400 font-black' : ''}">
              ${m.homeTeam}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0 pl-1.5">
            <span class="font-sport font-black text-xl leading-none ${isHomeWinner ? 'text-amber-400' : 'text-slate-200'}">
              ${hScore}
            </span>
            <span class="text-xs font-mono font-bold text-slate-400">
              (${hFp} FP)
            </span>
          </div>
        </div>

        <!-- Divider -->
        <div class="h-px bg-slate-800/80 my-1"></div>

        <!-- Team B Row (Full Name, No Truncation) -->
        <div class="flex items-center justify-between gap-2 py-1">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <img src="${aLogo}" alt="${m.awayTeam}" class="w-7 h-7 object-contain rounded-full bg-white/10 shrink-0 drop-shadow" onerror="this.onerror=null; this.src='favicon-64x64.png'">
            <span class="font-bold text-sm leading-tight text-white ${isAwayWinner ? 'text-amber-400 font-black' : ''}">
              ${m.awayTeam}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0 pl-1.5">
            <span class="font-sport font-black text-xl leading-none ${isAwayWinner ? 'text-amber-400' : 'text-slate-200'}">
              ${aScore}
            </span>
            <span class="text-xs font-mono font-bold text-slate-400">
              (${aFp} FP)
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 8th Slot: Round Stats Tile
  const roundStatsHTML = `
    <div class="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-transparent p-3.5 flex flex-col justify-between shadow-lg">
      <div class="flex items-center justify-between text-[11px] font-mono pb-1.5 mb-1 border-b border-amber-500/20">
        <span class="text-[10px] uppercase font-extrabold tracking-wider text-amber-400">📊 STATS GIORNATA</span>
        <span class="text-[9px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md">TURNO ${rNum}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-center py-1 flex-1 items-center">
        <div class="p-2 rounded-xl bg-slate-950/40 border border-slate-800">
          <div class="text-[10px] uppercase font-bold text-slate-400">Gol Totali</div>
          <div class="text-xl font-sport font-black text-amber-400">${totalGoals} Reti</div>
        </div>
        <div class="p-2 rounded-xl bg-slate-950/40 border border-slate-800">
          <div class="text-[10px] uppercase font-bold text-slate-400">Media FP</div>
          <div class="text-xl font-mono font-black text-sky-400">${avgFP} FP</div>
        </div>
      </div>
      ${maxGoalsMatch ? `
        <div class="text-[11px] text-center text-slate-300 border-t border-slate-800/60 pt-1.5 truncate">
          🔥 Spettacolo: <strong class="text-white">${maxGoalsMatch.homeTeam} ${maxGoalsMatch.homeScore}-${maxGoalsMatch.awayScore} ${maxGoalsMatch.awayTeam}</strong> (${maxGoals} gol)
        </div>
      ` : ''}
    </div>
  `;

  contentBox.innerHTML = `
    <!-- Top Hero -->
    <div class="w-full flex flex-col items-center text-center">
      <div class="flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
        <span>⚽ TABELLINO &amp; RISULTATI</span>
      </div>
      <h1 class="font-sport font-black text-5xl uppercase tracking-wider text-white">
        Giornata ${rNum}
      </h1>
      <p class="text-sm text-slate-400 font-bold mt-1">
        ${LEAGUE.brand.championshipLabel || 'Serie Atlas'} • Risultati Ufficiali del Turno
      </p>
    </div>

    <!-- 2-Column Duel Cards Grid (4x2 Balanced Layout) -->
    <div class="grid grid-cols-2 gap-3.5 w-full my-2">
      ${cardsHTML}
      ${roundStatsHTML}
    </div>

    <!-- Highlights Row: 2 Rich Structured Cards -->
    <div class="grid grid-cols-2 gap-3.5 w-full">
      <!-- MVP Card -->
      <div class="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-slate-900/60 to-transparent flex items-center gap-3.5 shadow-lg">
        <img src="${mvpLogo}" alt="${mvpTeam}" class="w-14 h-14 object-contain shrink-0 drop-shadow-md" onerror="this.onerror=null; this.src='favicon-64x64.png'">
        <div class="min-w-0 flex-1">
          <div class="text-[10px] uppercase font-black text-amber-400 tracking-wider">🌟 MVP DI GIORNATA</div>
          <div class="font-bold text-base text-white truncate">${mvpTeam}</div>
          <div class="text-sm font-mono font-black text-amber-300 mt-0.5">${mvpScore.toFixed(1)} FantaPunti</div>
          <div class="text-[10px] text-slate-400 truncate mt-0.5">${mvpMatchOutcome} vs ${mvpOpponent}</div>
        </div>
      </div>

      <!-- Dea Bendata & Sfiga Card (Single Round Calculated) -->
      <div class="p-4 rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-500/15 via-slate-900/60 to-transparent flex flex-col justify-between shadow-lg">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-base">🎲</span>
          <span class="text-[10px] uppercase font-black text-indigo-300 tracking-wider">DEA BENDATA &amp; SFIGA</span>
        </div>
        <div class="space-y-1.5">
          <div class="text-xs text-slate-300 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="shrink-0">🍀</span>
              <strong class="text-white leading-tight break-words">${cynicalWinner ? cynicalWinner.team : 'Nessun regalo'}</strong>
            </div>
            <span class="text-[11px] font-mono text-emerald-400 font-bold shrink-0">${cynicalWinner ? `${cynicalWinner.fp.toFixed(1)} FP (W)` : 'Vittorie meritate'}</span>
          </div>
          <div class="text-xs text-slate-400 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="shrink-0">⚡</span>
              <strong class="text-slate-200 leading-tight break-words">${unluckyNonWinner ? unluckyNonWinner.team : '-'}</strong>
            </div>
            <span class="text-[11px] font-mono text-rose-400 font-bold shrink-0">${unluckyNonWinner ? `${unluckyNonWinner.fp.toFixed(1)} FP (${unluckyNonWinner.outcome})` : ''}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}

/**
 * 7. Renders High-Definition Vertical 9:16 Story for Monte Carlo Odds & Projections
 */
export async function renderMonteCarloStoryCanvas(
  teamMetric: LiveTeamMetrics,
  customLiveData?: LiveSeasonDetails
): Promise<HTMLCanvasElement> {
  const liveData = customLiveData || getLiveSeasonDetails() || (typeof window !== 'undefined' ? (window as any).liveSeasonData : null);
  const seasonLabel = liveData?.season || 'Live';
  const { container, contentBox } = createStoryContainer(
    'Quote Scudetto',
    `Stagione ${seasonLabel}`
  );

  const logoUrl = teamMetric.logo || resolveTeamLogo(teamMetric.teamName);
  const mc = (teamMetric as any).monteCarlo || teamMetric.scheduleLuck?.monteCarlo;

  // Title Gating: Unlocked only after half the tournament (giro di boa)
  const totalRounds = liveData?.totalRounds || liveData?.rounds?.length || 26;
  const lastCompletedRound = liveData?.lastCompletedRound || 0;
  const midpointRound = Math.ceil(totalRounds / 2);
  const isTitleGated = lastCompletedRound >= midpointRound;

  // MC Projection Gating: Full season projections activate when lastCompletedRound >= mcMinRounds
  const mcMinRounds = liveData?.mcMinRounds ?? 5;
  const isMcUnlocked = mc?.pPodiumPct != null || typeof mc?.pMidPct === 'number';

  const titlePctVal = (isTitleGated && isMcUnlocked && typeof mc?.pTitlePct === 'number') ? mc.pTitlePct : null;
  const pTitle = titlePctVal !== null ? `${titlePctVal.toFixed(1)}%` : `G${midpointRound}+`;
  const titleSublabel = titlePctVal !== null ? 'Vittoria Scudetto' : `Sblocco da G${midpointRound}`;
  const titleIcon = titlePctVal !== null ? '🏆' : '🔒';

  const pPodium = (isMcUnlocked && mc?.pPodiumPct != null) ? `${mc.pPodiumPct.toFixed(1)}%` : '--';
  const pMid = (isMcUnlocked && mc?.pMidPct != null) ? `${mc.pMidPct.toFixed(1)}%` : '--';
  const pFlop = (isMcUnlocked && mc?.pFlopPct != null) ? `${mc.pFlopPct.toFixed(1)}%` : '--';

  const pointsStr = typeof teamMetric.points === 'number' ? ` (${teamMetric.points} pt)` : ' (- pt)';
  const medianPts = (isMcUnlocked && mc?.medianPoints != null)
    ? `${mc.medianPoints.toFixed(1)} pt`
    : `In calibrazione (da G${mcMinRounds})`;
  const p10 = (isMcUnlocked && mc?.p10 != null) ? mc.p10.toFixed(1) : '-';
  const p90 = (isMcUnlocked && mc?.p90 != null) ? mc.p90.toFixed(1) : '-';
  const p25 = (isMcUnlocked && mc?.p25 != null) ? mc.p25.toFixed(1) : '-';
  const p75 = (isMcUnlocked && mc?.p75 != null) ? mc.p75.toFixed(1) : '-';

  contentBox.innerHTML = `
    <!-- Team Identity Hero -->
    <div class="flex flex-col items-center text-center">
      <div class="w-28 h-28 rounded-3xl border-2 border-amber-400/50 p-2.5 bg-slate-900/80 shadow-2xl flex items-center justify-center mb-3">
        <img src="${logoUrl}" alt="${teamMetric.teamName}" class="w-full h-full object-contain drop-shadow-xl" onerror="this.onerror=null; this.src='favicon-64x64.png'">
      </div>

      <h1 class="font-sport font-black text-4xl uppercase tracking-wider text-white">
        ${teamMetric.teamName}
      </h1>
      <p class="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">
        ${teamMetric.coach || 'Allenatore'} • Attuale #${teamMetric.rank}${pointsStr}
      </p>
    </div>

    <!-- Probability Matrix -->
    <div class="w-full space-y-3 my-auto">
      <div class="text-xs font-black uppercase tracking-wider text-slate-400 text-center mb-1">
        🎲 10.000 Simulazioni Monte Carlo
      </div>

      <div class="grid grid-cols-2 gap-3">
        <!-- Scudetto (Gated until midpoint round) -->
        <div class="p-4 rounded-2xl border ${isTitleGated ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/20' : 'border-amber-500/30 bg-slate-900/60'} to-transparent flex flex-col items-center text-center">
          <span class="text-3xl mb-1">${titleIcon}</span>
          <span class="font-sport font-black text-3xl ${isTitleGated ? 'text-amber-400' : 'text-amber-400/80'} font-mono">${pTitle}</span>
          <span class="text-xs uppercase font-extrabold ${isTitleGated ? 'text-amber-200' : 'text-amber-300/70'} mt-1">${titleSublabel}</span>
        </div>

        <!-- Podio -->
        <div class="p-4 rounded-2xl border border-cyan-500/50 bg-gradient-to-br from-cyan-500/20 to-transparent flex flex-col items-center text-center">
          <span class="text-3xl mb-1">🥉</span>
          <span class="font-sport font-black text-3xl text-cyan-300 font-mono">${pPodium}</span>
          <span class="text-xs uppercase font-extrabold text-cyan-200 mt-1">Piazzamento Podio</span>
        </div>

        <!-- Metà Classifica -->
        <div class="p-4 rounded-2xl border border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 to-transparent flex flex-col items-center text-center">
          <span class="text-3xl mb-1">⚖️</span>
          <span class="font-sport font-black text-3xl text-emerald-400 font-mono">${pMid}</span>
          <span class="text-xs uppercase font-extrabold text-emerald-200 mt-1">Metà Classifica</span>
        </div>

        <!-- Cucchiaio -->
        <div class="p-4 rounded-2xl border border-rose-500/50 bg-gradient-to-br from-rose-500/20 to-transparent flex flex-col items-center text-center">
          <span class="text-3xl mb-1">🥄</span>
          <span class="font-sport font-black text-3xl text-rose-400 font-mono">${pFlop}</span>
          <span class="text-xs uppercase font-extrabold text-rose-200 mt-1">Cucchiaio di Legno</span>
        </div>
      </div>

      <!-- Projected Finish Box (Displays projected score when MC is active) -->
      <div class="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 mt-2">
        <div class="flex items-center justify-between text-xs text-slate-400 mb-2 font-bold">
          <span>Punteggio Finale Previsto:</span>
          <span class="text-amber-400 font-black font-mono text-sm">${isMcUnlocked ? `${medianPts} (Mediana)` : medianPts}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono pt-2 border-t border-slate-800">
          <div>Intervallo 50% (IQR): <strong>${isMcUnlocked ? `${p25} &ndash; ${p75} pt` : '--'}</strong></div>
          <div class="text-right">Intervallo 80%: <strong>${isMcUnlocked ? `${p10} &ndash; ${p90} pt` : '--'}</strong></div>
        </div>
      </div>
    </div>

    <!-- Footer Advice -->
    <div class="w-full p-3 rounded-2xl border border-slate-800 bg-slate-900/60 text-center text-xs text-slate-400">
      Simulazione Davidson 1X2 ponderata su Elo &amp; Potenza Offensiva con decay asta.
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}

/**
 * 8. Renders High-Definition Vertical 9:16 Story for Team Power & 3-Track Elo Radar
 */
export async function renderTeamPowerRadarStoryCanvas(
  teamMetric: LiveTeamMetrics,
  customLiveData?: LiveSeasonDetails
): Promise<HTMLCanvasElement> {
  const liveData = customLiveData || getLiveSeasonDetails() || (typeof window !== 'undefined' ? (window as any).liveSeasonData : null);
  const seasonLabel = liveData?.season || 'Live';
  const { container, contentBox } = createStoryContainer(
    'Potenza & Elo',
    `Stagione ${seasonLabel}`
  );

  const logoUrl = teamMetric.logo || resolveTeamLogo(teamMetric.teamName);

  const flatElo = Math.round(teamMetric.elo?.flat?.current ?? 1500);
  const histElo = Math.round(teamMetric.elo?.historical?.current ?? 1500);
  const atlasElo = Math.round(teamMetric.elo?.atlas?.current ?? 1500);

  // 5 Tactical Radar Axes: Attacco, Difesa, Continuità, Golo/Freddezza, Elo Power
  const avgFP = teamMetric.avgFantaPoints || 70.0;
  const attScore = Math.max(10, Math.min(100, Math.round(((avgFP - 60) / 24) * 100)));

  const ga = teamMetric.goalsAgainst || 0;
  const played = teamMetric.played || 1;
  const gaPerMatch = ga / played;
  const defScore = Math.max(10, Math.min(100, Math.round(((2.5 - gaPerMatch) / 2.0) * 100)));

  const won = teamMetric.won || 0;
  const formScore = Math.max(10, Math.min(100, Math.round((won / played) * 100)));

  const goloVal = (teamMetric.elo?.seasonStats?.[seasonLabel]?.golo ?? 1.0);
  const goloScore = Math.max(10, Math.min(100, Math.round(goloVal * 50)));

  const eloPowerScore = Math.max(10, Math.min(100, Math.round(((atlasElo - 1400) / 200) * 100)));

  const radarAxes: H2HAxisData[] = [
    { key: 'att', label: 'Attacco (FP)', shortTitle: 'Attacco', acronym: 'ATT', valA: attScore, valB: 0, rawA: `${avgFP.toFixed(1)} FP`, rawB: '' },
    { key: 'def', label: 'Difesa (Solidità)', shortTitle: 'Difesa', acronym: 'DIF', valA: defScore, valB: 0, rawA: `${gaPerMatch.toFixed(2)} GA`, rawB: '' },
    { key: 'con', label: 'Continuità', shortTitle: 'Vittorie', acronym: 'CON', valA: formScore, valB: 0, rawA: `${won}/${played} W`, rawB: '' },
    { key: 'gol', label: 'Freddezza (Golo)', shortTitle: 'Golo', acronym: 'GOL', valA: goloScore, valB: 0, rawA: `${goloVal.toFixed(2)}x`, rawB: '' },
    { key: 'elo', label: 'Atlas Power', shortTitle: 'Power', acronym: 'ELO', valA: eloPowerScore, valB: 0, rawA: `${atlasElo} pt`, rawB: '' }
  ];

  const radarSvg = renderH2HRadarSVG(radarAxes, teamMetric.teamName, '', 860, 680);

  contentBox.innerHTML = `
    <!-- Team Identity Header -->
    <div class="flex flex-col items-center text-center">
      <div class="w-24 h-24 rounded-3xl border-2 border-amber-400/50 p-2 bg-slate-900/80 shadow-2xl flex items-center justify-center mb-2">
        <img src="${logoUrl}" alt="${teamMetric.teamName}" class="w-full h-full object-contain drop-shadow-xl" onerror="this.onerror=null; this.src='favicon-64x64.png'">
      </div>

      <h1 class="font-sport font-black text-3xl uppercase tracking-wider text-white">
        ${teamMetric.teamName}
      </h1>
      <p class="text-xs uppercase tracking-widest text-slate-400 font-bold mt-0.5">
        ${teamMetric.coach || 'Allenatore'}
      </p>
    </div>

    <!-- 3-Track Elo Metrics Row -->
    <div class="grid grid-cols-3 gap-2.5 w-full my-2">
      <div class="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-center">
        <div class="text-[10px] uppercase font-bold text-amber-400">⚡ Elo Puro</div>
        <div class="font-sport font-black text-2xl text-white font-mono mt-0.5">${flatElo}</div>
        <div class="text-[9px] text-slate-400 mt-0.5">Stagionale</div>
      </div>

      <div class="p-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-center">
        <div class="text-[10px] uppercase font-bold text-indigo-400">🏛️ Storico</div>
        <div class="font-sport font-black text-2xl text-white font-mono mt-0.5">${histElo}</div>
        <div class="text-[9px] text-slate-400 mt-0.5">Con Palmarès</div>
      </div>

      <div class="p-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 text-center">
        <div class="text-[10px] uppercase font-bold text-purple-400">🔮 Atlas Power</div>
        <div class="font-sport font-black text-2xl text-white font-mono mt-0.5">${atlasElo}</div>
        <div class="text-[9px] text-slate-400 mt-0.5">All-Play</div>
      </div>
    </div>

    <!-- 5-Axis Tactical Radar Showcase -->
    <div class="w-full flex justify-center my-auto">
      ${radarSvg}
    </div>

    <!-- Bottom Tactical Callout -->
    <div class="w-full p-3 rounded-2xl border border-slate-800 bg-slate-900/60 text-center text-xs text-slate-400">
      Radar tattico normalizzato su 5 dimensioni chiave di rendimento atletico e strategico.
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}


