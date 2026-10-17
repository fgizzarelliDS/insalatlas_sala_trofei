import { state } from '@/state';
import { LEAGUE } from '@/config';

/**
 * Returns distinct seasons sorted descending chronologically (e.g. 2025/26 down to 2016/17)
 */
export function getAvailableSeasons(): string[] {
  if (!state.competitions || state.competitions.length === 0) return [];
  const seasonsSet = new Set<string>();
  state.competitions.forEach(c => {
    if (c.season) seasonsSet.add(c.season);
  });
  return Array.from(seasonsSet).sort((a, b) => {
    const yA = parseInt(a.match(/\d{4}/)?.[0] || '0', 10);
    const yB = parseInt(b.match(/\d{4}/)?.[0] || '0', 10);
    return yB - yA;
  });
}

/**
 * Toggles the season stepper popover dropdown menu
 */
export function toggleSeasonStepperDropdown(e?: Event): void {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const dropdown = document.getElementById('season-stepper-dropdown-menu');
  const chevron = document.getElementById('season-stepper-chevron');
  if (dropdown) {
    const isHidden = dropdown.classList.toggle('hidden');
    if (chevron) {
      if (isHidden) {
        chevron.classList.remove('rotate-180');
      } else {
        chevron.classList.add('rotate-180');
      }
    }
  }
}

/**
 * Closes the season stepper popover dropdown menu
 */
export function closeSeasonStepperDropdown(): void {
  const dropdown = document.getElementById('season-stepper-dropdown-menu');
  const chevron = document.getElementById('season-stepper-chevron');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
    if (chevron) {
      chevron.classList.remove('rotate-180');
    }
  }
}

/**
 * Renders the centered Stepper toolbar (‹ [ Stagione YYYY/YY ▾ ] ›) with rich popover dropdown
 */
export function renderSeasonStepper(seasons: string[], currentSelectedSeason: string): string {
  if (!seasons || seasons.length === 0) return '';

  const currentIndex = seasons.indexOf(currentSelectedSeason);
  // List navigation: Left (‹) navigates left towards newer seasons (index - 1),
  // Right (›) navigates right into the archive towards older seasons (index + 1)
  const leftSeason = currentIndex > 0 ? seasons[currentIndex - 1] : null;
  const rightSeason = currentIndex >= 0 && currentIndex < seasons.length - 1 ? seasons[currentIndex + 1] : null;

  const isCurrentInProgress = state.competitions.some(
    c => c.season === currentSelectedSeason && (c.in_progress || c.status === 'in_progress')
  );

  let dropdownItemsHtml = '';
  seasons.forEach(season => {
    const isSelected = season === currentSelectedSeason;
    const comps = state.competitions.filter(c => c.season === season);
    const compsCount = comps.length;
    const inProgress = comps.some(c => c.in_progress || c.status === 'in_progress');

    dropdownItemsHtml += `
      <button type="button"
        onclick="selectArchiveSeason('${season}'); closeSeasonStepperDropdown();"
        class="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
          isSelected
            ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
            : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
        }"
        style="${isSelected ? '' : 'color: var(--text-main);'}">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-check text-[11px] ${isSelected ? 'text-slate-950 opacity-100' : 'opacity-0'}"></i>
          <span>Stagione ${season}</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          ${inProgress ? `
            <span class="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
              isSelected
                ? 'bg-slate-950/20 text-slate-950 border border-slate-950/30'
                : 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30'
            }">
              <span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-amber-400'} animate-pulse"></span>
              In corso
            </span>
          ` : ''}
          <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold ${
            isSelected
              ? 'bg-slate-950/15 text-slate-950'
              : 'bg-slate-500/10 text-slate-400'
          }">
            ${compsCount} ${compsCount === 1 ? 'torneo' : 'tornei'}
          </span>
        </div>
      </button>
    `;
  });

  return `
    <div class="relative z-30 flex items-center justify-center gap-2 mb-6">
      <div class="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl border albo-table-wrap shadow-sm"
        style="background-color: var(--table-surface);">
        
        <!-- Left (Newer Season) Button -->
        <button type="button"
          ${leftSeason ? `onclick="selectArchiveSeason('${leftSeason}')" title="Stagione successiva (${leftSeason})"` : 'disabled title="Nessuna stagione successiva"'}
          class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition border border-transparent ${
            leftSeason
              ? 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 cursor-pointer active:scale-95'
              : 'opacity-25 cursor-not-allowed'
          }"
          style="color: var(--text-main);"
          aria-label="Stagione successiva">
          <i class="fa-solid fa-chevron-left text-xs sm:text-sm"></i>
        </button>

        <!-- Center Active Season Dropdown Trigger -->
        <div class="relative z-40">
          <button type="button" id="btn-season-stepper-dropdown"
            onclick="toggleSeasonStepperDropdown(event)"
            class="h-9 sm:h-10 px-3 sm:px-4 rounded-xl flex items-center gap-2 sm:gap-2.5 transition border border-slate-300/40 dark:border-slate-700/60 hover:border-amber-400/60 shadow-sm active:scale-[0.98] cursor-pointer"
            style="background-color: var(--table-surface); color: var(--text-main);"
            aria-expanded="false"
            aria-haspopup="true">
            <i class="fa-solid fa-calendar-days text-amber-500 text-xs sm:text-sm"></i>
            <span class="text-xs sm:text-sm font-black tracking-tight">Stagione ${currentSelectedSeason}</span>
            ${isCurrentInProgress ? `
              <span class="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span class="hidden xs:inline">In corso</span>
              </span>
            ` : ''}
            <i id="season-stepper-chevron" class="fa-solid fa-chevron-down text-[10px] opacity-60 transition-transform duration-200 ml-0.5"></i>
          </button>

          <!-- Floating Popover Dropdown Menu -->
          <div id="season-stepper-dropdown-menu"
            class="hidden absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 sm:w-80 max-h-84 overflow-y-auto rounded-2xl shadow-2xl border z-50 p-1.5 backdrop-blur-xl scrollbar-thin"
            style="background-color: var(--modal-bg, var(--table-surface, #0f172a)); border-color: var(--table-border, #334155);"
            role="menu">
            <div class="px-3 py-2 text-[10px] uppercase font-black tracking-wider opacity-50 border-b border-slate-500/20 mb-1 flex items-center justify-between"
              style="color: var(--text-muted);">
              <span>Archivio Stagioni (${seasons.length})</span>
              <span>Cronologico</span>
            </div>
            <div class="space-y-1">
              ${dropdownItemsHtml}
            </div>
          </div>
        </div>

        <!-- Right (Older Season) Button -->
        <button type="button"
          ${rightSeason ? `onclick="selectArchiveSeason('${rightSeason}')" title="Stagione precedente (${rightSeason})"` : 'disabled title="Nessuna stagione precedente"'}
          class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition border border-transparent ${
            rightSeason
              ? 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 cursor-pointer active:scale-95'
              : 'opacity-25 cursor-not-allowed'
          }"
          style="color: var(--text-main);"
          aria-label="Stagione precedente">
          <i class="fa-solid fa-chevron-right text-xs sm:text-sm"></i>
        </button>

      </div>
    </div>
  `;
}

/**
 * Renders the top selector bar with season buttons (kept for backward compatibility)
 */
export function renderSeasonPills(seasons: string[], currentSelectedSeason: string): string {
  let pillsHtml = '';
  seasons.forEach(season => {
    const isActive = season === currentSelectedSeason;
    const isInProgress = state.competitions.some(
      c => c.season === season && (c.in_progress || c.status === 'in_progress')
    );

    const activeClass = isActive
      ? 'bg-amber-500 text-slate-950 font-black shadow-md border-amber-400 scale-105'
      : 'opacity-70 hover:opacity-100 font-bold border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5';
    pillsHtml += `
      <button type="button" onclick="selectArchiveSeason('${season}')"
        class="px-3.5 py-1.5 rounded-xl text-xs transition border flex items-center gap-1.5 shrink-0 ${activeClass}"
        style="${isActive ? '' : 'color: var(--text-main); background-color: var(--table-surface);'}">
        <i class="fa-solid fa-calendar-check text-[10px] ${isActive ? 'text-slate-950' : 'text-amber-500 dark:text-amber-400'}"></i>
        <span>${season}</span>
        ${isInProgress ? `
          <span class="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-1 shrink-0 ${
            isActive
              ? 'bg-slate-950/20 text-slate-950 border border-slate-950/30'
              : 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30'
          }">
            <span class="w-1 h-1 rounded-full ${isActive ? 'bg-slate-950' : 'bg-amber-500 dark:bg-amber-400'} animate-pulse"></span>
            In corso
          </span>
        ` : ''}
      </button>
    `;
  });

  return `
    <div class="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
      ${pillsHtml}
    </div>
  `;
}

/**
 * Renders the season overview banner with competition and team counts
 */
export function renderSeasonHeaderSummary(
  currentSelectedSeason: string,
  compsCount: number,
  totalTeams: number,
  isInProgress: boolean = false
): string {
  return `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 rounded-2xl border albo-table-wrap">
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-2xl font-black font-sport italic uppercase" style="color: var(--accent-color);">
            Stagione ${currentSelectedSeason}
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            ${compsCount} ${compsCount === 1 ? 'Competizione' : 'Competizioni'}
          </span>
          ${isInProgress ? `
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              In corso
            </span>
          ` : ''}
        </div>
        <p class="text-xs font-semibold mt-1 opacity-70" style="color: var(--text-muted);">
          ${isInProgress
            ? 'Stagione attualmente in corso • Classifiche e verdetti provvisori'
            : `Archivio ufficiale dei piazzamenti, podi e verdetti storici ${LEAGUE.brand.name}`}
        </p>
      </div>
      ${totalTeams > 0 ? `
        <div class="flex items-center gap-2 text-xs font-bold opacity-80" style="color: var(--text-muted);">
          <i class="fa-solid fa-users text-amber-400"></i>
          <span>${totalTeams} Squadre partecipanti</span>
        </div>
      ` : ''}
    </div>
  `;
}

// Global window assignments for stepper dropdown
if (typeof window !== 'undefined') {
  (window as unknown as { toggleSeasonStepperDropdown?: typeof toggleSeasonStepperDropdown }).toggleSeasonStepperDropdown = toggleSeasonStepperDropdown;
  (window as unknown as { closeSeasonStepperDropdown?: typeof closeSeasonStepperDropdown }).closeSeasonStepperDropdown = closeSeasonStepperDropdown;
}
