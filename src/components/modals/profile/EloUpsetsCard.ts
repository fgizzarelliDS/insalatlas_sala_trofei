/**
 * src/components/modals/profile/EloUpsetsCard.ts
 * Renders the "Miglior Impresa & Peggior Beffa" (Best Win & Worst Defeat by Elo swing)
 * for a manager's profile, dynamically synced with the active Elo tracking mode.
 */

import type { Manager } from '@/types';
import type { EloTrackMode, EloTrajectoryPoint } from '@/types/analytics';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { getEloMode, getManagerEloTrack } from '@/analytics/analyticsCore';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { escapeHtml } from '@/utils/dom';

export interface ManagerEpicMatches {
  bestWin: EloTrajectoryPoint | null;
  worstLoss: EloTrajectoryPoint | null;
}

/**
 * Finds the best win (maximum positive Elo delta) and worst loss (maximum negative Elo delta)
 * for a manager from their Elo match trajectory.
 */
export function extractManagerEpicMatches(
  m: Manager,
  mode: EloTrackMode = getEloMode()
): ManagerEpicMatches {
  const liveData = getLiveSeasonDetails();
  const standing = liveData?.standings?.find(s => s.managerId === m.id);
  const track = getManagerEloTrack(standing?.elo, mode);

  if (!track?.trajectory || track.trajectory.length === 0) {
    return { bestWin: null, worstLoss: null };
  }

  let bestWin: EloTrajectoryPoint | null = null;
  let worstLoss: EloTrajectoryPoint | null = null;

  for (const pt of track.trajectory) {
    const delta = pt.delta ?? 0;
    // Best win: victorious match with highest positive Elo delta
    if (pt.result === 'W' && delta > 0) {
      if (!bestWin || delta > (bestWin.delta ?? 0)) {
        bestWin = pt;
      }
    }
    // Worst loss: defeat with lowest (most negative) Elo delta
    if (pt.result === 'L' && delta < 0) {
      if (!worstLoss || delta < (worstLoss.delta ?? 0)) {
        worstLoss = pt;
      }
    }
  }

  return { bestWin, worstLoss };
}

/**
 * Populates the "Miglior Impresa & Peggior Beffa" card in Tab 2 of the manager profile modal
 */
export function populateEloUpsetsCard(
  m: Manager,
  mode: EloTrackMode = getEloMode()
): void {
  const card = document.getElementById('profile-elo-upsets-card');
  const container = document.getElementById('profile-elo-upsets-container');
  if (!card || !container) return;

  const { bestWin, worstLoss } = extractManagerEpicMatches(m, mode);

  if (!bestWin && !worstLoss) {
    card.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  card.classList.remove('hidden');
  container.innerHTML = `
    <!-- 🏆 Miglior Impresa -->
    <div class="p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 transition shadow-2xs hover:border-emerald-500/40"
         style="background-color: var(--input-bg); border-color: var(--table-border);">
      <div class="flex items-center justify-between gap-1 pb-1.5 border-b border-[var(--table-border)]/50">
        <span class="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <span>🏆</span>
          <span>Miglior Impresa</span>
        </span>
        ${bestWin ? `
          <span class="px-2 py-0.5 rounded-full font-mono text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            +${Math.round(bestWin.delta)} Elo
          </span>
        ` : ''}
      </div>

      ${bestWin ? `
        <div class="space-y-1.5">
          <div class="flex items-center gap-2 min-w-0">
            <img src="${resolveTeamLogo(bestWin.opponentTeamName)}"
                 alt="${bestWin.opponentTeamName}"
                 class="w-6 h-6 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-2xs"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(bestWin.opponentTeamName)}'">
            <div class="min-w-0 truncate">
              <span class="font-bold text-xs truncate block" style="color: var(--text-main);">
                vs ${escapeHtml(bestWin.opponentTeamName || 'Avversario')}
              </span>
              <span class="text-[9.5px] opacity-70 block font-medium" style="color: var(--text-muted);">
                ${escapeHtml(bestWin.roundLabel || ('G' + bestWin.round))} • ${escapeHtml(bestWin.season || '')} (${escapeHtml(bestWin.competition || 'Campionato')})
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between text-[10.5px] font-mono pt-1 border-t border-[var(--table-border)]/30">
            <span class="font-bold text-emerald-600 dark:text-emerald-400">
              Score: ${bestWin.gf !== undefined && bestWin.ga !== undefined ? `${bestWin.gf} - ${bestWin.ga}` : 'Vittoria'}
            </span>
            ${bestWin.winProbPreMatch !== undefined ? `
              <span class="opacity-70 text-[9.5px]" style="color: var(--text-muted);" title="Probabilità stimata prima del calcio d'inizio">
                Stima: <strong class="text-amber-600 dark:text-amber-400">${bestWin.winProbPreMatch.toFixed(0)}%</strong>
              </span>
            ` : ''}
          </div>
        </div>
      ` : `
        <div class="py-3 text-center text-xs opacity-50" style="color: var(--text-muted);">
          Nessuna vittoria con incremento Elo registrata
        </div>
      `}
    </div>

    <!-- 💔 Peggior Beffa -->
    <div class="p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 transition shadow-2xs hover:border-rose-500/40"
         style="background-color: var(--input-bg); border-color: var(--table-border);">
      <div class="flex items-center justify-between gap-1 pb-1.5 border-b border-[var(--table-border)]/50">
        <span class="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
          <span>💔</span>
          <span>Peggior Beffa</span>
        </span>
        ${worstLoss ? `
          <span class="px-2 py-0.5 rounded-full font-mono text-[10px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            ${Math.round(worstLoss.delta)} Elo
          </span>
        ` : ''}
      </div>

      ${worstLoss ? `
        <div class="space-y-1.5">
          <div class="flex items-center gap-2 min-w-0">
            <img src="${resolveTeamLogo(worstLoss.opponentTeamName)}"
                 alt="${worstLoss.opponentTeamName}"
                 class="w-6 h-6 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-2xs"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(worstLoss.opponentTeamName)}'">
            <div class="min-w-0 truncate">
              <span class="font-bold text-xs truncate block" style="color: var(--text-main);">
                vs ${escapeHtml(worstLoss.opponentTeamName || 'Avversario')}
              </span>
              <span class="text-[9.5px] opacity-70 block font-medium" style="color: var(--text-muted);">
                ${escapeHtml(worstLoss.roundLabel || ('G' + worstLoss.round))} • ${escapeHtml(worstLoss.season || '')} (${escapeHtml(worstLoss.competition || 'Campionato')})
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between text-[10.5px] font-mono pt-1 border-t border-[var(--table-border)]/30">
            <span class="font-bold text-rose-600 dark:text-rose-400">
              Score: ${worstLoss.gf !== undefined && worstLoss.ga !== undefined ? `${worstLoss.gf} - ${worstLoss.ga}` : 'Sconfitta'}
            </span>
            ${worstLoss.winProbPreMatch !== undefined ? `
              <span class="opacity-70 text-[9.5px]" style="color: var(--text-muted);" title="Probabilità stimata prima del calcio d'inizio">
                Da favoriti: <strong class="text-rose-600 dark:text-rose-400">${worstLoss.winProbPreMatch.toFixed(0)}%</strong>
              </span>
            ` : ''}
          </div>
        </div>
      ` : `
        <div class="py-3 text-center text-xs opacity-50" style="color: var(--text-muted);">
          Nessuna sconfitta registrata
        </div>
      `}
    </div>
  `;
}
