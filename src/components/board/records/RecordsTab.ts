import { state } from '@/state';
import { LEAGUE } from '@/config';
import { computeAllLeagueRecords, filterRecordsByCategory } from '@/analytics/records';
import { getLeagueYearSpan } from '@/analytics/records/helpers';
import { escapeHtml } from '@/utils/dom';
import type { LeagueRecord, RecordCategory } from '@/types';
import {
  RECORD_WATERMARK_DEFAULT_OPACITY,
  getCategoryBadgeStyles,
  renderHolderLogoMarkup,
  renderRecordCard
} from './RecordsCard';

// Re-export card rendering primitives for consumers and tests
export {
  RECORD_WATERMARK_DEFAULT_OPACITY,
  getCategoryBadgeStyles,
  renderHolderLogoMarkup,
  renderRecordCard
};

/**
 * Renders the Category Filter Pills navigation bar
 */
export function renderRecordsCategoryPills(activeCategory: RecordCategory | 'all'): string {
  const categories: { id: RecordCategory | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'Tutti i Record', icon: 'fa-solid fa-sparkles' },
    { id: 'points', label: 'Punti & Podi', icon: 'fa-solid fa-bolt' },
    { id: 'titles', label: 'Dominio & Coppe', icon: 'fa-solid fa-trophy' },
    { id: 'h2h', label: 'Rivalità H2H', icon: 'fa-solid fa-skull-crossbones' },
    { id: 'streaks', label: 'Strisce & Fedeltà', icon: 'fa-solid fa-medal' },
    { id: 'banter', label: 'Disonori & Curiosità', icon: 'fa-solid fa-masks-theater' }
  ];

  const pillButtons = categories.map(cat => {
    const isActive = activeCategory === cat.id;
    return `
      <button 
        type="button" 
        onclick="filterRecordsCategory('${cat.id}')"
        class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap ${isActive
        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
        : 'border opacity-80 hover:opacity-100 hover:bg-white/5'
      }"
        style="${isActive
        ? 'color: #020617;'
        : 'border-color: var(--table-border); background-color: var(--table-surface); color: var(--text-main);'
      }"
      >
        <i class="${cat.icon} text-[11px] ${isActive ? 'text-slate-950' : 'text-amber-500 dark:text-amber-400'}"></i>
        <span>${cat.label}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 mb-4 pr-1" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
      ${pillButtons}
    </div>
  `;
}

/**
 * Filters a list of LeagueRecords by search query string
 */
export function filterRecordsBySearch(records: LeagueRecord[], query: string): LeagueRecord[] {
  if (!query || !query.trim()) return records;
  const q = query.trim().toLowerCase();
  return records.filter(rec => {
    if (rec.title.toLowerCase().includes(q)) return true;
    if (rec.description && rec.description.toLowerCase().includes(q)) return true;
    if (rec.primaryHolder.managerName.toLowerCase().includes(q)) return true;
    if (rec.primaryHolder.teamName && rec.primaryHolder.teamName.toLowerCase().includes(q)) return true;
    if (rec.primaryHolder.detail && rec.primaryHolder.detail.toLowerCase().includes(q)) return true;
    if (rec.primaryHolders && rec.primaryHolders.some(h =>
      h.managerName.toLowerCase().includes(q) || (h.teamName && h.teamName.toLowerCase().includes(q))
    )) return true;
    return false;
  });
}

/**
 * Generates empty state markup when no records match search query
 */
export function renderRecordsEmptyState(query: string): string {
  const safeQuery = escapeHtml(query);
  return `
    <div class="col-span-full py-12 px-4 text-center rounded-2xl border border-dashed border-slate-700/60 bg-black/10 dark:bg-white/5">
      <div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl">
        <i class="fa-solid fa-magnifying-glass"></i>
      </div>
      <h3 class="font-sport font-bold text-base mb-1" style="color: var(--text-main);">Nessun primato trovato</h3>
      <p class="text-xs max-w-sm mx-auto mb-4" style="color: var(--text-muted);">
        Nessun record corrisponde alla ricerca "<strong>${safeQuery}</strong>".
      </p>
      <button type="button" onclick="window.clearRecordsSearch && window.clearRecordsSearch()" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-sm cursor-pointer">
        Azzera Ricerca
      </button>
    </div>
  `;
}

/**
 * Main Template Generator for the Records & Primati Tab
 */
export function renderRecordsContentHTML(
  activeCategory: RecordCategory | 'all' = 'all',
  searchQuery: string = ''
): string {
  const allRecords = computeAllLeagueRecords(state.managers, state.competitions);
  const byCategory = filterRecordsByCategory(allRecords, activeCategory);
  const filtered = filterRecordsBySearch(byCategory, searchQuery);
  const leagueSpan = getLeagueYearSpan(state.competitions);

  const pillsHTML = renderRecordsCategoryPills(activeCategory);
  const cardsHTML = filtered.length > 0
    ? filtered.map(r => renderRecordCard(r)).join('')
    : renderRecordsEmptyState(searchQuery);

  const safeSearch = escapeHtml(searchQuery);

  return `
    <div class="space-y-4">
      <!-- Header Banner & Search -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b" style="border-color: var(--table-border);">
        <div>
          <h2 class="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2" style="color: var(--text-main);">
            <i class="fa-solid fa-medal text-amber-500"></i>
            <span>Record &amp; Primati Storici</span>
            <span id="records-counter-badge" class="text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
              ${filtered.length} Primati
            </span>
          </h2>
          <p class="text-xs" style="color: var(--text-muted);">
            I numeri, le imprese e le sventure all-time che hanno fatto la storia della ${LEAGUE.brand.championshipLabel || LEAGUE.brand.name} (${leagueSpan.spanText}).
          </p>
        </div>

        <!-- Controls: Live Search + Poster HD Export Dropdown -->
        <div class="flex items-center gap-2 w-full md:w-auto">
          <div class="relative flex-1 min-w-0 sm:w-64 md:w-72">
            <i class="fa-solid fa-magnifying-glass absolute text-xs opacity-50 pointer-events-none" style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: 0.5;"></i>
            <input 
              id="records-search-input"
              type="text"
              inputmode="search"
              autocomplete="off"
              spellcheck="false"
              value="${safeSearch}"
              placeholder="Cerca manager, club..."
              oninput="window.searchRecords && window.searchRecords(this.value)"
              class="w-full py-1.5 rounded-xl text-xs border transition focus:outline-none focus:ring-1 focus:ring-amber-500"
              style="padding-left: 2.35rem !important; padding-right: 2.25rem !important; background-color: var(--table-surface); border-color: var(--table-border); color: var(--text-main);"
            />
            <button 
              id="records-search-clear-btn"
              type="button" 
              onclick="window.clearRecordsSearch && window.clearRecordsSearch()"
              class="absolute text-xs opacity-60 hover:opacity-100 transition px-1 py-0.5 rounded cursor-pointer ${searchQuery ? '' : 'hidden'}"
              style="position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%);"
              title="Cancella ricerca"
            >✕</button>
          </div>

          <!-- Poster HD Dropdown -->
          <div class="relative shrink-0">
            <button 
              id="btn-poster-share-dropdown"
              type="button"
              onclick="window.togglePosterShareDropdown && window.togglePosterShareDropdown(event)"
              class="px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm flex items-center gap-1.5 opacity-90 hover:opacity-100 cursor-pointer"
              style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);"
              title="Esporta il poster ufficiale ad alta risoluzione con tutti i ${allRecords.length} record"
            >
              <i class="fa-solid fa-camera text-amber-500"></i>
              <span class="hidden sm:inline">Poster HD</span>
              <i class="fa-solid fa-chevron-down text-[10px] ml-0.5 opacity-70"></i>
            </button>
            <div 
              id="poster-share-dropdown-menu"
              class="hidden absolute right-0 top-full mt-1.5 w-56 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
              style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);"
            >
              <button 
                type="button"
                onclick="window.exportRecordsSummaryStoryHD && window.exportRecordsSummaryStoryHD(); window.closePosterShareDropdown && window.closePosterShareDropdown();"
                class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <i class="fa-solid fa-mobile-screen text-indigo-400"></i>
                <span>Story Top Primati (9:16)</span>
              </button>
              <button 
                type="button"
                onclick="window.exportHallOfFamePosterHD && window.exportHallOfFamePosterHD(); window.closePosterShareDropdown && window.closePosterShareDropdown();"
                class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer mt-0.5"
              >
                <i class="fa-solid fa-download text-amber-500"></i>
                <span>Scarica Poster PNG (HD)</span>
              </button>
              <button 
                type="button"
                onclick="window.copyHallOfFamePosterToClipboard && window.copyHallOfFamePosterToClipboard(); window.closePosterShareDropdown && window.closePosterShareDropdown();"
                class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <i class="fa-solid fa-copy text-emerald-500"></i>
                <span>Copia per WhatsApp</span>
              </button>
              <button 
                type="button"
                onclick="window.sharePosterWhatsApp && window.sharePosterWhatsApp(); window.closePosterShareDropdown && window.closePosterShareDropdown();"
                class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer border-t mt-1 pt-2"
                style="border-color: var(--table-border);"
              >
                <i class="fa-brands fa-whatsapp text-emerald-500"></i>
                <span>Invia Link WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Filter Pills -->
      ${pillsHTML}

      <!-- Responsive Cards Grid -->
      <div id="records-cards-container" class="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        ${cardsHTML}
      </div>
    </div>
  `;
}

/**
 * Toggles the export/share popover dropdown on a specific record card
 */
export function toggleRecordShareDropdown(recordId: string, event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const dropdown = document.getElementById(`record-share-dropdown-${recordId}`);
  if (!dropdown) return;

  const isHidden = dropdown.classList.contains('hidden');
  closeAllRecordShareDropdowns();

  if (isHidden) {
    dropdown.classList.remove('hidden');
  }
}

/**
 * Closes all open record share dropdowns (including the poster dropdown)
 */
export function closeAllRecordShareDropdowns(): void {
  document.querySelectorAll('[id^="record-share-dropdown-"]').forEach(el => {
    el.classList.add('hidden');
  });
  closePosterShareDropdown();
}

/**
 * Toggles the Poster HD share/export dropdown
 */
export function togglePosterShareDropdown(event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const dropdown = document.getElementById('poster-share-dropdown-menu');
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains('hidden');
  closeAllRecordShareDropdowns();
  if (isHidden) {
    dropdown.classList.remove('hidden');
  }
}

/**
 * Closes the Poster HD share/export dropdown
 */
export function closePosterShareDropdown(): void {
  const dropdown = document.getElementById('poster-share-dropdown-menu');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
  }
}

/**
 * Triggers export of the full Hall of Fame Poster to high-definition PNG
 */
export async function exportHallOfFamePoster(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closePosterShareDropdown();
  const { exportHallOfFamePosterHD } = await import('@/export');
  await exportHallOfFamePosterHD();
}

/**
 * Copies the full Hall of Fame Poster image to system clipboard
 */
export async function copyHallOfFamePoster(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closePosterShareDropdown();
  const { copyHallOfFamePosterToClipboard } = await import('@/export');
  await copyHallOfFamePosterToClipboard();
}

/**
 * Shares the full Hall of Fame Poster link via WhatsApp
 */
export async function shareHallOfFamePosterWhatsApp(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closePosterShareDropdown();
  const { sharePosterWhatsApp } = await import('@/export');
  sharePosterWhatsApp();
}

/**
 * Triggers export of a record card to high-definition PNG
 */
export async function exportRecordCard(recordId: string, event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closeAllRecordShareDropdowns();
  const { exportRecordCardHD } = await import('@/export');
  await exportRecordCardHD(recordId);
}

/**
 * Copies a record card image to system clipboard
 */
export async function copyRecordCard(recordId: string, event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closeAllRecordShareDropdowns();
  const { copyRecordCardToClipboard } = await import('@/export');
  await copyRecordCardToClipboard(recordId);
}

/**
 * Triggers export of an individual record card to 9:16 Instagram/WhatsApp Story
 */
export async function exportRecordStory(recordId: string, event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closeAllRecordShareDropdowns();
  const { exportRecordStoryHD } = await import('@/export');
  await exportRecordStoryHD(recordId);
}

/**
 * Triggers export of the Top Primati Hall of Fame Summary Poster to 9:16 Story
 */
export async function exportRecordsSummaryStory(event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  closePosterShareDropdown();
  const { exportRecordsSummaryStoryHD } = await import('@/export');
  await exportRecordsSummaryStoryHD();
}

// Global window registrations for inline onclick handlers
if (typeof window !== 'undefined') {
  window.toggleRecordShareDropdown = toggleRecordShareDropdown;
  window.closeAllRecordShareDropdowns = closeAllRecordShareDropdowns;
  window.togglePosterShareDropdown = togglePosterShareDropdown;
  window.closePosterShareDropdown = closePosterShareDropdown;
  window.exportHallOfFamePoster = exportHallOfFamePoster;
  window.copyHallOfFamePoster = copyHallOfFamePoster;
  window.shareHallOfFamePosterWhatsApp = shareHallOfFamePosterWhatsApp;
  window.exportRecordCard = exportRecordCard;
  window.copyRecordCard = copyRecordCard;
  window.exportRecordStory = exportRecordStory;
  window.exportRecordsSummaryStory = exportRecordsSummaryStory;
  window.exportRecordStoryHD = exportRecordStory;
  window.exportRecordsSummaryStoryHD = exportRecordsSummaryStory;
}
