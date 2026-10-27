import { renderNodeToCanvas } from './core';
import { LEAGUE, LEAGUE_SITE_HOST } from '@/config';
import { state } from '@/state';
import { getLiveSeasonDetails, loadLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { findUpcomingRound, resolveMatchupMetrics } from '@/components/board/seasons/nextRoundMetrics';
import { getCachedNextRoundLiveData } from '@/components/board/seasons/NextRoundStrip';
import { getEloMode } from '@/analytics/analyticsCore';
import { getTeamFallbackCrest } from '@/crests';
import { escapeHtml } from '@/utils/dom';

/**
 * Prepares and renders the full Next Round (Prossimo Turno) matchday odds card into a high-res canvas.
 * Frames all upcoming fixtures with team crests, pre-match Elo ratings, Bradley-Terry duel probabilities,
 * and context clima badges inside an official league header and watermark footer themed to match the active app theme.
 */
export async function renderNextRoundCanvas(): Promise<HTMLCanvasElement> {
  let liveData = getLiveSeasonDetails() || getCachedNextRoundLiveData();
  if (!liveData) {
    liveData = await loadLiveSeasonDetails();
  }
  if (!liveData) {
    throw new Error('Dati live season non disponibili per l\'esportazione');
  }

  const nextRound = findUpcomingRound(liveData);
  if (!nextRound || !nextRound.matches || nextRound.matches.length === 0) {
    throw new Error('Nessun prossimo turno disponibile per l\'esportazione');
  }

  const matches = nextRound.matches.filter(m => !m.isPlayed);
  if (matches.length === 0) {
    throw new Error('Tutte le partite del turno risultano già giocate');
  }

  const mode = getEloMode();
  const modeLabel = mode === 'flat' ? '⚡ Elo Puro (1500)' : mode === 'historical' ? '🏛️ Elo Storico' : '🔮 Atlas Power';
  const totalTeams = liveData.standings?.length || 14;

  const currentTheme = state.currentTheme || 'gazzetta';
  const exportCard = document.createElement('div');
  exportCard.id = 'next-round-export-card';
  exportCard.className = `rounded-3xl border shadow-2xl overflow-hidden p-0 theme-${currentTheme}`;
  exportCard.style.backgroundColor = 'var(--table-surface)';
  exportCard.style.borderColor = 'var(--table-border)';
  exportCard.style.color = 'var(--text-main)';
  exportCard.style.width = '960px';

  // Build match cards HTML
  const cardsHtml = matches.map((m: any, idx: number) => {
    const meta = resolveMatchupMetrics(m, idx, liveData, mode, totalTeams);

    return `
      <div class="rounded-2xl border p-3.5 flex flex-col justify-between gap-3 shadow-2xs"
           style="background-color: var(--input-bg); border-color: var(--input-border);">
        <!-- Card Top Bar: Match Clima Badge & Duel Number -->
        <div class="flex items-center justify-between gap-2 pb-2 border-b border-[var(--table-border)]/40">
          <span class="text-[9.5px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${meta.clima.badgeClass}">
            ${meta.clima.label}
          </span>
          <span class="text-[10px] font-mono opacity-60 font-semibold" style="color: var(--text-muted);">
            Duello #${idx + 1}
          </span>
        </div>

        <!-- Teams Section -->
        <div class="space-y-2.5">
          <!-- Team 1 -->
          <div class="flex items-center justify-between gap-2 min-w-0">
            <div class="flex items-center gap-2 min-w-0 truncate">
              <span class="w-6 shrink-0 font-mono text-[10.5px] font-bold opacity-50 text-left inline-block" style="color: var(--text-muted);">
                #${meta.homeRank}
              </span>
              <img src="${meta.homeLogo}" alt="${meta.homeTeam}"
                   class="w-7 h-7 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-2xs"
                   onerror="this.onerror=null; this.src='${getTeamFallbackCrest(meta.homeTeam)}'">
              <span class="font-bold text-sm leading-snug truncate" style="color: var(--text-main);">${escapeHtml(meta.homeTeam)}</span>
            </div>
            <span class="font-mono text-xs font-bold px-2 py-0.5 rounded border shrink-0 bg-black/5 dark:bg-white/5 border-slate-200 dark:border-slate-800"
                  style="color: var(--text-muted);">
              ${meta.homeEloInt}
            </span>
          </div>

          <!-- Team 2 -->
          <div class="flex items-center justify-between gap-2 min-w-0">
            <div class="flex items-center gap-2 min-w-0 truncate">
              <span class="w-6 shrink-0 font-mono text-[10.5px] font-bold opacity-50 text-left inline-block" style="color: var(--text-muted);">
                #${meta.awayRank}
              </span>
              <img src="${meta.awayLogo}" alt="${meta.awayTeam}"
                   class="w-7 h-7 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-2xs"
                   onerror="this.onerror=null; this.src='${getTeamFallbackCrest(meta.awayTeam)}'">
              <span class="font-bold text-sm leading-snug truncate" style="color: var(--text-main);">${escapeHtml(meta.awayTeam)}</span>
            </div>
            <span class="font-mono text-xs font-bold px-2 py-0.5 rounded border shrink-0 bg-black/5 dark:bg-white/5 border-slate-200 dark:border-slate-800"
                  style="color: var(--text-muted);">
              ${meta.awayEloInt}
            </span>
          </div>
        </div>

        <!-- Duel Probability Bar with Integrated Percentages -->
        <div class="pt-2 border-t border-[var(--table-border)]/50 flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs font-mono font-black">
            <span class="text-emerald-700 dark:text-emerald-400 font-extrabold">${meta.winProbHome.toFixed(0)}%</span>
            <span class="text-[9px] uppercase tracking-wider opacity-70 font-sans font-semibold" style="color: var(--text-muted);">
              Probabilità Vittoria
            </span>
            <span class="text-rose-700 dark:text-rose-400 font-extrabold">${meta.winProbAway.toFixed(0)}%</span>
          </div>
          <div class="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-700/40">
            <div style="width: ${meta.winProbHome}%;" class="h-full bg-emerald-500"></div>
            <div style="width: ${meta.winProbAway}%;" class="h-full bg-rose-500"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  exportCard.innerHTML = `
    <!-- Official Header Banner -->
    <div class="p-6 border-b flex items-center justify-between gap-4"
         style="border-color: var(--table-border); background-color: var(--header-bg); color: var(--header-text);">
      <div class="flex items-center gap-4">
        <img src="favicon-64x64.png" alt="${LEAGUE.brand.name}" class="w-12 h-12 object-contain rounded-2xl shadow-md border border-white/20 bg-white/10 p-1">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-xs">
              ⚽ PROSSIMO TURNO • GIORNATA ${nextRound.roundNumber}
            </span>
            <span class="text-xs font-mono font-bold opacity-80" style="color: var(--header-text);">
              Stagione Live ${liveData.season}
            </span>
          </div>
          <h2 class="text-xl font-extrabold tracking-tight" style="color: var(--header-text);">Quote Pre-Match &amp; Modello Bradley-Terry</h2>
          <p class="text-xs font-medium opacity-80 mt-0.5" style="color: var(--header-text);">
            Previsioni probabilistiche calcolate dal modello Elo prima del calcio d'inizio
          </p>
        </div>
      </div>
      <div class="text-right flex flex-col items-end gap-1.5 shrink-0">
        <div class="font-extrabold text-sm tracking-wider uppercase" style="color: var(--header-text);">${LEAGUE.brand.name}</div>
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border border-white/20 bg-white/10 text-white/90">
          ${modeLabel}
        </span>
        <div class="text-[11px] font-semibold opacity-70" style="color: var(--header-text);">
          ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>

    <!-- Match Cards Grid -->
    <div class="p-6 grid grid-cols-2 gap-4" style="background-color: var(--table-surface);">
      ${cardsHtml}
    </div>

    <!-- Official Watermark Footer -->
    <div class="p-4 border-t flex items-center justify-between text-xs font-semibold"
         style="border-color: var(--table-border); background-color: var(--table-surface); color: var(--text-muted);">
      <div class="flex items-center gap-2">
        <img src="favicon-64x64.png" alt="${LEAGUE.brand.name}" class="w-4 h-4 object-contain inline-block">
        <span>${LEAGUE.brand.name} • Quote Pre-Match Ufficiali</span>
      </div>
      <div class="text-[11px] opacity-80 font-mono font-bold" style="color: var(--accent-color);">
        ${LEAGUE_SITE_HOST}
      </div>
    </div>
  `;

  const exportBg = currentTheme === 'gazzetta'
    ? '#fce7ec'
    : currentTheme === 'studio'
      ? '#f1f5f9'
      : currentTheme === 'seriea'
        ? '#020b1c'
        : '#090d16';

  return renderNodeToCanvas(exportCard, 960, exportBg);
}
