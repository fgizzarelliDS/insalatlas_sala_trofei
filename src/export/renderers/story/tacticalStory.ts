/**
 * src/export/renderers/story/tacticalStory.ts
 * High-Definition (1080x1920) 9:16 Social Story Renderer for Manager Tactical Identikit 
 */

import type { Manager } from '@/types';
import { state, getLiveSeasonDetails } from '@/state';
import { computeManagerTacticalProfile, calculateRadarSvgPoints } from '@/analytics/tacticalProfiler';
import { resolveTeamLogo } from '@/crests';
import { escapeHtml } from '@/utils/dom';
import { renderNodeToCanvas } from '../core';
import { createStoryContainer, STORY_WIDTH, STORY_HEIGHT } from './base';

/**
 * Renders High-Definition Vertical 9:16 Story for a Manager's Tactical Identikit
 */
export async function renderTacticalStoryCanvas(manager: Manager): Promise<HTMLCanvasElement> {
  const { container, contentBox } = createStoryContainer('Identikit Tattico', 'DNA & Profiler Psicologico');

  const liveData = getLiveSeasonDetails();
  const liveSeasonLabel = liveData?.season || '2026/27';
  const shortSeasonLabel = liveSeasonLabel.replace(/^20/, '');
  const allManagers = state.managers && state.managers.length > 0 ? state.managers : [manager];
  const profile = computeManagerTacticalProfile(manager, allManagers, liveData);

  // 1. Resolve authentic current team name and custom logo
  const standing = liveData?.standings?.find(
    s => s.managerId === manager.id || s.coach?.toLowerCase() === manager.name?.toLowerCase()
  );

  const latestTeam = profile.teamName;

  let customLogo = standing?.logo;
  if (!customLogo && state.competitions) {
    for (const comp of state.competitions) {
      const found = comp.ranking?.find(r => r.managerId === manager.id && r.logo);
      if (found?.logo) {
        customLogo = found.logo;
        break;
      }
    }
  }
  const logoUrl = resolveTeamLogo(latestTeam, customLogo);

  const arch = profile.archetype;
  const mindset = profile.mindset;
  const axes = profile.axes;

  // 2. High-Resolution 5-Axis Radar Geometry (680x460 viewBox, cx=340, cy=230, r=160)
  const normalizedScores = {
    pot: axes.pot.score,
    cin: axes.cin.score,
    luk: axes.luk.score,
    reg: axes.reg.score,
    koc: axes.koc.score
  };
  const managerRadarPoints = calculateRadarSvgPoints(normalizedScores, 340, 230, 160);
  const avgPolygonPoints = '340,150 416,205 387,295 293,295 264,205';

  // Make contentBox vertically balanced and well-spaced
  contentBox.className = 'flex-1 flex flex-col justify-between py-2 w-full max-w-[960px] mx-auto';

  contentBox.innerHTML = `
    <!-- 1. MANAGER IDENTITY & ARCHETYPE HERO -->
    <div class="flex flex-col items-center text-center">
      <!-- Crest with Halo and Years Badge -->
      <div class="relative mb-3">
        <div class="w-32 h-32 rounded-3xl border-2 p-2 shadow-2xl flex items-center justify-center relative overflow-hidden"
             style="background: radial-gradient(circle, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 0.95) 100%); border-color: ${arch.color}80; box-shadow: 0 0 40px ${arch.color}30;">
          <img src="${logoUrl}" alt="${escapeHtml(manager.name)}" class="w-full h-full object-contain drop-shadow-2xl" onerror="this.onerror=null; this.src='favicon-64x64.png'">
        </div>
        <span class="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-xl border border-amber-300">
          ${manager.years} ${manager.years === 1 ? 'Anno' : 'Anni'}
        </span>
      </div>

      <h2 class="font-sport font-black text-4xl uppercase tracking-wider text-white mt-0.5">
        ${escapeHtml(manager.name)}
      </h2>
      <span class="text-base font-bold text-slate-300 mt-0.5">
        ${escapeHtml(latestTeam)}
      </span>

      <!-- Prominent Archetype Badge Banner -->
      <div class="mt-3.5 px-8 py-3 rounded-2xl border shadow-2xl flex flex-col items-center w-full max-w-lg"
        style="background: linear-gradient(135deg, ${arch.color}25 0%, rgba(15, 23, 42, 0.95) 50%, ${arch.color}25 100%); border-color: ${arch.color}80; box-shadow: 0 0 25px ${arch.color}25;">
        <span class="text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" style="color: ${arch.color}">
          <i class="fa-solid ${arch.icon}"></i> ARCHETIPO TATTICO DI CARRIERA
        </span>
        <h3 class="font-sport font-black text-2xl tracking-tight text-white uppercase mt-0.5">
          ${escapeHtml(arch.title)}
        </h3>
        <span class="text-xs font-bold text-slate-200 mt-1">
          ${escapeHtml(arch.trait)}
        </span>
      </div>

      <!-- Golden Philosophical Quote Banner -->
      <div class="mt-3 px-6 py-3 rounded-2xl border border-amber-500/35 bg-slate-900/90 w-full max-w-xl shadow-xl flex items-start gap-3">
        <i class="fa-solid fa-quote-left text-amber-400 text-lg opacity-80 mt-0.5 shrink-0"></i>
        <p class="text-xs sm:text-sm font-medium italic text-amber-100/95 leading-relaxed text-left flex-1">
          ${escapeHtml(arch.motto)}
        </p>
      </div>
    </div>

    <!-- 2. 5-AXIS TACTICAL RADAR CARD (HIGH-RES + COMPARATIVE BARS STRIP) -->
    <div class="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md">
      <!-- Card Header -->
      <div class="flex items-center justify-between w-full mb-1 px-4">
        <span class="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <i class="fa-solid fa-compass"></i> Impronta Filosofica (5 Assi)
        </span>
        <div class="flex items-center gap-4 text-[11px] font-bold text-slate-400">
          <span class="flex items-center gap-1.5"><span class="w-3.5 h-1.5 bg-amber-500 rounded-sm"></span> Mister</span>
          <span class="flex items-center gap-1.5"><span class="w-3.5 h-1 border-b-2 border-dashed border-slate-400"></span> Media Lega</span>
        </div>
      </div>

      <!-- Radar SVG Container (Expanded 680x460 viewBox, Prominent r=160 Radar) -->
      <div class="w-full flex justify-center py-1">
        <svg viewBox="0 0 680 460" class="w-[740px] max-w-full h-auto">
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
          <polygon points="${avgPolygonPoints}" fill="rgba(148, 163, 184, 0.10)" stroke="#94a3b8" stroke-width="2.4" stroke-dasharray="6 4"></polygon>

          <!-- Manager Polygon (Amber Fill) -->
          <polygon points="${managerRadarPoints}" fill="rgba(245, 158, 11, 0.35)" stroke="#f59e0b" stroke-width="3.8" style="filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.65));"></polygon>

          <!-- Axis Labels & Metric Scores (Padded, Zero-Clipping, Prominent Typography) -->
          <!-- 0: POTENZA (Top) -->
          <text x="340" y="32" text-anchor="middle" fill="#cbd5e1" font-size="14" font-weight="900" letter-spacing="1">POTENZA</text>
          <text x="340" y="52" text-anchor="middle" fill="#f59e0b" font-size="13" font-weight="800">${axes.pot.raw}</text>

          <!-- 1: CINISMO (Top Right) -->
          <text x="510" y="174" text-anchor="start" fill="#cbd5e1" font-size="14" font-weight="900" letter-spacing="1">CINISMO</text>
          <text x="510" y="194" text-anchor="start" fill="#f59e0b" font-size="13" font-weight="800">${axes.cin.raw}</text>

          <!-- 2: FORTUNA (Bottom Right) -->
          <text x="434" y="396" text-anchor="middle" fill="#cbd5e1" font-size="14" font-weight="900" letter-spacing="1">FORTUNA</text>
          <text x="434" y="416" text-anchor="middle" fill="#f59e0b" font-size="13" font-weight="800">${axes.luk.raw}</text>

          <!-- 3: STABILITÀ (Bottom Left) -->
          <text x="246" y="396" text-anchor="middle" fill="#cbd5e1" font-size="14" font-weight="900" letter-spacing="1">STABILITÀ</text>
          <text x="246" y="416" text-anchor="middle" fill="#f59e0b" font-size="13" font-weight="800">${axes.reg.raw}</text>

          <!-- 4: COPPE (Top Left) -->
          <text x="170" y="174" text-anchor="end" fill="#cbd5e1" font-size="14" font-weight="900" letter-spacing="1">COPPE</text>
          <text x="170" y="194" text-anchor="end" fill="#f59e0b" font-size="13" font-weight="800">${axes.koc.raw}</text>
        </svg>
      </div>

      <!-- Integrated 5-Bar Comparative Deviation Strip (Clockwise Order: POT, CIN, LUK, REG, KOC) -->
      <div class="w-full mt-1 pt-3 border-t border-slate-800/80 grid grid-cols-5 gap-2 px-2">
        ${[axes.pot, axes.cin, axes.luk, axes.reg, axes.koc].map(ax => `
          <div class="flex flex-col items-center text-center">
            <span class="text-[9px] font-black uppercase tracking-wider text-slate-400">${ax.shortTitle}</span>
            <span class="text-xs font-bold text-white mt-0.5">${ax.raw}</span>
            <span class="text-[10px] font-mono font-bold ${ax.deltaNumeric >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${ax.deltaPct}</span>
            <div class="w-full h-1.5 rounded-full overflow-hidden relative bg-slate-800 mt-1 border border-slate-700/60">
              <div class="h-full ${ax.barColor} rounded-full" style="width: ${ax.score}%;"></div>
              <div class="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-500"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 3. I NUMERI DELLA FILOSOFIA (3 KEY METRICS CARDS) -->
    <div class="w-full grid grid-cols-3 gap-3">
      ${profile.stats.map(s => `
        <div class="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/85 text-center shadow-lg flex flex-col justify-between">
          <span class="text-[9px] uppercase font-black tracking-wider text-slate-400 block">${s.title}</span>
          <span class="font-sport font-black text-2xl text-amber-400 mt-1 block">${s.val}</span>
          <span class="text-[10px] text-slate-400 block mt-0.5 leading-tight">${s.lbl}</span>
        </div>
      `).join('')}
    </div>

    <!-- 4. SEASONAL MINDSET FOOTER TILE (ROBUST NON-OVERLAPPING LAYOUT) -->
    <div class="w-full p-4 rounded-2xl border border-slate-800 bg-slate-900/95 flex items-center justify-between gap-4 shadow-2xl">
      <div class="flex items-center gap-3.5 min-w-0 flex-1">
        <div class="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg shrink-0 shadow-inner">
          <i class="fa-solid ${mindset.icon}"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[10px] uppercase font-black tracking-widest text-slate-400">
              ${mindset.isActive ? `MINDSET LIVE ${escapeHtml(liveSeasonLabel)}` : 'STATO DI CARRIERA'}
            </span>
            <span class="whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-black border ${mindset.isActive
      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
      : 'bg-slate-800 border-slate-700 text-slate-400'
    }">
              ${escapeHtml(mindset.pill)}
            </span>
          </div>
          <p class="text-xs text-slate-300 mt-1 leading-relaxed">
            ${escapeHtml(mindset.desc)}
          </p>
        </div>
      </div>
      ${mindset.isActive ? `
      <div class="flex items-center gap-3 shrink-0 pl-3 border-l border-slate-800">
        <div class="text-right">
          <span class="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">MOMENTUM L5</span>
          <span class="text-sm font-mono font-bold text-emerald-400">${escapeHtml(mindset.momentum)}</span>
        </div>
        <div class="text-right">
          <span class="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">ΔLUCK ${escapeHtml(shortSeasonLabel)}</span>
          <span class="text-sm font-mono font-bold text-amber-400">${escapeHtml(mindset.luckDelta)}</span>
        </div>
      </div>
      ` : ''}
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}
