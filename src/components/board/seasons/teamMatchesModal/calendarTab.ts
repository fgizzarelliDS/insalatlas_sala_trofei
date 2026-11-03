/**
 * src/components/board/seasons/teamMatchesModal/calendarTab.ts
 * Renders the full 26-round fixtures calendar tab:
 * - Authentic historical pre-match odds and final scores for played rounds
 * - Davidson 1X2 odds and hybrid Strength of Schedule difficulty pills for unplayed matches
 */

import { escapeHtml } from '@/utils/dom';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { formatEloDelta } from '@/analytics/analyticsCore';
import { getOpponentDifficulty, computeOpponentDistributionContext } from '@/analytics/sosEngine';
import type { LiveTeamMetrics } from '@/types';
import type { EloTrackMode } from '@/types/analytics';
import type { TeamMatchEntry } from './types';

export function renderCalendarTabHTML(
  matchesPlayed: TeamMatchEntry[],
  standings: LiveTeamMetrics[],
  activeMode: EloTrackMode,
  teamName: string
): string {
  const playedCount = matchesPlayed.filter(m => m.isPlayed).length;
  const unplayedCount = matchesPlayed.length - playedCount;

  if (matchesPlayed.length === 0) {
    return `
      <div class="p-8 text-center text-sm font-semibold opacity-60">
        Nessuna partita registrata nel calendario ufficiale.
      </div>
    `;
  }

  // Precompute league distribution moments once across the 26 fixtures
  const diffCtx = computeOpponentDistributionContext(standings, activeMode);

  const matchesListHTML = matchesPlayed.map(match => {
    let outcomeBadgeClass = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    let outcomeIcon = 'fa-minus';
    let outcomeText = 'PAREGGIO';

    if (match.outcome === 'W') {
      outcomeBadgeClass = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      outcomeIcon = 'fa-check';
      outcomeText = 'VITTORIA';
    } else if (match.outcome === 'L') {
      outcomeBadgeClass = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      outcomeIcon = 'fa-xmark';
      outcomeText = 'SCONFITTA';
    }

    const oppLogo = resolveTeamLogo(match.oppTeamName, match.oppLogo);
    const safeOppMgrId = escapeHtml(match.oppManagerId || '');
    const safeOppTeamName = escapeHtml(match.oppTeamName.replace(/'/g, "\\'"));
    const eloDeltaColor = match.eloDelta && match.eloDelta > 0
      ? 'text-emerald-400'
      : match.eloDelta && match.eloDelta < 0
        ? 'text-rose-400'
        : 'text-slate-400';

    const diff = getOpponentDifficulty(match.oppStanding, diffCtx, activeMode);

    return `
      <div onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${safeOppMgrId}', '${safeOppTeamName}');"
           class="p-2.5 sm:p-3 rounded-2xl border flex flex-col gap-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer select-none"
           style="border-color: var(--table-border); background-color: var(--table-surface);"
           title="Vedi calendario di ${escapeHtml(match.oppTeamName)}">
        <div class="flex items-center justify-between gap-2.5 sm:gap-3">
          <!-- Round number & Opponent (Logo + Name side by side) -->
          <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div class="w-8 sm:w-10 h-7 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-xs bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30">
              <span class="font-sport font-black text-xs sm:text-sm tracking-tight">G${match.roundNumber}</span>
            </div>

            <div class="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
              <img src="${oppLogo}" alt="${escapeHtml(match.oppTeamName)}"
                   class="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-xs"
                   onerror="this.onerror=null; this.src='${getTeamFallbackCrest(match.oppTeamName)}'">
              <span class="font-bold text-xs sm:text-sm leading-snug break-words" style="color: var(--text-main);">${escapeHtml(match.oppTeamName)}</span>
            </div>
          </div>

          <!-- Outcome Badge & Elo Rating Impact OR Difficulty Badge -->
          <div class="shrink-0 flex items-center justify-end gap-1.5 sm:gap-2">
            ${match.isPlayed ? `
              ${match.eloDelta !== null && match.eloDelta !== undefined ? `
                <div class="flex flex-col items-end text-right shrink-0">
                  <span class="text-[10px] sm:text-[11px] font-mono font-bold ${eloDeltaColor}">${formatEloDelta(match.eloDelta)} pt</span>
                </div>
              ` : ''}
              <span class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-xs font-black tracking-wider uppercase border flex items-center gap-1 shadow-xs shrink-0 ${outcomeBadgeClass}">
                <i class="fa-solid ${outcomeIcon} text-[9px] sm:text-[10px]"></i>
                <span>${outcomeText}</span>
              </span>
            ` : `
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 shadow-2xs ${diff.badgeClass}" title="Difficoltà determinata dall'ibrido 50% Elo + 50% Punti classifica dell'avversario">
                <i class="fa-solid fa-circle text-[6px] ${diff.dotColor}"></i>
                <span>${diff.label}</span>
              </span>
            `}
          </div>
        </div>

        <!-- H2H Duel Probability Gauge & 1X2 Odds Pills -->
        <div class="pt-1.5 border-t border-[var(--table-border)]/50 flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-[10px] font-mono font-bold">
            <span class="text-emerald-500 dark:text-emerald-400 font-black">${Math.round(match.odds.h2hHome)}%</span>
            <span class="text-[9px] uppercase tracking-wider opacity-60 font-sans font-semibold" style="color: var(--text-muted);">
              Probabilità H2H
            </span>
            <span class="text-rose-500 dark:text-rose-400 font-black">${100 - Math.round(match.odds.h2hHome)}%</span>
          </div>
          <div class="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-700/40">
            <div style="width: ${match.odds.h2hHome}%;" class="h-full bg-emerald-500 transition-all duration-300"></div>
            <div style="width: ${match.odds.h2hAway}%;" class="h-full bg-rose-500 transition-all duration-300"></div>
          </div>

          <!-- 1X2 Match Odds Board (Agnostic Standardized Davidson Model) -->
          <div class="grid grid-cols-3 gap-1 pt-1 text-center select-none font-mono">
            <div class="py-0.5 px-1 rounded-lg border flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/5 shadow-2xs"
                 style="border-color: var(--input-border);"
                 title="Quota 1 (Vittoria ${escapeHtml(teamName)}): ${match.odds.p1}% su 3 esiti • ${match.odds.h2hHome.toFixed(0)}% H2H">
              <span class="text-[8px] font-bold opacity-50" style="color: var(--text-muted);">1</span>
              <span class="text-[11px] font-black text-emerald-600 dark:text-emerald-400">${match.odds.q1.toFixed(2)}</span>
            </div>
            <div class="py-0.5 px-1 rounded-lg border flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/5 shadow-2xs"
                 style="border-color: var(--input-border);"
                 title="Quota X (Pareggio): ${match.odds.pX}% su 3 esiti">
              <span class="text-[8px] font-bold opacity-50" style="color: var(--text-muted);">X</span>
              <span class="text-[11px] font-black text-amber-600 dark:text-amber-400">${match.odds.qX.toFixed(2)}</span>
            </div>
            <div class="py-0.5 px-1 rounded-lg border flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/5 shadow-2xs"
                 style="border-color: var(--input-border);"
                 title="Quota 2 (Vittoria ${escapeHtml(match.oppTeamName)}): ${match.odds.p2}% su 3 esiti • ${match.odds.h2hAway.toFixed(0)}% H2H">
              <span class="text-[8px] font-bold opacity-50" style="color: var(--text-muted);">2</span>
              <span class="text-[11px] font-black text-rose-600 dark:text-rose-400">${match.odds.q2.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="space-y-3">
      <!-- Calendar Status Pill -->
      <div class="flex items-center justify-between text-xs px-1 text-[var(--text-muted)]">
        <span class="font-bold flex items-center gap-1.5">
          <i class="fa-solid fa-calendar-check text-amber-500"></i>
          <span>${playedCount} gare disputate</span>
          <span class="opacity-40">•</span>
          <span>${unplayedCount} gare rimanenti</span>
        </span>
        <span class="text-[11px] opacity-75">Clicca su un avversario per aprire il suo calendario</span>
      </div>

      <!-- Match Cards Grid/List -->
      <div class="space-y-2.5">
        ${matchesListHTML}
      </div>
    </div>
  `;
}
