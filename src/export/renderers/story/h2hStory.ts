import type { Manager } from '@/types';
import { formatScore } from '@/score';
import { computeHeadToHead } from '@/analytics';
import {
  computeMultiManagerAnalysis,
  type MultiManagerAnalysis
} from '@/analytics/multiManager';
import { renderMultiManagerRadarSVG } from '@/components/modals/h2h/MultiManagerRadar';
import { computeH2HAxes, renderH2HRadarSVG } from '@/components/modals/h2h/HeadToHeadRadar';
import { resolveTeamLogo } from '@/crests';
import { renderNodeToCanvas } from '../core';
import { createStoryContainer, STORY_WIDTH, STORY_HEIGHT } from './base';

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
