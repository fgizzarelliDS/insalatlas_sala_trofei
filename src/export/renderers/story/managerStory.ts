import type { Manager } from '@/types';
import { calculateManagerScore, formatScore } from '@/score';
import {
  computeManagerClutchMetrics,
  computeSingleManagerRadarAxes,
  computeTailRiskProfile,
  computeStabilityProfile,
  getManagerArchetype
} from '@/analytics';
import { renderH2HRadarSVG, type H2HAxisData } from '@/components/modals/h2h/HeadToHeadRadar';
import { resolveTeamLogo } from '@/crests';
import { renderNodeToCanvas } from '../core';
import { LEAGUE } from '@/config';
import { createStoryContainer, STORY_WIDTH, STORY_HEIGHT } from './base';

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
