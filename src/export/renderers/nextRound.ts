import type { LiveSeasonDetails } from '@/types';
import { renderNodeToCanvas } from './core';
import { createStoryContainer } from './story';
import { LEAGUE, LEAGUE_SITE_HOST } from '@/config';
import { state } from '@/state';
import { getLiveSeasonDetails, loadLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { findUpcomingRound, resolveMatchupMetrics, buildLeagueDistributionContext } from '@/components/board/seasons/nextRoundMetrics';
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
  exportCard.style.width = '1040px';

  const leagueCtx = buildLeagueDistributionContext(liveData.standings || [], mode, liveData.season);

  // Build match cards HTML
  const cardsHtml = matches.map((m: any, idx: number) => {
    const meta = resolveMatchupMetrics(m, idx, liveData, mode, totalTeams, leagueCtx);

    return `
      <div class="rounded-2xl border p-3.5 flex flex-col justify-between gap-3 shadow-2xs"
           style="background-color: var(--input-bg); border-color: var(--input-border);">
        <!-- Card Top Bar: Match Clima Badge & Duel Number -->
        <div class="flex items-center justify-between gap-2 pb-2 border-b border-[var(--table-border)]/40">
          <span class="inline-flex items-center gap-1.5 text-[9.5px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full border shadow-2xs whitespace-nowrap leading-none ${meta.clima.badgeClass}">
            ${meta.clima.label}
          </span>
          <span class="text-[10px] font-mono opacity-60 font-semibold shrink-0" style="color: var(--text-muted);">
            Duello #${idx + 1}
          </span>
        </div>

        <!-- Teams Section (Balanced 2-line wrap, no overflow) -->
        <div class="space-y-2.5">
          <!-- Team 1 -->
          <div class="flex items-center justify-between gap-2 min-w-0">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <span class="w-6 shrink-0 font-mono text-[10.5px] font-bold opacity-50 text-left inline-block" style="color: var(--text-muted);">
                #${meta.homeRank}
              </span>
              <img src="${meta.homeLogo}" alt="${meta.homeTeam}"
                   class="w-7 h-7 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-2xs"
                   onerror="this.onerror=null; this.src='${getTeamFallbackCrest(meta.homeTeam)}'">
              <span class="font-bold text-xs sm:text-sm leading-snug break-words [overflow-wrap:anywhere] min-w-0 line-clamp-2" style="color: var(--text-main);">${escapeHtml(meta.homeTeam)}</span>
            </div>
            <span class="font-mono text-xs font-bold px-2 py-0.5 rounded border shrink-0 bg-black/5 dark:bg-white/5 border-slate-200 dark:border-slate-800"
                  style="color: var(--text-muted);">
              ${meta.homeEloInt}
            </span>
          </div>

          <!-- Team 2 -->
          <div class="flex items-center justify-between gap-2 min-w-0">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <span class="w-6 shrink-0 font-mono text-[10.5px] font-bold opacity-50 text-left inline-block" style="color: var(--text-muted);">
                #${meta.awayRank}
              </span>
              <img src="${meta.awayLogo}" alt="${meta.awayTeam}"
                   class="w-7 h-7 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-2xs"
                   onerror="this.onerror=null; this.src='${getTeamFallbackCrest(meta.awayTeam)}'">
              <span class="font-bold text-xs sm:text-sm leading-snug break-words [overflow-wrap:anywhere] min-w-0 line-clamp-2" style="color: var(--text-main);">${escapeHtml(meta.awayTeam)}</span>
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
            <span class="text-emerald-700 dark:text-emerald-400 font-extrabold">${Math.round(meta.winProbHome)}%</span>
            <span class="text-[9px] uppercase tracking-wider opacity-70 font-sans font-semibold" style="color: var(--text-muted);">
              Probabilità H2H
            </span>
            <span class="text-rose-700 dark:text-rose-400 font-extrabold">${100 - Math.round(meta.winProbHome)}%</span>
          </div>
          <div class="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-700/40">
            <div style="width: ${meta.winProbHome}%;" class="h-full bg-emerald-500"></div>
            <div style="width: ${meta.winProbAway}%;" class="h-full bg-rose-500"></div>
          </div>

          <!-- 1X2 Match Odds Board (Davidson Model) -->
          <div class="grid grid-cols-3 gap-1.5 pt-1 text-center select-none font-mono">
            <div class="py-1 px-1 rounded-xl border flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/5 shadow-2xs"
                 style="border-color: var(--input-border);">
              <span class="text-[9px] font-bold opacity-60" style="color: var(--text-muted);">1</span>
              <span class="text-xs font-black text-emerald-600 dark:text-emerald-400">${meta.odds.q1.toFixed(2)}</span>
            </div>
            <div class="py-1 px-1 rounded-xl border flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/5 shadow-2xs"
                 style="border-color: var(--input-border);">
              <span class="text-[9px] font-bold opacity-60" style="color: var(--text-muted);">X</span>
              <span class="text-xs font-black text-amber-600 dark:text-amber-400">${meta.odds.qX.toFixed(2)}</span>
            </div>
            <div class="py-1 px-1 rounded-xl border flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/5 shadow-2xs"
                 style="border-color: var(--input-border);">
              <span class="text-[9px] font-bold opacity-60" style="color: var(--text-muted);">2</span>
              <span class="text-xs font-black text-rose-600 dark:text-rose-400">${meta.odds.q2.toFixed(2)}</span>
            </div>
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

  return renderNodeToCanvas(exportCard, 1040, exportBg);
}

/**
 * Renders High-Definition Vertical 9:16 Story for Next Round (Prossimo Turno) Duels & Odds
 * Features a balanced 4x2 grid of 7 duel cards + 1 round overview tile with zero truncations.
 */
export async function renderNextRoundStoryCanvas(
  customLiveData?: LiveSeasonDetails
): Promise<HTMLCanvasElement> {
  let liveData = customLiveData || getLiveSeasonDetails() || getCachedNextRoundLiveData();
  if (!liveData) {
    liveData = await loadLiveSeasonDetails();
  }
  if (!liveData) {
    throw new Error('Dati live season non disponibili per la generazione della story');
  }

  const nextRound = findUpcomingRound(liveData);
  if (!nextRound || !nextRound.matches || nextRound.matches.length === 0) {
    throw new Error('Nessun prossimo turno disponibile per la generazione della story');
  }

  const matches = nextRound.matches.filter(m => !m.isPlayed);
  if (matches.length === 0) {
    throw new Error('Tutte le partite del turno risultano già giocate');
  }

  const mode = getEloMode();
  const modeLabel = mode === 'flat' ? '⚡ Elo Puro (1500)' : mode === 'historical' ? '🏛️ Elo Storico' : '🔮 Atlas Power';
  const totalTeams = liveData.standings?.length || 14;
  const leagueCtx = buildLeagueDistributionContext(liveData.standings || [], mode, liveData.season);

  const { container, contentBox } = createStoryContainer(
    `Prossimo Turno • G${nextRound.roundNumber}`,
    `Stagione ${liveData.season || 'Live'}`
  );

  // Compute round overview stats: Big Match, Closest Duel, and Average Elo Gap (Squilibrio Medio)
  let totalEloGap = 0;
  let bigMatchMeta: any = null;
  let maxCombinedElo = -1;
  let closestMatchMeta: any = null;
  let minProbDiff = 100;

  const matchMetas = matches.map((m: any, idx: number) => {
    const meta = resolveMatchupMetrics(m, idx, liveData, mode, totalTeams, leagueCtx);
    totalEloGap += Math.abs(meta.homeElo - meta.awayElo);

    const combinedElo = meta.homeElo + meta.awayElo;
    if (combinedElo > maxCombinedElo) {
      maxCombinedElo = combinedElo;
      bigMatchMeta = meta;
    }

    const probDiff = Math.abs(meta.winProbHome - meta.winProbAway);
    if (probDiff < minProbDiff) {
      minProbDiff = probDiff;
      closestMatchMeta = meta;
    }

    return meta;
  });

  const avgEloGap = matches.length > 0 ? Math.round(totalEloGap / matches.length) : 0;

  // Build the 7 Duel Cards (Zero Truncation, single line)
  const cardsHTML = matchMetas.map((meta: any, idx: number) => {
    return `
      <div class="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-3.5 flex flex-col justify-between shadow-lg">
        <!-- Card Top Bar: Duel Number & Clima Badge -->
        <div class="flex items-center justify-between text-[11px] font-mono pb-1.5 mb-1.5 border-b border-slate-800/80">
          <span class="text-[10px] uppercase font-extrabold tracking-wider text-amber-400">DUELLO #${idx + 1}</span>
          <span class="inline-flex items-center gap-1 text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap leading-none ${meta.clima.badgeClass}">
            ${meta.clima.label}
          </span>
        </div>

        <!-- Teams Section (Balanced 2-line wrap, no overflow) -->
        <div class="space-y-1.5">
          <!-- Team 1 -->
          <div class="flex items-center justify-between gap-2 py-0.5 min-w-0">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="w-5 shrink-0 font-mono text-[10px] font-bold text-slate-400">#${meta.homeRank}</span>
              <img src="${meta.homeLogo}" alt="${meta.homeTeam}" class="w-6 h-6 rounded-full object-contain shrink-0 bg-white/10 border border-slate-700 shadow-xs" onerror="this.onerror=null; this.src='favicon-64x64.png'">
              <span class="font-bold text-xs leading-snug break-words [overflow-wrap:anywhere] min-w-0 line-clamp-2 text-white">${escapeHtml(meta.homeTeam)}</span>
            </div>
            <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded border border-slate-700/60 bg-slate-800/70 text-slate-300 shrink-0">
              ${meta.homeEloInt}
            </span>
          </div>

          <!-- Team 2 -->
          <div class="flex items-center justify-between gap-2 py-0.5 min-w-0">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="w-5 shrink-0 font-mono text-[10px] font-bold text-slate-400">#${meta.awayRank}</span>
              <img src="${meta.awayLogo}" alt="${meta.awayTeam}" class="w-6 h-6 rounded-full object-contain shrink-0 bg-white/10 border border-slate-700 shadow-xs" onerror="this.onerror=null; this.src='favicon-64x64.png'">
              <span class="font-bold text-xs leading-snug break-words [overflow-wrap:anywhere] min-w-0 line-clamp-2 text-white">${escapeHtml(meta.awayTeam)}</span>
            </div>
            <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded border border-slate-700/60 bg-slate-800/70 text-slate-300 shrink-0">
              ${meta.awayEloInt}
            </span>
          </div>
        </div>

        <!-- Duel Probability Bar with Integrated Percentages -->
        <div class="pt-2 border-t border-slate-800/80 flex flex-col gap-1 mt-1">
          <div class="flex items-center justify-between text-[11px] font-mono font-black">
            <span class="text-emerald-400 font-bold">${Math.round(meta.winProbHome)}%</span>
            <span class="text-[8px] uppercase tracking-wider text-slate-400 font-sans font-semibold">Probabilità H2H</span>
            <span class="text-rose-400 font-bold">${100 - Math.round(meta.winProbHome)}%</span>
          </div>
          <div class="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-800">
            <div style="width: ${meta.winProbHome}%;" class="h-full bg-emerald-500"></div>
            <div style="width: ${meta.winProbAway}%;" class="h-full bg-rose-500"></div>
          </div>

          <!-- 1X2 Odds Board (Davidson Model) -->
          <div class="grid grid-cols-3 gap-1 pt-1 text-center font-mono select-none">
            <div class="py-0.5 px-1 rounded-lg border border-slate-700/50 bg-slate-800/40 flex items-center justify-center gap-1">
              <span class="text-[8px] font-bold text-slate-400">1</span>
              <span class="text-[11px] font-black text-emerald-400">${meta.odds.q1.toFixed(2)}</span>
            </div>
            <div class="py-0.5 px-1 rounded-lg border border-slate-700/50 bg-slate-800/40 flex items-center justify-center gap-1">
              <span class="text-[8px] font-bold text-slate-400">X</span>
              <span class="text-[11px] font-black text-amber-400">${meta.odds.qX.toFixed(2)}</span>
            </div>
            <div class="py-0.5 px-1 rounded-lg border border-slate-700/50 bg-slate-800/40 flex items-center justify-center gap-1">
              <span class="text-[8px] font-bold text-slate-400">2</span>
              <span class="text-[11px] font-black text-rose-400">${meta.odds.q2.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 8th Slot: Round Overview Stats Tile
  const roundStatsHTML = `
    <div class="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-transparent p-3.5 flex flex-col justify-between shadow-lg">
      <div class="flex items-center justify-between text-[11px] font-mono pb-1.5 mb-1 border-b border-amber-500/20">
        <span class="text-[10px] uppercase font-extrabold tracking-wider text-amber-400">📊 STATS PRE-MATCH</span>
        <span class="text-[9px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md">TURNO ${nextRound.roundNumber}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-center py-1 flex-1 items-center">
        <div class="p-2 rounded-xl bg-slate-950/40 border border-slate-800">
          <div class="text-[9px] uppercase font-bold text-slate-400">Squilibrio Medio</div>
          <div class="text-xl font-mono font-black text-sky-400">±${avgEloGap}<span class="text-xs text-slate-400 font-bold ml-1">pts</span></div>
        </div>
        <div class="p-2 rounded-xl bg-slate-950/40 border border-slate-800">
          <div class="text-[9px] uppercase font-bold text-slate-400">Modalità</div>
          <div class="text-xs font-sport font-black text-amber-400 truncate mt-1">${modeLabel}</div>
        </div>
      </div>
      ${bigMatchMeta ? `
        <div class="text-[10.5px] text-center text-slate-300 border-t border-slate-800/60 pt-1.5 truncate">
          🔥 Big Match: <strong class="text-white">${bigMatchMeta.homeTeam} vs ${bigMatchMeta.awayTeam}</strong>
        </div>
      ` : ''}
    </div>
  `;

  contentBox.innerHTML = `
    <!-- Top Hero -->
    <div class="w-full flex flex-col items-center text-center">
      <div class="flex items-center gap-2 px-4 py-4 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
        <span>⚽ QUOTE PRE-MATCH &amp; DUELLI</span>
      </div>
      <h1 class="font-sport font-black text-5xl uppercase tracking-wider text-white">
        Giornata ${nextRound.roundNumber}
      </h1>
      <p class="text-sm text-slate-400 font-bold mt-1">
        ${LEAGUE.brand.championshipLabel || 'Serie Atlas'} • Previsioni Elo &amp; Modello Bradley-Terry H2H &amp; Davidson Odds Ibrido 1X2
      </p>
    </div>

    <!-- 2-Column Duel Cards Grid (4x2 Balanced Layout) -->
    <div class="grid grid-cols-2 gap-3.5 w-full my-2">
      ${cardsHTML}
      ${roundStatsHTML}
    </div>

    <!-- Highlights Row: 2 Rich Structured Cards -->
    <div class="grid grid-cols-2 gap-3.5 w-full">
      <!-- Big Match Card -->
      <div class="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-slate-900/60 to-transparent flex items-center gap-3.5 shadow-lg">
        <div class="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">
          🔥
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[10px] uppercase font-black text-amber-400 tracking-wider">BIG MATCH DEL TURNO</div>
          <div class="font-bold text-sm text-white truncate">${bigMatchMeta ? `${bigMatchMeta.homeTeam} vs ${bigMatchMeta.awayTeam}` : '-'}</div>
          <div class="text-xs font-mono font-bold text-amber-300 mt-0.5">
            ${bigMatchMeta ? `Elo combinato: ${(bigMatchMeta.homeElo + bigMatchMeta.awayElo).toFixed(0)} pt` : ''}
          </div>
        </div>
      </div>

      <!-- Closest Match Card -->
      <div class="p-4 rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-500/15 via-slate-900/60 to-transparent flex items-center gap-3.5 shadow-lg">
        <div class="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl shrink-0">
          ⚖️
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[10px] uppercase font-black text-cyan-300 tracking-wider">DUELLO PIÙ EQUILIBRATO</div>
          <div class="font-bold text-sm text-white truncate">${closestMatchMeta ? `${closestMatchMeta.homeTeam} vs ${closestMatchMeta.awayTeam}` : '-'}</div>
          <div class="text-xs font-mono font-bold text-cyan-300 mt-0.5">
            ${closestMatchMeta ? `H2H: ${Math.round(closestMatchMeta.winProbHome)}% - ${100 - Math.round(closestMatchMeta.winProbHome)}%` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  return renderNodeToCanvas(container, 1080, '#030712', 1.5, 1920);
}
