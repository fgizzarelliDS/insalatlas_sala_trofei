import type { Manager, LeagueRecord } from '@/types';
import { state } from '@/state';
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
function createStoryContainer(title: string, subtitle: string): {
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


