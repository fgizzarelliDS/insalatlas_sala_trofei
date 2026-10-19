import { renderNodeToCanvas } from './core';
import { LEAGUE, LEAGUE_SITE_HOST } from '@/config';
import { state } from '@/state';

/**
 * Prepares and renders the full desktop Standings table into a high-res canvas.
 * Forces desktop layout even on mobile, strips interactive buttons/dropdowns,
 * and frames it inside an official league header and watermark footer themed to match the active app theme.
 */
export async function renderStandingsCanvas(mode: 'real' | 'merit' = 'real'): Promise<HTMLCanvasElement> {
  const containerId = mode === 'merit' ? 'live-view-merit-container' : 'live-view-real-container';
  const sourceEl = document.getElementById(containerId);
  if (!sourceEl) {
    throw new Error(`Elemento ${containerId} non trovato nel DOM`);
  }

  // 1. Locate the desktop table container inside the source
  const desktopWrapper = sourceEl.querySelector('.overflow-x-auto');
  if (!desktopWrapper) {
    throw new Error('Tabella desktop non trovata per esportazione');
  }

  // 2. Clone the desktop table wrapper
  const tableClone = desktopWrapper.cloneNode(true) as HTMLElement;
  tableClone.classList.remove('hidden', 'md:block', 'overflow-x-auto');
  tableClone.style.display = 'block';
  tableClone.style.width = '100%';

  // Strip interactive attributes or dropdowns
  tableClone.querySelectorAll('button').forEach(btn => {
    // Keep button inner text and icons, but remove button behavior
    const span = document.createElement('div');
    span.className = btn.className;
    span.innerHTML = btn.innerHTML;
    btn.replaceWith(span);
  });

  // 3. Build export card wrapper themed with active app theme
  const currentTheme = state.currentTheme || 'gazzetta';
  const exportCard = document.createElement('div');
  exportCard.id = 'standings-export-card';
  exportCard.className = `rounded-3xl border shadow-2xl overflow-hidden p-0 theme-${currentTheme}`;
  exportCard.style.backgroundColor = 'var(--table-surface)';
  exportCard.style.borderColor = 'var(--table-border)';
  exportCard.style.color = 'var(--text-main)';
  exportCard.style.width = '960px';

  const viewTitle = mode === 'merit'
    ? 'Classifica per Merito & Fortuna (xPTS)'
    : 'Classifica Ufficiale';
  const viewSubtitle = mode === 'merit'
    ? 'Graduatoria oggettiva depurata dalla fortuna del calendario (Tutti vs Tutti)'
    : 'Riepilogo stagionale in corso, punti e stato forma';

  exportCard.innerHTML = `
    <!-- Official Header Banner themed to match app theme -->
    <div class="p-6 border-b flex items-center justify-between gap-4"
         style="border-color: var(--table-border); background-color: var(--header-bg); color: var(--header-text);">
      <div class="flex items-center gap-4">
        <img src="favicon-64x64.png" alt="${LEAGUE.brand.name}" class="w-12 h-12 object-contain rounded-2xl shadow-md border border-white/20 bg-white/10 p-1">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-extrabold tracking-tight" style="color: var(--header-text);">${viewTitle}</h2>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider bg-white/15 text-white border-white/30 shadow-xs">
              Stagione Live
            </span>
          </div>
          <p class="text-xs font-medium opacity-80 mt-0.5" style="color: var(--header-text);">${viewSubtitle}</p>
        </div>
      </div>
      <div class="text-right">
        <div class="font-extrabold text-sm tracking-wider uppercase" style="color: var(--header-text);">${LEAGUE.brand.name}</div>
        <div class="text-[11px] font-semibold opacity-70" style="color: var(--header-text);">${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>

    <!-- Table Container -->
    <div class="p-4" style="background-color: var(--table-surface); color: var(--text-main);">
      ${tableClone.outerHTML}
    </div>

    <!-- Official Footer Watermark themed to match app theme -->
    <div class="p-3.5 border-t flex items-center justify-between text-xs font-semibold"
         style="border-color: var(--table-border); background-color: var(--table-surface); color: var(--text-muted);">
      <div class="flex items-center gap-2">
        <img src="favicon-64x64.png" alt="${LEAGUE.brand.name}" class="w-4 h-4 object-contain inline-block">
        <span>${LEAGUE.brand.name} • Sala Trofei & Statistiche Ufficiali</span>
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

/**
 * Prepares and renders the open Team Matches Modal dialog into a high-res canvas.
 * Expands scrollable lists to ensure all matchdays are captured, strips interactive buttons and dropdowns,
 * and attaches an elegant official league footer.
 */
export async function renderTeamMatchesModalCanvas(dialog?: HTMLElement): Promise<HTMLCanvasElement> {
  const targetDialog = dialog || document.getElementById('team-matches-dialog');
  if (!targetDialog) {
    throw new Error('Elemento team-matches-dialog non trovato nel DOM');
  }

  const clone = targetDialog.cloneNode(true) as HTMLElement;
  clone.id = 'team-matches-export-clone';

  // 1. Natural width (max-w-2xl is 672px)
  const dialogRect = targetDialog.getBoundingClientRect();
  const naturalWidth = Math.round(dialogRect.width) || targetDialog.offsetWidth || 672;
  const targetWidth = Math.max(naturalWidth, 640);

  // 2. Remove interactive UI controls (close button, back button, share dropdown)
  clone.querySelector('#team-matches-share-dropdown')?.remove();
  clone.querySelector('#btn-team-matches-share')?.closest('.relative')?.remove();
  clone.querySelectorAll('button').forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    if (
      onclick.includes('closeTeamMatchesModal') ||
      onclick.includes('navigateBackTeamMatchesModal') ||
      onclick.includes('toggleTeamMatchesShareDropdown') ||
      onclick.includes('shareTeamMatches') ||
      btn.title === 'Chiudi' ||
      btn.title === 'Torna alla squadra precedente'
    ) {
      btn.remove();
    }
  });

  // 3. Remove height constraints & scrolling on modal body so ALL matchdays are rendered
  clone.classList.remove('max-h-[92vh]', 'overflow-hidden');
  clone.style.maxHeight = 'none';
  clone.style.height = 'auto';

  const contentEl = clone.querySelector('#team-matches-modal-content') as HTMLElement | null;
  if (contentEl) {
    contentEl.classList.remove('overflow-hidden', 'h-full');
    contentEl.style.height = 'auto';
    contentEl.style.overflow = 'visible';
  }

  const scrollableBodies = clone.querySelectorAll('.overflow-y-auto, [class*="overflow-y"]');
  scrollableBodies.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.classList.remove('overflow-y-auto', 'overflow-y-scroll');
    htmlEl.style.overflow = 'visible';
    htmlEl.style.maxHeight = 'none';
    htmlEl.style.height = 'auto';
  });

  // 4. Add official footer
  const footerEl = document.createElement('div');
  footerEl.className = 'p-3.5 border-t flex items-center justify-between text-xs font-semibold';
  footerEl.style.borderColor = 'var(--table-border)';
  footerEl.style.backgroundColor = 'var(--table-surface)';
  footerEl.style.color = 'var(--text-muted)';
  footerEl.innerHTML = `
    <div class="flex items-center gap-2">
      <img src="favicon-64x64.png" alt="${LEAGUE.brand.name}" class="w-4 h-4 object-contain inline-block">
      <span>${LEAGUE.brand.name} • Calendario & Dettagli Squadra</span>
    </div>
    <div class="text-[11px] opacity-80 font-mono font-bold" style="color: var(--accent-color);">
      ${LEAGUE_SITE_HOST}
    </div>
  `;
  clone.appendChild(footerEl);

  const currentTheme = state.currentTheme || 'gazzetta';
  const exportBg = currentTheme === 'gazzetta'
    ? '#fce7ec'
    : currentTheme === 'studio'
    ? '#f1f5f9'
    : currentTheme === 'seriea'
    ? '#020b1c'
    : '#090d16';

  return renderNodeToCanvas(clone, targetWidth, exportBg);
}
