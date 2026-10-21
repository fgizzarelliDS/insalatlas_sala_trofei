import type { Manager, HeadToHeadStats } from '@/types';
import { formatScore } from '@/score';
import {
  getEloMode,
  getManagerEloTrack,
  computeEloWinProbability,
  formatElo
} from '@/analytics/analyticsCore';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';

/**
 * Extracts initials for manager avatar
 */
export function getInitials(name: string): string {
  const parts = name.split(/[ &+/,-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Renders the top manager selectors and face-off contender hero cards
 */
export function renderHeadToHeadHero(
  stats: HeadToHeadStats,
  allManagers: Manager[]
): string {
  const { managerA, managerB, metricsA, metricsB } = stats;
  const initialsA = getInitials(managerA.name);
  const initialsB = getInitials(managerB.name);

  // Extract Elo ratings and pre-match win probability
  const liveData = getLiveSeasonDetails();
  const eloA = liveData?.standings.find(s => s.managerId === managerA.id)?.elo;
  const eloB = liveData?.standings.find(s => s.managerId === managerB.id)?.elo;
  const activeMode = getEloMode();
  const trackA = getManagerEloTrack(eloA, activeMode);
  const trackB = getManagerEloTrack(eloB, activeMode);

  let winProbA = 50.0;
  let winProbB = 50.0;
  if (trackA && trackB) {
    winProbA = computeEloWinProbability(trackA.current, trackB.current);
    winProbB = Math.round((100.0 - winProbA) * 10) / 10;
  }

  // Options for dropdowns
  const optionsA = allManagers
    .map(
      m =>
        `<option value="${m.id}" ${m.id === managerA.id ? 'selected' : ''} ${m.id === managerB.id ? 'disabled' : ''}>${m.name}</option>`
    )
    .join('');

  const optionsB = allManagers
    .map(
      m =>
        `<option value="${m.id}" ${m.id === managerB.id ? 'selected' : ''} ${m.id === managerA.id ? 'disabled' : ''}>${m.name}</option>`
    )
    .join('');

  return `
    <div class="p-3 rounded-2xl border" style="background-color: var(--table-surface); border-color: var(--table-border);">
      <!-- Dropdown Selectors -->
      <div id="h2h-hero-dropdown-selectors" class="grid grid-cols-2 gap-3 items-center">
        <!-- Select A -->
        <div class="min-w-0">
          <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style="color: var(--h2h-contender-a);">
            <span class="w-2 h-2 rounded-full inline-block" style="background-color: var(--h2h-contender-a);"></span>
            Mister A
          </label>
          <select id="h2h-select-a" onchange="changeH2HManagerA(this.value)"
            class="w-full text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none cursor-pointer truncate shadow-sm transition"
            style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            ${optionsA}
          </select>
        </div>

        <!-- Select B -->
        <div class="min-w-0">
          <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-end gap-1.5" style="color: var(--h2h-contender-b);">
            Mister B
            <span class="w-2 h-2 rounded-full inline-block" style="background-color: var(--h2h-contender-b);"></span>
          </label>
          <select id="h2h-select-b" onchange="changeH2HManagerB(this.value)"
            class="w-full text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none cursor-pointer truncate text-right shadow-sm transition"
            style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            ${optionsB}
          </select>
        </div>
      </div>

      <!-- Face-off Hero Cards -->
      <div id="h2h-hero-cards-row" class="grid grid-cols-11 gap-1 items-stretch mt-3 pt-3 border-t" style="border-color: var(--table-border);">
        <!-- Contender A Card -->
        <div class="col-span-5 text-center p-3 rounded-xl border flex flex-col items-center justify-between" style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="cursor-pointer group flex flex-col items-center w-full transition"
               onclick="window.openProfileFromH2H('${managerA.id}')"
               title="Vedi scheda profilo di ${managerA.name}">
            <div class="w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black text-sm border-2 mb-1 shadow transition group-hover:scale-110"
                 style="background: radial-gradient(circle, var(--h2h-contender-a) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--h2h-contender-a); color: var(--text-main);">
              ${initialsA}
            </div>
            <h3 class="h2h-contender-name font-sport font-black text-sm uppercase px-1 my-1 leading-normal transition group-hover:underline flex items-center justify-center gap-1" style="color: var(--text-main); line-height: 1.35;">
              <span>${managerA.name}</span>
              <i class="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-0 group-hover:opacity-75 transition shrink-0" style="color: var(--h2h-contender-a);"></i>
            </h3>
          </div>
          <div class="flex flex-col items-center justify-center gap-1 mt-1 w-full">
            <span class="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0"
                  style="color: var(--h2h-contender-a); border-color: var(--h2h-contender-a); background-color: rgba(125, 125, 125, 0.08);">
              ${formatScore(metricsA.score)} PT
            </span>
            <span class="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0"
                  style="background: ${metricsA.archetypeColor}20; color: ${metricsA.archetypeColor}; border-color: ${metricsA.archetypeColor}50;">
              <i class="fa-solid ${metricsA.archetypeIcon} text-[9px]"></i> ${metricsA.archetypeTag}
            </span>
          </div>
        </div>

        <!-- VS Emblem -->
        <div class="col-span-1 text-center font-sport font-black text-sm italic tracking-widest opacity-60 drop-shadow flex items-center justify-center" style="color: var(--accent-color);">
          VS
        </div>

        <!-- Contender B Card -->
        <div class="col-span-5 text-center p-3 rounded-xl border flex flex-col items-center justify-between" style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="cursor-pointer group flex flex-col items-center w-full transition"
               onclick="window.openProfileFromH2H('${managerB.id}')"
               title="Vedi scheda profilo di ${managerB.name}">
            <div class="w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black text-sm border-2 mb-1 shadow transition group-hover:scale-110"
                 style="background: radial-gradient(circle, var(--h2h-contender-b) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--h2h-contender-b); color: var(--text-main);">
              ${initialsB}
            </div>
            <h3 class="h2h-contender-name font-sport font-black text-sm uppercase px-1 my-1 leading-normal transition group-hover:underline flex items-center justify-center gap-1" style="color: var(--text-main); line-height: 1.35;">
              <span>${managerB.name}</span>
              <i class="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-0 group-hover:opacity-75 transition shrink-0" style="color: var(--h2h-contender-b);"></i>
            </h3>
          </div>
          <div class="flex flex-col items-center justify-center gap-1 mt-1 w-full">
            <span class="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0"
                  style="color: var(--h2h-contender-b); border-color: var(--h2h-contender-b); background-color: rgba(125, 125, 125, 0.08);">
              ${formatScore(metricsB.score)} PT
            </span>
            <span class="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0"
                  style="background: ${metricsB.archetypeColor}20; color: ${metricsB.archetypeColor}; border-color: ${metricsB.archetypeColor}50;">
              <i class="fa-solid ${metricsB.archetypeIcon} text-[9px]"></i> ${metricsB.archetypeTag}
            </span>
          </div>
        </div>
      </div>

      <!-- Pre-Match Elo Win Probability Bar -->
      ${trackA && trackB ? `
        <div class="mt-3 pt-2.5 border-t" style="border-color: var(--table-border);">
          <div class="flex items-center justify-between text-[11px] font-bold mb-1">
            <span class="flex items-center gap-1 font-mono" style="color: var(--h2h-contender-a);">
              <span>⚡ ${formatElo(trackA.current)}</span>
              <span>(${winProbA.toFixed(1)}%)</span>
            </span>
            <span class="text-[9px] uppercase tracking-wider opacity-60 font-semibold" style="color: var(--text-muted);">
              Probabilità Vittoria Elo
            </span>
            <span class="flex items-center gap-1 font-mono" style="color: var(--h2h-contender-b);">
              <span>(${winProbB.toFixed(1)}%)</span>
              <span>${formatElo(trackB.current)} ⚡</span>
            </span>
          </div>
          <div class="w-full h-2 rounded-full overflow-hidden flex bg-slate-800">
            <div style="width: ${winProbA}%; background-color: var(--h2h-contender-a);" class="h-full transition-all duration-300"></div>
            <div style="width: ${winProbB}%; background-color: var(--h2h-contender-b);" class="h-full transition-all duration-300"></div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}
