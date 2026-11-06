/**
 * src/components/modals/matchup/MatchupFormWidget.ts
 * Recent Form (L5 with W/N/L) & Live Season Trend Widget for Matchup Modal
 */

import type { Manager, LiveSeasonDetails, LiveTeamMetrics } from '@/types';
import type { TacticalProfile } from '@/analytics/tactical/types';
import { escapeHtml } from '@/utils/dom';

/**
 * Renders the Live Form & Trend Widget for both contenders
 */
export function renderMatchupFormWidgetHTML(
  managerA: Manager,
  managerB: Manager,
  profileA: TacticalProfile,
  profileB: TacticalProfile,
  liveData?: LiveSeasonDetails | null,
  standingA?: LiveTeamMetrics | null,
  standingB?: LiveTeamMetrics | null
): string {
  const currentSeasonLabel = liveData?.season || '2026/27';

  return `
    <div class="p-3 sm:p-3.5 rounded-2xl border shadow-sm transition-colors"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="flex items-center justify-between mb-2 px-1">
        <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
          <i class="fa-solid fa-chart-line text-amber-500"></i>
          <span>Stato di Forma &amp; Trend Live</span>
        </span>
        <span class="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500">
          ${escapeHtml(currentSeasonLabel)}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-2 sm:gap-3">
        <!-- Contender A Live Form Tile -->
        <div class="p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 min-w-0"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="flex items-center justify-between gap-1">
            <span class="text-[10px] font-bold uppercase truncate" style="color: var(--h2h-contender-a, #f59e0b);">
              ${escapeHtml(managerA.name)}
            </span>
            ${standingA ? `
              <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md font-mono border"
                    style="background-color: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.25); color: var(--h2h-contender-a, #f59e0b);">
                ${standingA.rank}&deg; • ${typeof standingA.points === 'number' ? `${standingA.points} PT` : '-'}
              </span>
            ` : `
              <span class="text-[9px] font-bold opacity-60">Storico</span>
            `}
          </div>

          <!-- Form Pills L5 (V / N / P) matching main table -->
          <div class="flex items-center gap-1.5 my-1">
            <span class="text-[9px] uppercase font-black opacity-60 mr-0.5">L5:</span>
            ${(standingA?.recentForm && standingA.recentForm.length > 0) ? standingA.recentForm.slice(-5).map((r: string) => {
              if (r === 'W') {
                return '<span class="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-xs shrink-0 cursor-default" title="Vittoria">V</span>';
              }
              if (r === 'D') {
                return '<span class="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-xs shrink-0 cursor-default" title="Pareggio">N</span>';
              }
              return '<span class="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-xs shrink-0 cursor-default" title="Sconfitta">P</span>';
            }).join('') : '<span class="text-[10px] opacity-40 italic">-</span>'}
          </div>

          <!-- Metrics: Live Fantamedia & Momentum -->
          <div class="flex items-center justify-between text-[10px] pt-1 border-t" style="border-color: var(--table-border);">
            <span class="font-bold opacity-75" style="color: var(--text-muted);">
              FM: <strong class="font-mono text-emerald-400">${standingA?.avgFantaPoints ? standingA.avgFantaPoints.toFixed(1) : (standingA?.elo?.seasonStats?.[currentSeasonLabel]?.avgFP ? standingA.elo.seasonStats[currentSeasonLabel].avgFP.toFixed(1) : '-')}</strong>
            </span>
            <span class="font-bold opacity-75" style="color: var(--text-muted);">
              Inerzia: <strong class="font-mono text-cyan-400">${escapeHtml(profileA.mindset.momentum)}</strong>
            </span>
          </div>

          <!-- Mindset Pill -->
          <div class="mt-0.5">
            <span class="text-[9px] font-black px-2 py-0.5 rounded-full border truncate block text-center"
                  style="background-color: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); color: var(--accent-color, #f59e0b);">
              ${escapeHtml(profileA.mindset.pill)}
            </span>
          </div>
        </div>

        <!-- Contender B Live Form Tile -->
        <div class="p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 min-w-0"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="flex items-center justify-between gap-1">
            <span class="text-[10px] font-bold uppercase truncate" style="color: var(--h2h-contender-b, #06b6d4);">
              ${escapeHtml(managerB.name)}
            </span>
            ${standingB ? `
              <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md font-mono border"
                    style="background-color: rgba(6, 182, 212, 0.1); border-color: rgba(6, 182, 212, 0.25); color: var(--h2h-contender-b, #06b6d4);">
                ${standingB.rank}&deg; • ${typeof standingB.points === 'number' ? `${standingB.points} PT` : '-'}
              </span>
            ` : `
              <span class="text-[9px] font-bold opacity-60">Storico</span>
            `}
          </div>

          <!-- Form Pills L5 (V / N / P) matching main table -->
          <div class="flex items-center gap-1.5 my-1">
            <span class="text-[9px] uppercase font-black opacity-60 mr-0.5">L5:</span>
            ${(standingB?.recentForm && standingB.recentForm.length > 0) ? standingB.recentForm.slice(-5).map((r: string) => {
              if (r === 'W') {
                return '<span class="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-xs shrink-0 cursor-default" title="Vittoria">V</span>';
              }
              if (r === 'D') {
                return '<span class="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-xs shrink-0 cursor-default" title="Pareggio">N</span>';
              }
              return '<span class="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-xs shrink-0 cursor-default" title="Sconfitta">P</span>';
            }).join('') : '<span class="text-[10px] opacity-40 italic">-</span>'}
          </div>

          <!-- Metrics: Live Fantamedia & Momentum -->
          <div class="flex items-center justify-between text-[10px] pt-1 border-t" style="border-color: var(--table-border);">
            <span class="font-bold opacity-75" style="color: var(--text-muted);">
              FM: <strong class="font-mono text-emerald-400">${standingB?.avgFantaPoints ? standingB.avgFantaPoints.toFixed(1) : (standingB?.elo?.seasonStats?.[currentSeasonLabel]?.avgFP ? standingB.elo.seasonStats[currentSeasonLabel].avgFP.toFixed(1) : '-')}</strong>
            </span>
            <span class="font-bold opacity-75" style="color: var(--text-muted);">
              Inerzia: <strong class="font-mono text-cyan-400">${escapeHtml(profileB.mindset.momentum)}</strong>
            </span>
          </div>

          <!-- Mindset Pill -->
          <div class="mt-0.5">
            <span class="text-[9px] font-black px-2 py-0.5 rounded-full border truncate block text-center"
                  style="background-color: rgba(6, 182, 212, 0.1); border-color: rgba(6, 182, 212, 0.3); color: var(--h2h-contender-b, #06b6d4);">
              ${escapeHtml(profileB.mindset.pill)}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}
