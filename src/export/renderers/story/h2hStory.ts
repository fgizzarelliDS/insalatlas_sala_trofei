import type { Manager } from '@/types';
import {
  computeMultiManagerAnalysis,
  type MultiManagerAnalysis
} from '@/analytics/multiManager';
import { renderMultiManagerRadarSVG } from '@/components/modals/h2h/MultiManagerRadar';
import { resolveTeamLogo } from '@/crests';
import { renderNodeToCanvas } from '../core';
import { createStoryContainer, STORY_WIDTH, STORY_HEIGHT } from './base';
import { computeTacticalMatchup } from '@/analytics/tacticalMatchup';
import { calculateRadarSvgPoints } from '@/analytics/tacticalProfiler';
import { state } from '@/state';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { collectDirectRoundMatches } from '@/components/modals/matchup/MatchupTemplate';
import { escapeHtml } from '@/utils/dom';

/**
 * 2. Renders High-Definition Vertical 9:16 Story for a 1vs1 Tactical Matchup & Pre-Match Duel
 */
export async function renderH2HDuelStoryCanvas(
  managerA: Manager,
  managerB: Manager,
  scope: 'career' | 'season' = 'career'
): Promise<HTMLCanvasElement> {
  const { container, contentBox } = createStoryContainer('Matchup Tattico', 'Pre-Partita & Scontri Diretti');
  contentBox.className = 'flex-1 flex flex-col justify-between py-2 w-full max-w-[960px] mx-auto';

  const liveData = getLiveSeasonDetails();
  const allManagers = state.managers && state.managers.length > 0 ? state.managers : [managerA, managerB];
  const matchup = computeTacticalMatchup(managerA, managerB, allManagers, liveData, scope);
  const { profileA, profileB, h2hStats, axesList, tacticalKey } = matchup;

  const directSummary = collectDirectRoundMatches(
    managerA.id,
    managerB.id,
    managerA.name,
    managerB.name,
    liveData
  );

  const seasonsBadgeText = directSummary.seasonsList.length > 0
    ? directSummary.seasonsList.join(' • ')
    : (liveData?.season || 'Campionato');

  const matchesToRender = directSummary.matches.length > 5
    ? directSummary.matches.slice(directSummary.matches.length - 5)
    : directSummary.matches;

  const teamA = profileA.teamName;
  const teamB = profileB.teamName;
  const logoA = resolveTeamLogo(teamA);
  const logoB = resolveTeamLogo(teamB);

  // High-Resolution 5-Axis Dual Radar Geometry (680x460 viewBox, cx=340, cy=230, r=160)
  const ptsA = calculateRadarSvgPoints(
    {
      pot: profileA.axes.pot.score,
      cin: profileA.axes.cin.score,
      luk: profileA.axes.luk.score,
      reg: profileA.axes.reg.score,
      koc: profileA.axes.koc.score
    },
    340,
    230,
    160
  );

  const ptsB = calculateRadarSvgPoints(
    {
      pot: profileB.axes.pot.score,
      cin: profileB.axes.cin.score,
      luk: profileB.axes.luk.score,
      reg: profileB.axes.reg.score,
      koc: profileB.axes.koc.score
    },
    340,
    230,
    160
  );

  const avgPolygonPoints = '340,150 416,205 387,295 293,295 264,205';

  contentBox.innerHTML = `
    <!-- 1. FACE-OFF CONTENDERS HERO -->
    <div class="w-full flex items-center justify-between px-3">
      <!-- Contender A (Amber) -->
      <div class="flex-1 flex flex-col items-center text-center">
        <div class="w-24 h-24 rounded-3xl border-2 p-2 bg-slate-900/90 shadow-2xl flex items-center justify-center mb-1.5"
             style="border-color: #f59e0b; box-shadow: 0 0 30px rgba(245, 158, 11, 0.25);">
          <img src="${logoA}" alt="${managerA.name}" class="w-full h-full object-contain drop-shadow-2xl" onerror="this.onerror=null; this.src='favicon-64x64.png'">
        </div>
        <h3 class="font-sport font-black text-xl uppercase tracking-wider text-amber-400">
          ${managerA.name}
        </h3>
        <span class="text-xs font-bold text-slate-300 mt-0.5">
          ${teamA}
        </span>
        <span class="mt-1 px-3 py-0.5 rounded-full text-[10px] font-black border border-amber-500/40 bg-amber-500/15 text-amber-300">
          <i class="fa-solid ${profileA.archetype.icon} mr-1"></i>${profileA.archetype.title}
        </span>
      </div>

      <!-- VS Badge -->
      <div class="flex flex-col items-center px-4">
        <div class="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-sport font-black text-lg shadow-xl">
          VS
        </div>
        <span class="text-[10px] uppercase font-bold text-slate-400 mt-1">
          ${h2hStats.sharedSeasonsCount} campionati
        </span>
      </div>

      <!-- Contender B (Cyan) -->
      <div class="flex-1 flex flex-col items-center text-center">
        <div class="w-24 h-24 rounded-3xl border-2 p-2 bg-slate-900/90 shadow-2xl flex items-center justify-center mb-1.5"
             style="border-color: #06b6d4; box-shadow: 0 0 30px rgba(6, 182, 212, 0.25);">
          <img src="${logoB}" alt="${managerB.name}" class="w-full h-full object-contain drop-shadow-2xl" onerror="this.onerror=null; this.src='favicon-64x64.png'">
        </div>
        <h3 class="font-sport font-black text-xl uppercase tracking-wider text-cyan-400">
          ${managerB.name}
        </h3>
        <span class="text-xs font-bold text-slate-300 mt-0.5">
          ${teamB}
        </span>
        <span class="mt-1 px-3 py-0.5 rounded-full text-[10px] font-black border border-cyan-500/40 bg-cyan-500/15 text-cyan-300">
          <i class="fa-solid ${profileB.archetype.icon} mr-1"></i>${profileB.archetype.title}
        </span>
      </div>
    </div>

    <!-- 2. HIGH-RES 5-AXIS DUAL RADAR CARD -->
    <div class="w-full rounded-2xl border border-slate-800 bg-slate-900/85 p-3.5 flex flex-col items-center shadow-2xl backdrop-blur-md">
      <!-- Card Legend -->
      <div class="flex items-center justify-between w-full mb-1 px-4 text-xs font-bold">
        <span class="flex items-center gap-1.5 text-amber-400">
          <span class="w-3.5 h-1.5 bg-amber-500 rounded-sm"></span> ${managerA.name}
        </span>
        <span class="text-[11px] text-slate-300 font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800">
          <span class="w-2.5 h-1 border-b-2 border-dashed border-slate-400 inline-block mr-1"></span> ${scope === 'season' ? `Assetto Live ${escapeHtml(liveData?.season || '2026/27')}` : 'DNA All-Time'}
        </span>
        <span class="flex items-center gap-1.5 text-cyan-400">
          ${managerB.name} <span class="w-3.5 h-1.5 bg-cyan-500 rounded-sm"></span>
        </span>
      </div>

      <!-- Radar SVG 680x460 -->
      <div class="w-full flex justify-center py-1">
        <svg viewBox="0 0 680 460" class="w-[620px] max-w-full h-auto">
          <!-- Concentric Pentagons -->
          <polygon points="340,70 492,181 434,360 246,360 188,181" fill="none" stroke="#334155" stroke-width="2"></polygon>
          <polygon points="340,110 454,193 411,327 269,327 226,193" fill="none" stroke="#1e293b" stroke-width="1.5"></polygon>
          <polygon points="340,190 378,218 364,262 316,262 302,218" fill="none" stroke="#1e293b" stroke-width="1.2"></polygon>

          <!-- Axes Lines from Center (340, 230) -->
          <line x1="340" y1="230" x2="340" y2="70" stroke="#334155" stroke-width="1.6"></line>
          <line x1="340" y1="230" x2="492" y2="181" stroke="#334155" stroke-width="1.6"></line>
          <line x1="340" y1="230" x2="434" y2="360" stroke="#334155" stroke-width="1.6"></line>
          <line x1="340" y1="230" x2="246" y2="360" stroke="#334155" stroke-width="1.6"></line>
          <line x1="340" y1="230" x2="188" y2="181" stroke="#334155" stroke-width="1.6"></line>

          <!-- League Average Baseline (Dashed 50%) -->
          <polygon points="${avgPolygonPoints}" fill="rgba(148, 163, 184, 0.08)" stroke="#94a3b8" stroke-width="2.4" stroke-dasharray="6 4"></polygon>

          <!-- Manager A Polygon (Amber) -->
          <polygon points="${ptsA}" fill="rgba(245, 158, 11, 0.28)" stroke="#f59e0b" stroke-width="3.5" style="filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.6));"></polygon>

          <!-- Manager B Polygon (Cyan) -->
          <polygon points="${ptsB}" fill="rgba(6, 182, 212, 0.28)" stroke="#06b6d4" stroke-width="3.5" style="filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.6));"></polygon>

          <!-- Labels with Scores -->
          <!-- POTENZA -->
          <text x="340" y="32" text-anchor="middle" fill="#cbd5e1" font-size="14" font-weight="900" letter-spacing="1">POTENZA</text>
          <text x="340" y="52" text-anchor="middle" font-size="13" font-weight="800">
            <tspan fill="#f59e0b">${profileA.axes.pot.raw}</tspan> <tspan fill="#64748b">vs</tspan> <tspan fill="#06b6d4">${profileB.axes.pot.raw}</tspan>
          </text>

          <!-- CINISMO -->
          <text x="510" y="174" text-anchor="start" fill="#cbd5e1" font-size="14" font-weight="900" letter-spacing="1">CINISMO</text>
          <text x="510" y="194" text-anchor="start" font-size="13" font-weight="800">
            <tspan fill="#f59e0b">${profileA.axes.cin.raw}</tspan> <tspan fill="#64748b">vs</tspan> <tspan fill="#06b6d4">${profileB.axes.cin.raw}</tspan>
          </text>

          <!-- FORTUNA -->
          <text x="434" y="396" text-anchor="middle" fill="#cbd5e1" font-size="14" font-weight="900" letter-spacing="1">FORTUNA</text>
          <text x="434" y="416" text-anchor="middle" font-size="13" font-weight="800">
            <tspan fill="#f59e0b">${profileA.axes.luk.raw}</tspan> <tspan fill="#64748b">vs</tspan> <tspan fill="#06b6d4">${profileB.axes.luk.raw}</tspan>
          </text>

          <!-- STABILITÀ -->
          <text x="246" y="396" text-anchor="middle" fill="#cbd5e1" font-size="14" font-weight="900" letter-spacing="1">STABILITÀ</text>
          <text x="246" y="416" text-anchor="middle" font-size="13" font-weight="800">
            <tspan fill="#f59e0b">${profileA.axes.reg.raw}</tspan> <tspan fill="#64748b">vs</tspan> <tspan fill="#06b6d4">${profileB.axes.reg.raw}</tspan>
          </text>

          <!-- COPPE / BIG MATCH -->
          <text x="170" y="174" text-anchor="end" fill="#cbd5e1" font-size="14" font-weight="900" letter-spacing="1">${profileA.axes.koc.shortTitle || 'COPPE'}</text>
          <text x="170" y="194" text-anchor="end" font-size="13" font-weight="800">
            <tspan fill="#f59e0b">${profileA.axes.koc.raw}</tspan> <tspan fill="#64748b">vs</tspan> <tspan fill="#06b6d4">${profileB.axes.koc.raw}</tspan>
          </text>
        </svg>
      </div>

      <!-- 5-Axis Tactical Advantage Badges -->
      <div class="w-full mt-1 pt-2.5 border-t border-slate-800 grid grid-cols-5 gap-2 px-2 text-center">
        ${axesList.map(ax => {
    const colorClass = ax.winner === 'A' ? 'text-amber-400' : ax.winner === 'B' ? 'text-cyan-400' : 'text-slate-400';
    const labelWinner = ax.winner === 'A' ? `${managerA.name.slice(0, 4)} ▲` : ax.winner === 'B' ? `${managerB.name.slice(0, 4)} ▲` : 'PARI =';
    return `
            <div>
              <span class="text-[9px] font-black uppercase text-slate-400 block">${ax.shortTitle}</span>
              <span class="text-xs font-mono font-black ${colorClass} mt-0.5 block">${labelWinner}</span>
            </div>
          `;
  }).join('')}
      </div>
    </div>

    <!-- 3. SCONTRI DIRETTI IN CAMPIONATO (Round-by-Round) -->
    <div class="w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 shadow-xl">
      <div class="flex items-center justify-between mb-2 px-1">
        <span class="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-slate-200">
          <i class="fa-solid fa-futbol text-indigo-400"></i>
          <span>Scontri Diretti in Campionato</span>
          <span class="text-[10px] text-slate-400 font-semibold">(Round-by-Round)</span>
        </span>
        <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 text-indigo-300">
          ${escapeHtml(seasonsBadgeText)}
        </span>
      </div>

      <!-- Consolidated Metric Bar: W A | X | W B -->
      <div class="p-2 rounded-xl border border-slate-800 bg-slate-950/70 flex items-center justify-around text-center text-xs font-bold mb-2.5">
        <div>
          <span class="text-[10px] uppercase font-extrabold text-amber-400/80 block">Vittorie ${escapeHtml(managerA.name)}</span>
          <span class="text-xl font-black font-sport text-amber-400 font-mono">${directSummary.winsA}</span>
        </div>
        <div class="h-7 w-px bg-slate-800"></div>
        <div>
          <span class="text-[10px] uppercase font-extrabold text-slate-400 block">Pareggi</span>
          <span class="text-xl font-black font-sport text-slate-200 font-mono">${directSummary.ties}</span>
        </div>
        <div class="h-7 w-px bg-slate-800"></div>
        <div>
          <span class="text-[10px] uppercase font-extrabold text-cyan-400/80 block">Vittorie ${escapeHtml(managerB.name)}</span>
          <span class="text-xl font-black font-sport text-cyan-400 font-mono">${directSummary.winsB}</span>
        </div>
      </div>

      <!-- Round-by-Round Matches List -->
      <div class="space-y-1.5">
        ${matchesToRender.length === 0 ? `
          <div class="p-3 text-center text-xs font-semibold text-slate-400">
            Nessun precedente registrato a calendario tra i due manager.
          </div>
        ` : matchesToRender.map(m => {
          const outcomeBadge = m.isPlayed
            ? (m.outcome === 'A'
              ? `<span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 flex items-center gap-1">
                   <i class="fa-solid fa-trophy text-[8px]"></i> W ${escapeHtml(managerA.name)}
                 </span>`
              : m.outcome === 'B'
                ? `<span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 flex items-center gap-1">
                     <i class="fa-solid fa-trophy text-[8px]"></i> W ${escapeHtml(managerB.name)}
                   </span>`
                : `<span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-300 flex items-center gap-1">
                     <i class="fa-solid fa-handshake text-[8px]"></i> PAREGGIO
                   </span>`)
            : `<span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-dashed border-slate-700 text-slate-400 flex items-center gap-1">
                 <i class="fa-regular fa-clock text-[8px]"></i> In programma
               </span>`;

          return `
            <div class="p-2 rounded-xl border border-slate-800/90 bg-slate-950/60 flex flex-col gap-1.5 text-xs">
              <div class="flex items-center justify-between w-full">
                <span class="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border border-slate-800 bg-slate-900 text-slate-300 flex items-center gap-1">
                  <i class="fa-solid fa-calendar-day text-[9px] text-slate-400"></i>
                  <span>${escapeHtml(m.season)} &bull; ${escapeHtml(m.roundLabel)}</span>
                </span>
                ${outcomeBadge}
              </div>

              <div class="flex items-center justify-between gap-2 w-full pt-1 border-t border-slate-800/60">
                <div class="flex items-center justify-start gap-1.5 flex-1 min-w-0">
                  <img src="${m.homeLogo}" alt="${escapeHtml(m.homeTeam)}"
                       class="w-5 h-5 rounded-full object-contain shrink-0 bg-white/10 border border-slate-700 shadow-xs"
                       onerror="this.onerror=null; this.src='favicon-64x64.png'">
                  <span class="font-bold text-[11px] truncate text-left text-slate-200">
                    ${escapeHtml(m.homeTeam)}
                  </span>
                </div>

                <div class="w-6 h-5 rounded-md flex items-center justify-center font-mono font-black text-xs shrink-0 border border-dashed border-slate-700 bg-slate-900 text-slate-400">
                  -
                </div>

                <div class="flex items-center justify-end gap-1.5 flex-1 min-w-0">
                  <span class="font-bold text-[11px] truncate text-right text-slate-200">
                    ${escapeHtml(m.awayTeam)}
                  </span>
                  <img src="${m.awayLogo}" alt="${escapeHtml(m.awayTeam)}"
                       class="w-5 h-5 rounded-full object-contain shrink-0 bg-white/10 border border-slate-700 shadow-xs"
                       onerror="this.onerror=null; this.src='favicon-64x64.png'">
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 4. CHIAVE TATTICA DEL DUELLO NARRATIVE BOX -->
    <div class="w-full p-3.5 rounded-2xl border border-indigo-500/30 bg-slate-900/95 flex items-start gap-3 shadow-2xl">
      <div class="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-base shrink-0 shadow-inner">
        <i class="fa-solid fa-lightbulb"></i>
      </div>
      <div class="min-w-0 flex-1">
        <h4 class="text-xs font-black uppercase tracking-wider text-amber-400">
          ${tacticalKey.headline}
        </h4>
        <p class="text-xs text-slate-200 mt-0.5 leading-relaxed">
          ${tacticalKey.description}
        </p>
      </div>
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
