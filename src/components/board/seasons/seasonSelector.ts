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
    <div class="relative z-30 inline-flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-xl border albo-table-wrap shadow-sm shrink-0"
      style="background-color: var(--table-surface);">
      
      <!-- Left (Newer Season) Button -->
      <button type="button"
        ${leftSeason ? `onclick="selectArchiveSeason('${leftSeason}')" title="Stagione successiva (${leftSeason})"` : 'disabled title="Nessuna stagione successiva"'}
        class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition border border-transparent ${
          leftSeason
            ? 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 cursor-pointer active:scale-95'
            : 'opacity-25 cursor-not-allowed'
        }"
        style="color: var(--text-main);"
        aria-label="Stagione successiva">
        <i class="fa-solid fa-chevron-left text-[11px] sm:text-xs"></i>
      </button>

      <!-- Center Active Season Dropdown Trigger -->
      <div class="relative z-40">
        <button type="button" id="btn-season-stepper-dropdown"
          onclick="toggleSeasonStepperDropdown(event)"
          title="Stagione ${currentSelectedSeason} ${isCurrentInProgress ? '• In corso' : ''} • Clicca per selezionare dall'archivio"
          class="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 transition border border-slate-300/40 dark:border-slate-700/60 hover:border-amber-400/60 shadow-sm active:scale-[0.98] cursor-pointer"
          style="background-color: var(--table-surface); color: var(--text-main);"
          aria-expanded="false"
          aria-haspopup="true"
          aria-label="Seleziona stagione, attualmente Stagione ${currentSelectedSeason}">
          <i class="fa-solid fa-calendar-days text-amber-500 text-xs"></i>
          ${isCurrentInProgress ? `
            <span class="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              In corso
            </span>
          ` : ''}
          <i id="season-stepper-chevron" class="fa-solid fa-chevron-down text-[9px] opacity-60 transition-transform duration-200"></i>
        </button>

        <!-- Floating Popover Dropdown Menu -->
        <div id="season-stepper-dropdown-menu"
          class="hidden absolute top-full left-0 sm:left-1/2 sm:-translate-x-1/2 mt-2 w-72 sm:w-80 max-h-84 overflow-y-auto rounded-2xl shadow-2xl border z-50 p-1.5 backdrop-blur-xl scrollbar-thin"
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
        class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition border border-transparent ${
          rightSeason
            ? 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 cursor-pointer active:scale-95'
            : 'opacity-25 cursor-not-allowed'
        }"
        style="color: var(--text-main);"
        aria-label="Stagione precedente">
        <i class="fa-solid fa-chevron-right text-[11px] sm:text-xs"></i>
      </button>

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
 * Renders the unified season overview banner with static title + attached stepper on left,
 * and tournament badges + team counter on right
 */
export function renderSeasonHeaderSummary(
  currentSelectedSeason: string,
  compsCount: number,
  totalTeams: number,
  isInProgress: boolean = false,
  stepperHtml: string = ''
): string {
  const stepper = stepperHtml || renderSeasonStepper(getAvailableSeasons(), currentSelectedSeason);

  return `
    <div class="relative z-30 mb-6 p-4 sm:p-5 rounded-2xl border albo-table-wrap shadow-sm"
      style="background-color: var(--table-surface);">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        
        <!-- Left: Static Title with Attached Minimalist Stepper & Subtitle -->
        <div>
          <div class="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <span class="text-2xl sm:text-3xl font-black font-sport italic uppercase tracking-tight" style="color: var(--accent-color);">
              Stagione ${currentSelectedSeason}
            </span>
            ${stepper}
          </div>
          <p class="text-xs font-semibold mt-1 opacity-70" style="color: var(--text-muted);">
            ${isInProgress
              ? 'Classifiche e verdetti provvisori'
              : `Archivio ufficiale dei piazzamenti, podi e verdetti storici ${LEAGUE.brand.name}`}
          </p>
        </div>

        <!-- Right: Badges Group & Squad Counter -->
        <div class="flex items-center gap-2 sm:gap-2.5 flex-wrap self-start md:self-center">
          <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 shrink-0">
            ${compsCount} ${compsCount === 1 ? 'Competizione' : 'Competizioni'}
          </span>
          ${totalTeams > 0 ? `
            <span class="px-2.5 py-1 rounded-full text-xs font-bold border border-slate-400/20 bg-slate-500/10 flex items-center gap-1.5 shrink-0" style="color: var(--text-muted);">
              <i class="fa-solid fa-users text-amber-500 dark:text-amber-400"></i>
              ${totalTeams} Squadre partecipanti
            </span>
          ` : ''}
        </div>

      </div>
    </div>
  `;
}

// Global window assignments for stepper dropdown
if (typeof window !== 'undefined') {
  (window as unknown as { toggleSeasonStepperDropdown?: typeof toggleSeasonStepperDropdown }).toggleSeasonStepperDropdown = toggleSeasonStepperDropdown;
  (window as unknown as { closeSeasonStepperDropdown?: typeof closeSeasonStepperDropdown }).closeSeasonStepperDropdown = closeSeasonStepperDropdown;
}
