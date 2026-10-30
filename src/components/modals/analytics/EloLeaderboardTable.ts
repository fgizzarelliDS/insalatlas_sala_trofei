/**
 * src/components/modals/analytics/EloLeaderboardTable.ts
 * Standings table component for Elo ratings (responsive desktop table and mobile card list)
 */

import type { EloTrackMode } from '@/types/analytics';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import {
  getManagerEloTrack,
  getEloBadgeClasses,
  getEloTierTitle,
  formatElo
} from '@/analytics/analyticsCore';
import type { EloProfileEntry } from './EloKpis';

export type EloTableSortField = 'rank' | 'name' | 'elo' | 'delta' | 'peak' | 'floor' | 'golo' | 'luck';

/**
 * Renders the responsive Elo leaderboard table with interactive column sorting
 */
export function renderEloLeaderboardTable(
  profiles: EloProfileEntry[],
  activeMode: EloTrackMode,
  sortField: EloTableSortField,
  sortDirection: 'desc' | 'asc',
  selectedSeason: string = 'all'
): string {
  if (!profiles || profiles.length === 0) return '';

  const dirMultiplier = sortDirection === 'desc' ? -1 : 1;
  const sKey = selectedSeason;

  const tableProfiles = [...profiles].sort((a, b) => {
    const trA = getManagerEloTrack(a.profile, activeMode);
    const trB = getManagerEloTrack(b.profile, activeMode);
    const stA = a.profile.seasonStats?.[sKey] || a.profile.seasonStats?.['all'] || { golo: 1.0, luckDelta: 0.0 };
    const stB = b.profile.seasonStats?.[sKey] || b.profile.seasonStats?.['all'] || { golo: 1.0, luckDelta: 0.0 };
    if (!trA || !trB) return 0;

    if (sortField === 'name') {
      return dirMultiplier * a.teamName.localeCompare(b.teamName);
    } else if (sortField === 'delta') {
      return dirMultiplier * (trA.lastDelta - trB.lastDelta);
    } else if (sortField === 'peak') {
      return dirMultiplier * (trA.peak.value - trB.peak.value);
    } else if (sortField === 'floor') {
      return dirMultiplier * (trA.floor.value - trB.floor.value);
    } else if (sortField === 'golo') {
      return dirMultiplier * ((stA.golo || 1.0) - (stB.golo || 1.0));
    } else if (sortField === 'luck') {
      return dirMultiplier * ((stA.luckDelta || 0.0) - (stB.luckDelta || 0.0));
    } else {
      // 'elo' or 'rank'
      return dirMultiplier * (trA.current - trB.current);
    }
  });

  // Helper for sort arrow icons
  const sortIcon = (field: EloTableSortField) => {
    if (sortField !== field) return '';
    return `<i class="fa-solid ${sortDirection === 'desc' ? 'fa-arrow-down' : 'fa-arrow-up'} text-[9px] ml-1 text-amber-400"></i>`;
  };

  // Build Desktop Table Rows
  const tableRows = tableProfiles.map((p, idx) => {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (!tr) return '';

    const badge = getEloBadgeClasses(tr.current);
    const tierTitle = getEloTierTitle(tr.current);
    const teamLogo = resolveTeamLogo(p.teamName, p.logo);
    const escapedTeamName = p.teamName.replace(/'/g, "\\'");
    const rank = idx + 1;

    let rankBadge = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    if (rank === 1) rankBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black';
    else if (rank === 2) rankBadge = 'bg-slate-300/20 text-slate-200 border-slate-300/40 font-bold';
    else if (rank === 3) rankBadge = 'bg-amber-700/20 text-amber-400 border-amber-700/40 font-bold';

    const deltaSign = tr.lastDelta > 0 ? '+' : '';
    const deltaColor = tr.lastDelta > 0 ? 'text-emerald-400' : tr.lastDelta < 0 ? 'text-rose-400' : 'text-slate-400';

    const st = p.profile.seasonStats?.[sKey] || p.profile.seasonStats?.['all'] || { golo: 1.0, luckDelta: 0.0 };
    const goloVal = st.golo || 1.0;
    const luckVal = st.luckDelta || 0.0;
    const goloBadge = goloVal >= 1.0 ? 'text-amber-400 font-bold' : 'text-slate-400 opacity-80';
    const luckSign = luckVal > 0 ? '+' : '';
    const luckColor = luckVal > 0.3 ? 'text-emerald-400 font-bold' : luckVal < -0.3 ? 'text-rose-400 font-bold' : 'text-slate-400';

    return `
      <tr onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${p.managerId}', '${escapedTeamName}')"
          class="border-b last:border-b-0 hover:bg-amber-500/10 cursor-pointer transition select-none group"
          style="border-color: var(--table-border);">
        <td class="py-2.5 px-3 text-center align-middle w-12">
          <span class="w-6 h-6 rounded-lg text-xs border flex items-center justify-center mx-auto ${rankBadge}">
            #${rank}
          </span>
        </td>
        <td class="py-2.5 px-3 text-left align-middle min-w-0">
          <div class="flex items-center gap-2.5">
            <img src="${teamLogo}" alt="${p.teamName}"
                 class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-105"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(p.teamName)}'">
            <div class="min-w-0">
              <div class="font-bold text-xs sm:text-sm truncate" style="color: var(--text-main);">${p.teamName}</div>
              <div class="text-[10px] font-semibold flex items-center gap-1 opacity-75 truncate" style="color: var(--accent-color);">
                <i class="fa-solid fa-user-tie text-[9px]"></i>
                <span>${p.coach}</span>
              </div>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-28">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs sm:text-sm font-bold font-mono border shadow-xs ${badge.bg} ${badge.text} ${badge.border}">
            <span>${formatElo(tr.current)}</span>
          </span>
          <div class="text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-60" style="color: var(--text-muted);">${tierTitle}</div>
        </td>
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-20">
          <span class="font-mono font-bold text-xs ${deltaColor}">
            ${deltaSign}${tr.lastDelta.toFixed(1)}
          </span>
        </td>
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-24">
          <span class="font-mono text-xs ${goloBadge}">
            ${goloVal.toFixed(2)}x
          </span>
        </td>
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-24">
          <span class="font-mono text-xs ${luckColor}">
            ${luckSign}${luckVal.toFixed(1)} pt
          </span>
        </td>
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-24">
          <div class="font-mono font-bold text-xs" style="color: var(--text-main);">${formatElo(tr.peak.value)}</div>
          <div class="text-[9px] opacity-60" style="color: var(--text-muted);">${tr.peak.season} G${tr.peak.round}</div>
        </td>
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-24">
          <div class="font-mono font-bold text-xs" style="color: var(--text-main);">${formatElo(tr.floor.value)}</div>
          <div class="text-[9px] opacity-60" style="color: var(--text-muted);">${tr.floor.season} G${tr.floor.round}</div>
        </td>
      </tr>
    `;
  }).join('');

  // Build Mobile Card List (< 768px)
  const mobileCards = tableProfiles.map((p, idx) => {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (!tr) return '';

    const badge = getEloBadgeClasses(tr.current);
    const tierTitle = getEloTierTitle(tr.current);
    const teamLogo = resolveTeamLogo(p.teamName, p.logo);
    const escapedTeamName = p.teamName.replace(/'/g, "\\'");
    const rank = idx + 1;

    let rankBadge = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    if (rank === 1) rankBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black';
    else if (rank === 2) rankBadge = 'bg-slate-300/20 text-slate-200 border-slate-300/40 font-bold';
    else if (rank === 3) rankBadge = 'bg-amber-700/20 text-amber-400 border-amber-700/40 font-bold';

    const deltaSign = tr.lastDelta > 0 ? '+' : '';
    const deltaColor = tr.lastDelta > 0 ? 'text-emerald-400' : tr.lastDelta < 0 ? 'text-rose-400' : 'text-slate-400';

    const st = p.profile.seasonStats?.[sKey] || p.profile.seasonStats?.['all'] || { golo: 1.0, luckDelta: 0.0 };
    const goloVal = st.golo || 1.0;
    const luckVal = st.luckDelta || 0.0;
    const goloBadge = goloVal >= 1.0 ? 'text-amber-400 font-bold' : 'text-slate-400 opacity-80';
    const luckSign = luckVal > 0 ? '+' : '';
    const luckColor = luckVal > 0.3 ? 'text-emerald-400 font-bold' : luckVal < -0.3 ? 'text-rose-400 font-bold' : 'text-slate-400';

    return `
      <div onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${p.managerId}', '${escapedTeamName}')"
           class="p-2.5 sm:p-3 transition-colors active:bg-amber-500/10 cursor-pointer select-none"
           style="border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2">
          <!-- Left: Rank, Crest, Team & Coach -->
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="w-6 h-6 rounded-md text-[11px] border flex items-center justify-center shrink-0 ${rankBadge}">
              #${rank}
            </span>
            <img src="${teamLogo}" alt="${p.teamName}"
                 class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-xs"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(p.teamName)}'">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-xs sm:text-sm leading-snug break-words" style="color: var(--text-main);">
                ${p.teamName}
              </div>
              <div class="text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 mt-0.5 truncate" style="color: var(--accent-color);">
                <i class="fa-solid fa-user-tie text-[9px] opacity-70 shrink-0"></i>
                <span class="truncate">${p.coach}</span>
              </div>
            </div>
          </div>

          <!-- Right: Rating Pill + Delta & Tier -->
          <div class="flex flex-col items-end shrink-0 text-right">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-mono font-bold border shadow-xs ${badge.bg} ${badge.text} ${badge.border}">
              ${formatElo(tr.current)}
            </span>
            <div class="mt-0.5 flex items-center gap-1 text-[10px]">
              <span class="font-mono font-bold ${deltaColor}">${deltaSign}${tr.lastDelta.toFixed(1)}</span>
              <span class="text-[9px] opacity-60 font-semibold" style="color: var(--text-muted);">${tierTitle}</span>
            </div>
          </div>
        </div>

        <!-- Middle Subrow: Golo and Luck -->
        <div class="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t text-[10px] font-mono opacity-85"
             style="border-color: var(--table-border);">
          <div>
            Golo: <strong class="${goloBadge}">${goloVal.toFixed(2)}x</strong>
          </div>
          <div>
            Sfiga Δ: <strong class="${luckColor}">${luckSign}${luckVal.toFixed(1)} pt</strong>
          </div>
        </div>

        <!-- Bottom Subrow: Peak and Floor -->
        <div class="flex items-center justify-between gap-2 mt-1 pt-1 text-[10px] font-mono opacity-70"
             style="color: var(--text-muted);">
          <div>
            Picco: <strong class="text-purple-400 font-bold">${formatElo(tr.peak.value)}</strong>
            <span class="opacity-60 text-[9px]">(${tr.peak.season} G${tr.peak.round})</span>
          </div>
          <div>
            Min: <strong style="color: var(--text-main); font-bold;">${formatElo(tr.floor.value)}</strong>
            <span class="opacity-60 text-[9px]">(${tr.floor.season} G${tr.floor.round})</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="rounded-2xl border overflow-hidden"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="px-3.5 py-2.5 border-b flex items-center justify-between"
           style="border-color: var(--table-border); background-color: var(--header-bg); color: var(--header-text);">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-list-ol text-amber-500 text-xs"></i>
          <h4 class="font-bold text-xs sm:text-sm uppercase tracking-wider">Classifica Elo</h4>
        </div>
        <span class="text-[10px] font-mono opacity-60">
          ${profiles.length} manager attivi
        </span>
      </div>

      <!-- Mobile Card List (< 768px) -->
      <div class="md:hidden divide-y" style="border-color: var(--table-border);">
        ${mobileCards}
      </div>

      <!-- Desktop Full Table (>= 768px) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="border-b text-[11px] uppercase tracking-wider font-bold select-none"
                style="background-color: var(--table-header); color: var(--text-muted); border-color: var(--table-border);">
              <th class="py-2.5 px-3 text-center w-12">
                <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('rank')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center justify-center">
                  <span>#</span>${sortIcon('rank')}
                </button>
              </th>
              <th class="py-2.5 px-3 text-left">
                <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('name')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center">
                  <span>Squadra / Allenatore</span>${sortIcon('name')}
                </button>
              </th>
              <th class="py-2.5 px-3 text-center w-28">
                <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('elo')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center justify-center">
                  <span>Rating Elo</span>${sortIcon('elo')}
                </button>
              </th>
              <th class="py-2.5 px-3 text-center w-20">
                <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('delta')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center justify-center">
                  <span>Δ Ultima</span>${sortIcon('delta')}
                </button>
              </th>
              <th class="py-2.5 px-3 text-center w-24">
                <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('golo')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center justify-center">
                  <span>Golo</span>${sortIcon('golo')}
                </button>
              </th>
              <th class="py-2.5 px-3 text-center w-24">
                <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('luck')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center justify-center">
                  <span>Sfiga Δ</span>${sortIcon('luck')}
                </button>
              </th>
              <th class="py-2.5 px-3 text-center w-24">
                <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('peak')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center justify-center">
                  <span>Picco</span>${sortIcon('peak')}
                </button>
              </th>
              <th class="py-2.5 px-3 text-center w-24">
                <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('floor')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center justify-center">
                  <span>Minimo</span>${sortIcon('floor')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
