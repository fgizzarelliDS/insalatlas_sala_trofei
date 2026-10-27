/**
 * src/components/board/seasons/NextRoundStrip.ts
 * Next Round Matchday Component for InsalAtlas:
 * - Option C: Collapsible Accordion Banner above standings table with educational guide.
 * Features team crests, tactical clima badges, clean team names with integer Elo pills,
 * and an integrated two-color duel Win Probability Gauge (Bradley-Terry).
 * Clicking any matchup opens the Head-to-Head comparator modal with the two managers.
 */

import type { LiveSeasonDetails } from '@/types';
import type { EloTrackMode } from '@/types/analytics';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import {
  getEloMode,
  getManagerEloTrack,
  computeEloWinProbability
} from '@/analytics/analyticsCore';
import { escapeHtml } from '@/utils/dom';

let cachedLiveData: LiveSeasonDetails | null = null;
let isNextRoundExpanded = false;
let isNextRoundGuideExpanded = false;

/**
 * Toggles the accordion state for the Next Round section (Option C)
 */
export function toggleNextRoundAccordion(): void {
  isNextRoundExpanded = !isNextRoundExpanded;
  const content = document.getElementById('next-round-accordion-content');
  const chevron = document.getElementById('next-round-chevron');
  const toggleText = document.getElementById('next-round-toggle-text');
  const guideBtn = document.getElementById('btn-next-round-guide-toggle');

  if (content) {
    if (isNextRoundExpanded) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  }

  // Guide toggle button is only visible when duels are exposed
  if (guideBtn) {
    if (isNextRoundExpanded) {
      guideBtn.classList.remove('hidden');
      guideBtn.classList.add('flex');
    } else {
      guideBtn.classList.add('hidden');
      guideBtn.classList.remove('flex');
    }
  }

  // Auto-collapse guide box when duels are hidden
  if (!isNextRoundExpanded && isNextRoundGuideExpanded) {
    isNextRoundGuideExpanded = false;
    const guide = document.getElementById('next-round-guide-box');
    const guideChevron = document.getElementById('next-round-guide-chevron');
    if (guide) guide.classList.add('hidden');
    if (guideChevron) guideChevron.style.transform = 'rotate(0deg)';
  }

  if (chevron) {
    chevron.style.transform = isNextRoundExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
  }

  if (toggleText) {
    toggleText.textContent = isNextRoundExpanded ? 'Nascondi' : 'Mostra Duelli';
  }
}

/**
 * Toggles the educational guide box for the Next Round section
 */
export function toggleNextRoundGuide(event?: Event): void {
  if (event) {
    event.stopPropagation();
  }
  isNextRoundGuideExpanded = !isNextRoundGuideExpanded;
  const guide = document.getElementById('next-round-guide-box');
  const chevron = document.getElementById('next-round-guide-chevron');

  if (guide) {
    if (isNextRoundGuideExpanded) {
      guide.classList.remove('hidden');
    } else {
      guide.classList.add('hidden');
    }
  }

  if (chevron) {
    chevron.style.transform = isNextRoundGuideExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

/**
 * Renders the Bradley-Terry mathematical formula in crisp, native HTML/CSS
 */
export function renderBradleyTerryFormulaHTML(): string {
  return `
    <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-1.5 px-3 text-xs sm:text-sm font-sport select-none" style="color: var(--text-main);">
      <!-- P_A Formula -->
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded-md font-mono font-black text-xs sm:text-sm bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shrink-0 shadow-2xs">P<sub>A</sub></span>
        <span class="opacity-70 font-mono text-sm font-bold" style="color: var(--text-main);">=</span>
        <div class="inline-flex flex-col items-center justify-center font-mono">
          <span class="px-2 font-bold text-xs sm:text-sm leading-tight" style="color: var(--text-main);">1</span>
          <span class="w-full border-t border-slate-400 dark:border-slate-500 my-0.5 opacity-60"></span>
          <span class="px-2 font-bold text-xs sm:text-sm leading-tight flex items-center" style="color: var(--text-main);">
            1 + 10<sup class="text-[9.5px] sm:text-[10.5px] ml-1 font-bold tracking-tight inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">(<span class="text-rose-700 dark:text-rose-400 font-extrabold">R<sub>B</sub></span> - <span class="text-emerald-700 dark:text-emerald-400 font-extrabold">R<sub>A</sub></span>)<span class="text-amber-800 dark:text-amber-300 font-black">/400</span></sup>
          </span>
        </div>
      </div>

      <span class="opacity-30 hidden sm:inline text-xs font-mono">•</span>

      <!-- P_B Formula -->
      <div class="flex items-center gap-2 font-mono text-xs sm:text-sm">
        <span class="px-2 py-0.5 rounded-md font-mono font-black text-xs sm:text-sm bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30 shrink-0 shadow-2xs">P<sub>B</sub></span>
        <span class="opacity-70 font-mono text-sm font-bold" style="color: var(--text-main);">=</span>
        <span class="font-bold font-mono text-xs sm:text-sm" style="color: var(--text-main);">1.0 - <span class="text-emerald-700 dark:text-emerald-400 font-black">P<sub>A</sub></span></span>
      </div>
    </div>
  `;
}

/**
 * Builds the HTML markup for the educational Next Round guide box
 */
export function buildNextRoundGuideHTML(): string {
  return `
    <!-- Collapsible Educational Guide Box for Next Round Probabilities & Categories (Shown inside exposed area) -->
    <div id="next-round-guide-box" class="${isNextRoundGuideExpanded ? '' : 'hidden'} rounded-2xl border p-3.5 sm:p-4 text-xs transition-all space-y-3.5 mb-3.5 shadow-2xs"
         style="border-color: var(--table-border); background-color: var(--modal-bg);">
      
      <!-- Header Info & Official Methodology Label -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-[var(--table-border)]/60">
        <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
          <i class="fa-solid fa-circle-info text-sm"></i>
          <span>Guida Duelli &amp; Previsioni Bradley-Terry</span>
        </div>
        <span class="text-[11px] font-medium leading-snug" style="color: var(--text-main); opacity: 0.85;">
          Previsioni probabilistiche calcolate dal modello Elo Bradley-Terry prima del calcio d'inizio.
        </span>
      </div>

      <!-- Mathematical Formula & /400 Scaling Explanation Card (Theme-Adaptive Surfaces, Zero Muddy Washes) -->
      <div class="p-3 sm:p-3.5 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 overflow-hidden shadow-2xs"
           style="border-color: var(--table-border); background-color: var(--table-surface);">
        
        <!-- Left: Crisp Native Formula (High Contrast, Responsive, No Overflow) -->
        <div class="space-y-2 min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-extrabold text-xs tracking-wide" style="color: var(--text-main);">
              Formula Curva Logistica di Bradley-Terry
            </span>
            <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border"
                  style="border-color: var(--input-border); background-color: var(--input-bg); color: var(--text-muted);">
              Base 10 • Scala 400
            </span>
          </div>
          
          <div class="p-2.5 sm:p-3 rounded-xl border shadow-inner overflow-x-auto"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            ${renderBradleyTerryFormulaHTML()}
          </div>

          <div class="flex items-center gap-1.5 text-[10.5px] opacity-85 leading-snug" style="color: var(--text-main);">
            <i class="fa-solid fa-circle-check text-emerald-700 dark:text-emerald-400 text-xs shrink-0"></i>
            <span>Se due squadre hanno rating identico (<strong class="font-mono">R<sub>A</sub> = R<sub>B</sub></strong>) entrambe partono con il <strong>50%</strong> di probabilità stimata.</span>
          </div>
        </div>

        <!-- Right: Shortened Scaling Explanation -->
        <div class="p-2.5 sm:p-3 rounded-xl border text-[11px] leading-relaxed lg:max-w-xs shrink-0 flex flex-col justify-center shadow-2xs"
             style="background-color: var(--input-bg); border-color: var(--input-border);">
          <div class="font-extrabold text-amber-800 dark:text-amber-300 text-xs mb-1 flex items-center gap-1.5">
            <span class="w-5 h-5 rounded-md flex items-center justify-center bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] shrink-0 border border-amber-500/30">
              <i class="fa-solid fa-scale-balanced"></i>
            </span>
            <span>Fattore di Scala (400)</span>
          </div>
          <p class="text-[10px] sm:text-[10.5px] opacity-90 leading-snug" style="color: var(--text-main);">
            Costante classica Elo: a <strong class="text-amber-800 dark:text-amber-300 font-bold">+400 pt</strong> il rapporto di forza è <strong>10 a 1</strong> (~91% vs 9%). Con <strong class="text-amber-800 dark:text-amber-300 font-bold">+200 pt</strong> sale a <strong>~76%</strong>, con <strong class="text-amber-800 dark:text-amber-300 font-bold">+100 pt</strong> a <strong>~64%</strong>.
          </p>
        </div>
      </div>

      <!-- Clima Match Categories Legend (Theme Harmonious Equal Sized Boxes) -->
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-75" style="color: var(--text-muted);">
          Legenda Categorie Clima Match &amp; Contesto Tattico
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          <!-- 1. AL VERTICE -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">🔥</span>
            <div>
              <div class="font-extrabold text-amber-700 dark:text-amber-400 text-xs tracking-wide">AL VERTICE</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Scontro d'alta classifica: entrambe in Top 3 o con rating di prima fascia (&ge; 1525).</div>
            </div>
          </div>

          <!-- 2. TESTACODA -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">↕️</span>
            <div>
              <div class="font-extrabold text-purple-700 dark:text-purple-400 text-xs tracking-wide">TESTACODA</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Sfida asimmetrica tra estremi: una squadra della Top 3 affronta una delle ultime 3.</div>
            </div>
          </div>

          <!-- 3. TRAPPOLA -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">⚠️</span>
            <div>
              <div class="font-extrabold text-rose-700 dark:text-rose-400 text-xs tracking-wide">TRAPPOLA</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Allerta insidia: elevato dislivello Elo (&ge; 50 pt) o stima estrema (&ge; 65% / &le; 35%).</div>
            </div>
          </div>

          <!-- 4. SUL FILO -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">⚖️</span>
            <div>
              <div class="font-extrabold text-teal-700 dark:text-cyan-400 text-xs tracking-wide">SUL FILO</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Equilibrio quasi assoluto: formazioni con gap Elo &le; 12 pt o probabilità 48.5%-51.5%.</div>
            </div>
          </div>

          <!-- 5. CORSA PLAYOFF -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">🎯</span>
            <div>
              <div class="font-extrabold text-blue-700 dark:text-blue-400 text-xs tracking-wide">CORSA PLAYOFF</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Scontro cruciale di centro classifica tra squadre in lizza piazzamento (4ª - 9ª pos).</div>
            </div>
          </div>

          <!-- 6. SALVEZZA -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">🪓</span>
            <div>
              <div class="font-extrabold text-stone-700 dark:text-stone-300 text-xs tracking-wide">SALVEZZA</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Scontro diretto rovente dei bassifondi: entrambe le formazioni nelle ultime 4 posizioni.</div>
            </div>
          </div>

          <!-- 7. DUELLO (Identical single-column dimension) -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">🥊</span>
            <div>
              <div class="font-extrabold text-slate-700 dark:text-slate-300 text-xs tracking-wide">DUELLO</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Confronto ordinario di campionato senza condizioni estreme di classifica o rating.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Computes tactical match atmosphere / context tag based on Elo and Standings
 */
export function computeMatchClima(
  homeRank: number,
  awayRank: number,
  homeElo: number,
  awayElo: number,
  winProbHome: number,
  totalTeams: number = 14
): { label: string; badgeClass: string } {
  const eloDiff = Math.abs(homeElo - awayElo);

  // 1. Testacoda: Top 3 vs Bottom 3 (using ↕️ double arrow emoji)
  if ((homeRank <= 3 && awayRank >= totalTeams - 2) || (awayRank <= 3 && homeRank >= totalTeams - 2)) {
    return {
      label: '↕️ TESTACODA',
      badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
    };
  }

  // 2. Al Vertice: both top 3 or both high elo (>= 1525)
  if ((homeRank <= 3 && awayRank <= 3) || (homeElo >= 1525.0 && awayElo >= 1525.0)) {
    return {
      label: '🔥 AL VERTICE',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    };
  }

  // 3. Salvezza: both bottom 4
  if (homeRank >= totalTeams - 3 && awayRank >= totalTeams - 3) {
    return {
      label: '🪓 SALVEZZA',
      badgeClass: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30'
    };
  }

  // 4. Trappola / Upset Alert: Elo gap >= 50 pt or extreme win prob (>= 65% or <= 35%)
  if (eloDiff >= 50.0 || winProbHome >= 65.0 || winProbHome <= 35.0) {
    return {
      label: '⚠️ TRAPPOLA',
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
    };
  }

  // 5. Sul Filo: win prob between 48.5% and 51.5% or Elo gap <= 12 pt
  if ((winProbHome >= 48.5 && winProbHome <= 51.5) || eloDiff <= 12.0) {
    return {
      label: '⚖️ SUL FILO',
      badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-cyan-300 border-teal-500/30'
    };
  }

  // 6. Corsa Playoff: mid-table clash (both in positions 4-9)
  if (homeRank >= 4 && homeRank <= 9 && awayRank >= 4 && awayRank <= 9) {
    return {
      label: '🎯 CORSA PLAYOFF',
      badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
    };
  }

  // Default: Duello
  return {
    label: '🥊 DUELLO',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
  };
}

/**
 * Finds the upcoming unplayed round in the live season
 */
export function findUpcomingRound(liveData: LiveSeasonDetails) {
  if (!liveData.rounds || liveData.rounds.length === 0) {
    return null;
  }
  // Find the first round that contains at least one unplayed match
  const upcoming = liveData.rounds.find(r => (r.matches || []).some(m => !m.isPlayed));
  return upcoming || null;
}

/**
 * Renders a single clean matchup card with team crests, names, rounded integer Elo pills, and Bradley-Terry gauge
 */
function renderMatchCard(
  m: any,
  idx: number,
  liveData: LiveSeasonDetails,
  mode: EloTrackMode,
  totalTeams: number
): string {
  const homeTeam = m.homeTeam || 'Squadra 1';
  const awayTeam = m.awayTeam || 'Squadra 2';
  const homeMgrId = m.homeManagerId || '';
  const awayMgrId = m.awayManagerId || '';

  const homeStanding = liveData.standings.find(s => s.managerId === homeMgrId || s.teamName === homeTeam);
  const awayStanding = liveData.standings.find(s => s.managerId === awayMgrId || s.teamName === awayTeam);

  const homeRank = homeStanding?.rank ?? 7;
  const awayRank = awayStanding?.rank ?? 7;

  const homeEloTrack = getManagerEloTrack(homeStanding?.elo, mode);
  const awayEloTrack = getManagerEloTrack(awayStanding?.elo, mode);

  const homeElo = homeEloTrack?.current ?? 1500.0;
  const awayElo = awayEloTrack?.current ?? 1500.0;

  const homeEloInt = Math.round(homeElo);
  const awayEloInt = Math.round(awayElo);

  let winProbHome: number;
  if (mode === 'historical' && m.winProbHomeHistorical !== undefined && m.winProbHomeHistorical !== null) {
    winProbHome = m.winProbHomeHistorical;
  } else if (mode === 'atlas' && m.winProbHomeAtlas !== undefined && m.winProbHomeAtlas !== null) {
    winProbHome = m.winProbHomeAtlas;
  } else if (m.winProbHomeFlat !== undefined && m.winProbHomeFlat !== null) {
    winProbHome = m.winProbHomeFlat;
  } else {
    winProbHome = computeEloWinProbability(homeElo, awayElo);
  }

  const winProbAway = Math.round((100.0 - winProbHome) * 10) / 10;
  const clima = computeMatchClima(homeRank, awayRank, homeElo, awayElo, winProbHome, totalTeams);

  const homeLogo = resolveTeamLogo(homeTeam, m.homeLogo);
  const awayLogo = resolveTeamLogo(awayTeam, m.awayLogo);

  return `
    <div onclick="window.openHeadToHeadModal && window.openHeadToHeadModal('${homeMgrId}', '${awayMgrId}');"
         class="p-3 rounded-2xl border transition-all duration-200 hover:scale-[1.01] hover:shadow-md cursor-pointer select-none flex flex-col justify-between gap-2.5"
         style="border-color: var(--table-border); background-color: var(--table-surface);"
         title="Analizza lo scontro diretto tra ${homeTeam} e ${awayTeam}">
      
      <!-- Header: Match Index + Clima Match Badge -->
      <div class="flex items-center justify-between gap-1 text-[10px] font-bold">
        <span class="opacity-40 text-[9px] font-mono tracking-wider" style="color: var(--text-muted);">
          MATCH ${idx + 1}
        </span>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide border flex items-center gap-1 ${clima.badgeClass}">
          <span>${clima.label}</span>
        </span>
      </div>

      <!-- Teams Rows: Crest, Name, and Clean Integer Elo Pill -->
      <div class="flex flex-col gap-2 py-0.5">
        <!-- Team 1 -->
        <div class="flex items-center justify-between gap-2 min-w-0">
          <div class="flex items-center gap-2 min-w-0 truncate">
            <span class="w-6 shrink-0 font-mono text-[10px] font-bold opacity-45 text-left inline-block" style="color: var(--text-muted);" title="Posizione attuale in classifica: #${homeRank}">
              #${homeRank}
            </span>
            <img src="${homeLogo}" alt="${homeTeam}"
                 class="w-6 h-6 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-xs"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(homeTeam)}'">
            <span class="font-bold text-xs sm:text-sm leading-snug truncate" style="color: var(--text-main);">${escapeHtml(homeTeam)}</span>
          </div>
          <span class="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 bg-black/5 dark:bg-white/5 border-slate-200 dark:border-slate-800"
                style="color: var(--text-muted);"
                title="Rating Elo: ${homeEloInt} (preciso: ${homeElo.toFixed(1)})">
            ${homeEloInt}
          </span>
        </div>

        <!-- Team 2 -->
        <div class="flex items-center justify-between gap-2 min-w-0">
          <div class="flex items-center gap-2 min-w-0 truncate">
            <span class="w-6 shrink-0 font-mono text-[10px] font-bold opacity-45 text-left inline-block" style="color: var(--text-muted);" title="Posizione attuale in classifica: #${awayRank}">
              #${awayRank}
            </span>
            <img src="${awayLogo}" alt="${awayTeam}"
                 class="w-6 h-6 rounded-full object-contain shrink-0 bg-white/10 border border-slate-300 dark:border-slate-700 shadow-xs"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(awayTeam)}'">
            <span class="font-bold text-xs sm:text-sm leading-snug truncate" style="color: var(--text-main);">${escapeHtml(awayTeam)}</span>
          </div>
          <span class="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 bg-black/5 dark:bg-white/5 border-slate-200 dark:border-slate-800"
                style="color: var(--text-muted);"
                title="Rating Elo: ${awayEloInt} (preciso: ${awayElo.toFixed(1)})">
            ${awayEloInt}
          </span>
        </div>
      </div>

      <!-- Duel Probability Bar with Integrated Percentages -->
      <div class="pt-2 border-t border-[var(--table-border)]/50 flex flex-col gap-1">
        <div class="flex items-center justify-between text-[11px] font-mono font-black">
          <span class="text-emerald-500 dark:text-emerald-400">${winProbHome.toFixed(0)}%</span>
          <span class="text-[8px] uppercase tracking-wider opacity-60 font-sans font-semibold" style="color: var(--text-muted);">
            Probabilità Vittoria
          </span>
          <span class="text-rose-500 dark:text-rose-400">${winProbAway.toFixed(0)}%</span>
        </div>
        <div class="w-full h-2 rounded-full overflow-hidden flex bg-slate-700/40">
          <div style="width: ${winProbHome}%;" class="h-full bg-emerald-500 transition-all duration-300"></div>
          <div style="width: ${winProbAway}%;" class="h-full bg-rose-500 transition-all duration-300"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Option C: Generates the HTML markup for the collapsible accordion banner above standings table
 * Styled discreetly to integrate seamlessly without competing with the main standings table header.
 */
export function renderNextRoundStrip(liveData: LiveSeasonDetails, mode: EloTrackMode = getEloMode()): string {
  cachedLiveData = liveData;

  const nextRound = findUpcomingRound(liveData);
  if (!nextRound || !nextRound.matches || nextRound.matches.length === 0) {
    return '';
  }

  const matches = nextRound.matches.filter(m => !m.isPlayed);
  if (matches.length === 0) {
    return '';
  }

  const modeLabel = mode === 'flat' ? '⚡ Elo Puro (1500)' : mode === 'historical' ? '🏛️ Elo Storico' : '🔮 Atlas Power';
  const totalTeams = liveData.standings?.length || 14;

  const guideBoxHtml = buildNextRoundGuideHTML();
  const cardsHtml = matches.map((m, idx) => renderMatchCard(m, idx, liveData, mode, totalTeams)).join('');

  return `
    <div id="next-round-strip-container" class="mb-4 rounded-2xl border overflow-hidden shadow-2xs transition-all duration-300"
         style="border-color: var(--table-border); background-color: var(--table-surface);">
      
      <!-- Discreet Clickable Accordion Header Bar (Differentiated from Main Standings Table Header) -->
      <div onclick="window.toggleNextRoundAccordion && window.toggleNextRoundAccordion();"
           class="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 cursor-pointer select-none transition hover:bg-black/[0.03] dark:hover:bg-white/[0.03] border-b"
           style="border-color: var(--table-border); background-color: var(--table-surface); color: var(--text-main);">
        
        <!-- Left: Subtle Calendar Icon + Title + Count Badge -->
        <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs shadow-2xs shrink-0">
            <i class="fa-solid fa-calendar-day text-[11px]"></i>
          </span>
          <div class="flex items-center gap-2 truncate">
            <h3 class="font-sport font-bold text-xs sm:text-sm tracking-wide truncate" style="color: var(--text-main);">
              Prossimo Turno • Giornata ${nextRound.roundNumber}
            </h3>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0"
                  style="border-color: var(--table-border); background-color: var(--modal-bg); color: var(--text-muted);">
              ${matches.length} Duelli
            </span>
          </div>
        </div>

        <!-- Right: Guide Toggle (Visible Only Once Duels Are Exposed) + Rating Mode + Accordion Action Button -->
        <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <!-- Guide Toggle Button (i) - Displayed only when duels are exposed -->
          <button type="button"
                  id="btn-next-round-guide-toggle"
                  onclick="window.toggleNextRoundGuide && window.toggleNextRoundGuide(event);"
                  class="${isNextRoundExpanded ? 'flex' : 'hidden'} items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 cursor-pointer shadow-2xs"
                  style="border-color: var(--table-border); background-color: var(--modal-bg); color: var(--text-main);"
                  title="Guida previsioni e categorie match">
            <i class="fa-solid fa-circle-info text-amber-500 text-xs"></i>
            <span class="hidden sm:inline text-[11px]">Guida</span>
            <i id="next-round-guide-chevron" class="fa-solid fa-chevron-down text-[9px] opacity-60 transition-transform duration-200" style="transform: ${isNextRoundGuideExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
          </button>

          <div class="hidden md:flex items-center gap-1 text-[10px] font-medium" style="color: var(--text-muted);">
            <span>Rating:</span>
            <span id="next-round-mode-label" class="font-semibold text-amber-600 dark:text-amber-400">${modeLabel}</span>
          </div>

          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-2xs"
               style="border-color: var(--table-border); background-color: var(--modal-bg); color: var(--text-main);">
            <span id="next-round-toggle-text" class="text-[11px]">${isNextRoundExpanded ? 'Nascondi' : 'Mostra Duelli'}</span>
            <i id="next-round-chevron" class="fa-solid fa-chevron-down text-[10px] opacity-60 transition-transform duration-200" style="transform: ${isNextRoundExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
          </div>
        </div>
      </div>

      <!-- Collapsible Section (Option C: Guide Box + Grid Exposed Together) -->
      <div id="next-round-accordion-content" class="${isNextRoundExpanded ? '' : 'hidden'} p-3 sm:p-4 border-t"
           style="border-color: var(--table-border);">
        <!-- Educational Guide Box (Only appears once duels are exposed) -->
        ${guideBoxHtml}

        <div id="next-round-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          ${cardsHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Re-renders the Next Round strip in place when active Elo mode changes
 */
export function updateNextRoundStripUI(liveData?: LiveSeasonDetails): void {
  const container = document.getElementById('next-round-strip-container');

  const data = liveData || cachedLiveData;
  if (!data) return;

  const mode = getEloMode();

  // Update Accordion (Option C)
  if (container && container.parentElement) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderNextRoundStrip(data, mode);
    const newEl = tempDiv.firstElementChild;
    if (newEl) {
      container.parentElement.replaceChild(newEl, container);
    }
  }
}

declare global {
  interface Window {
    toggleNextRoundAccordion?: () => void;
    toggleNextRoundGuide?: (event?: Event) => void;
    updateNextRoundStripUI?: (liveData?: LiveSeasonDetails) => void;
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  window.toggleNextRoundAccordion = toggleNextRoundAccordion;
  window.toggleNextRoundGuide = toggleNextRoundGuide;
  window.updateNextRoundStripUI = updateNextRoundStripUI;
}
