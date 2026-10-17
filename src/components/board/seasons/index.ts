import { state } from '@/state';
import { LEAGUE } from '@/config';
import { getAvailableSeasons, renderSeasonStepper, renderSeasonHeaderSummary } from './seasonSelector';
import { renderChampionshipTable } from './standingsTable';
import { renderOtherTournamentsSection } from './tournamentCards';

export * from './seasonSelector';
export * from './standingsTable';
export * from './tournamentCards';

import { renderRecordsTab } from '@/components/board/records';

let currentSelectedSeason: string | null = null;

export function getCurrentSelectedSeason(): string | null {
  return currentSelectedSeason;
}

export function setCurrentSelectedSeason(season: string | null): void {
  currentSelectedSeason = season ? season.replace('-', '/') : null;
}

/**
 * Switches the main view between Albo d'Oro, Archivio Stagioni & Classifiche, and Record & Primati Storici
 */
export function switchMainViewTab(tab: 'albo' | 'seasons' | 'records', updateHistory = true): void {
  const alboContent = document.getElementById('main-tab-albo-content');
  const seasonsContent = document.getElementById('main-tab-seasons-content');
  const recordsContent = document.getElementById('main-tab-records-content');

  const btnAlbo = document.getElementById('main-tab-btn-albo');
  const btnSeasons = document.getElementById('main-tab-btn-seasons');
  const btnRecords = document.getElementById('main-tab-btn-records');

  const activeBtnClass =
    'flex-1 sm:flex-initial justify-center sm:justify-start px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm bg-amber-500 text-slate-950 font-black';
  const inactiveBtnClass =
    'flex-1 sm:flex-initial justify-center sm:justify-start px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1.5 border border-transparent';

  // Reset all buttons
  [btnAlbo, btnSeasons, btnRecords].forEach(btn => {
    if (btn) {
      btn.className = inactiveBtnClass;
      btn.style.color = 'var(--text-main)';
    }
  });

  // Hide all content containers
  alboContent?.classList.add('hidden');
  seasonsContent?.classList.add('hidden');
  recordsContent?.classList.add('hidden');

  if (tab === 'albo') {
    alboContent?.classList.remove('hidden');
    if (btnAlbo) {
      btnAlbo.className = activeBtnClass;
      btnAlbo.style.color = '#020617';
    }
  } else if (tab === 'seasons') {
    seasonsContent?.classList.remove('hidden');
    if (btnSeasons) {
      btnSeasons.className = activeBtnClass;
      btnSeasons.style.color = '#020617';
    }
    renderSeasonsArchive();
  } else if (tab === 'records') {
    recordsContent?.classList.remove('hidden');
    if (btnRecords) {
      btnRecords.className = activeBtnClass;
      btnRecords.style.color = '#020617';
    }
    renderRecordsTab();
  }

  // Synchronize browser URL and history
  if (updateHistory && typeof window !== 'undefined' && window.location) {
    try {
      const url = new URL(window.location.href);
      if (tab === 'albo') {
        url.searchParams.delete('tab');
        url.searchParams.delete('season');
        url.searchParams.delete('record');
        url.searchParams.delete('category');
        url.searchParams.delete('cat');
      } else if (tab === 'seasons') {
        url.searchParams.set('tab', 'seasons');
        url.searchParams.delete('record');
        url.searchParams.delete('category');
        url.searchParams.delete('cat');
        if (currentSelectedSeason) {
          url.searchParams.set('season', currentSelectedSeason.replace('/', '-'));
        }
      } else if (tab === 'records') {
        url.searchParams.set('tab', 'records');
        url.searchParams.delete('season');
      }

      if (url.search !== window.location.search) {
        window.history.pushState({ tab, season: currentSelectedSeason }, '', url.toString());
      }
    } catch {
      // Ignored in non-standard / mocked environments
    }
  }
}

/**
 * Sets active archive season and updates view
 */
export function selectArchiveSeason(season: string, updateHistory = true): void {
  currentSelectedSeason = season.replace('-', '/');
  renderSeasonsArchive();

  if (updateHistory && typeof window !== 'undefined' && window.location) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'seasons');
      url.searchParams.set('season', currentSelectedSeason.replace('/', '-'));
      window.history.replaceState({ tab: 'seasons', season: currentSelectedSeason }, '', url.toString());
    } catch {
      // Ignored in non-standard / mocked environments
    }
  }
}

/**
 * Navigates directly from a Record / external link to a season's standings table,
 * scrolls smoothly into view, and highlights the relevant manager row.
 */
export function navigateToSeasonStandings(season: string, highlightManagerId?: string, event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  // Close trophy modal if open
  if (typeof window !== 'undefined' && (window as unknown as { closeTrophyModal?: (updateHistory?: boolean) => void }).closeTrophyModal) {
    (window as unknown as { closeTrophyModal: (updateHistory?: boolean) => void }).closeTrophyModal(false);
  }

  // 1. Switch to Seasons tab and select season
  switchMainViewTab('seasons', true);
  selectArchiveSeason(season, true);

  // 2. Smoothly scroll to the championship standings table and apply highlight pulse
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    requestAnimationFrame(() => {
      const targetRow = highlightManagerId
        ? (document.querySelector(`tr[data-manager-id="${highlightManagerId}"]`) as HTMLElement | null)
        : null;

      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetRow.classList.remove('highlight-row-pulse');
        void targetRow.offsetWidth;
        targetRow.classList.add('highlight-row-pulse');
        setTimeout(() => {
          targetRow.classList.remove('highlight-row-pulse');
        }, 2500);
      } else {
        const standingsWrapper = document.querySelector('.albo-table-wrap') as HTMLElement | null;
        if (standingsWrapper) {
          standingsWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }
}

/**
 * Renders the full seasonal tournament archive view
 */
export function renderSeasonsArchive(): void {
  const container = document.getElementById('main-tab-seasons-content');
  if (!container) return;

  const seasons = getAvailableSeasons();
  if (seasons.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-sm font-bold opacity-60 italic">
        Nessun dato sulle stagioni archiviato.
      </div>
    `;
    return;
  }

  if (!currentSelectedSeason || !seasons.includes(currentSelectedSeason)) {
    currentSelectedSeason = seasons[0];
  }

  // Competitions in current season
  const comps = (state.competitions || []).filter(c => c.season === currentSelectedSeason);

  // Separate into Championship vs Other tournaments
  const champLabel = LEAGUE.brand.championshipLabel || '';
  const champRegex = champLabel ? new RegExp(champLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
  const championship = comps.find(c => c.category === 'championship' || (champRegex && champRegex.test(c.name)) || /campionato|serie/i.test(c.name));
  const otherTournaments = comps.filter(c => c !== championship);

  // Unified Season Header & Stepper Summary
  const totalTeams = championship?.ranking?.length || comps[0]?.ranking?.length || 0;
  const isSeasonInProgress = comps.some(c => c.in_progress || c.status === 'in_progress');
  const stepperHtml = renderSeasonStepper(seasons, currentSelectedSeason);
  const seasonSummaryHtml = renderSeasonHeaderSummary(currentSelectedSeason, comps.length, totalTeams, isSeasonInProgress, stepperHtml);

  // Render Championship Standings Table
  const championshipHtml = championship ? renderChampionshipTable(championship) : '';

  // Render Other Tournaments (Cups, Supercups, Mundialito, Playout)
  const othersHtml = renderOtherTournamentsSection(otherTournaments);

  container.innerHTML = `
    <!-- Unified Season Header & Stepper -->
    ${seasonSummaryHtml}

    <!-- Championship Standings -->
    ${championshipHtml}

    <!-- Other Competitions Grid -->
    ${othersHtml}
  `;
}

// Global window assignments for inline HTML handlers
if (typeof window !== 'undefined') {
  (window as unknown as { switchMainViewTab?: typeof switchMainViewTab }).switchMainViewTab = switchMainViewTab;
  (window as unknown as { selectArchiveSeason?: typeof selectArchiveSeason }).selectArchiveSeason = selectArchiveSeason;
  (window as unknown as { renderSeasonsArchive?: typeof renderSeasonsArchive }).renderSeasonsArchive = renderSeasonsArchive;
  (window as unknown as { navigateToSeasonStandings?: typeof navigateToSeasonStandings }).navigateToSeasonStandings = navigateToSeasonStandings;

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const seasonsTab = document.getElementById('main-tab-seasons-content');
      const isSeasonsActive = seasonsTab && !seasonsTab.classList.contains('hidden');
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '');
      const isAnyModalOpen = document.querySelector('.modal:not(.hidden), [id$="-modal"]:not(.hidden)');
      if (isSeasonsActive && !isInputActive && !isAnyModalOpen) {
        const seasons = getAvailableSeasons();
        const current = getCurrentSelectedSeason();
        if (current && seasons.length > 0) {
          const idx = seasons.indexOf(current);
          if (e.key === 'ArrowLeft' && idx > 0) {
            selectArchiveSeason(seasons[idx - 1]);
          } else if (e.key === 'ArrowRight' && idx < seasons.length - 1) {
            selectArchiveSeason(seasons[idx + 1]);
          }
        }
      }
    });
  }
}

