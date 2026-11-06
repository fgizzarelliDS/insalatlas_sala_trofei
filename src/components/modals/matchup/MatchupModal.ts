/**
 * src/components/modals/matchup/MatchupModal.ts
 * Lifecycle & State Controller for the Dedicated Tactical Matchup Pre-Match Modal
 */

import { state } from '@/state';
import { LEAGUE } from '@/config';
import { renderMatchupModalHTML } from './MatchupTemplate';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { showToast } from '@/utils/toast';

let selectedMatchupManagerIdA: string | null = null;
let selectedMatchupManagerIdB: string | null = null;
let isMatchupModalOpen = false;
let isDirectDetailsExpanded = false;
let matchupScope: 'career' | 'season' = 'career';

/**
 * Ensures the Matchup modal DOM container exists
 */
export function mountMatchupModal(): HTMLElement {
  let modalEl = document.getElementById('matchup-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'matchup-modal';
    modalEl.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4';
    modalEl.innerHTML = `
      <div id="matchup-modal-content"
           class="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300"
           style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
      </div>
    `;
    document.body.appendChild(modalEl);

    // Dismiss modal on backdrop click, or dismiss share popover when clicking outside dropdown
    modalEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target && !target.closest('#matchup-share-dropdown-menu') && !target.closest('#btn-matchup-share-dropdown')) {
        closeMatchupShareDropdown();
      }
      if (e.target === modalEl) {
        closeMatchupModal();
      }
    });

    // Keyboard ESC listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isMatchupModalOpen) {
        closeMatchupModal();
      }
    });
  }
  return modalEl;
}

/**
 * Renders the Matchup Modal DOM contents
 */
function renderMatchupDOM(preserveScroll = false): void {
  mountMatchupModal();
  const contentEl = document.getElementById('matchup-modal-content');
  if (!contentEl) return;

  const scrollContainer = typeof contentEl.querySelector === 'function'
    ? (contentEl.querySelector('.overflow-y-auto') as HTMLElement | null)
    : null;
  const prevScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

  if (state.managers.length < 2) return;

  const mgrA = state.managers.find(m => m.id === selectedMatchupManagerIdA) || state.managers[0];
  const mgrB = state.managers.find(m => m.id === selectedMatchupManagerIdB && m.id !== mgrA.id) ||
    state.managers.find(m => m.id !== mgrA.id) ||
    state.managers[1];

  selectedMatchupManagerIdA = mgrA.id;
  selectedMatchupManagerIdB = mgrB.id;

  const liveData = getLiveSeasonDetails();
  contentEl.innerHTML = renderMatchupModalHTML(mgrA, mgrB, state.managers, liveData, isDirectDetailsExpanded, matchupScope);

  if (preserveScroll && prevScrollTop > 0 && typeof contentEl.querySelector === 'function') {
    const newScrollContainer = contentEl.querySelector('.overflow-y-auto') as HTMLElement | null;
    if (newScrollContainer) {
      newScrollContainer.scrollTop = prevScrollTop;
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          newScrollContainer.scrollTop = prevScrollTop;
        });
      }
    }
  }
}

/**
 * Toggles the detailed matches accordion
 */
export function toggleMatchupDirectDetails(): void {
  isDirectDetailsExpanded = !isDirectDetailsExpanded;
  renderMatchupDOM(true);
}

/**
 * Changes active tactical radar scope between 'career' and 'season'
 */
export function setMatchupScope(scope: 'career' | 'season'): void {
  matchupScope = scope;
  renderMatchupDOM(true);
}

/**
 * Opens the Matchup Modal with two specified managers (or intelligent defaults)
 */
export function openMatchupModal(
  idA?: string,
  idB?: string,
  pushState = false
): void {
  if (state.managers.length < 2) return;

  isDirectDetailsExpanded = false;
  const modalEl = mountMatchupModal();

  // Pick initial managers
  let initialA = idA && state.managers.some(m => m.id === idA) ? idA : state.managers[0].id;
  let initialB = idB && state.managers.some(m => m.id === idB) && idB !== initialA
    ? idB
    : state.managers.find(m => m.id !== initialA)?.id || state.managers[1].id;

  selectedMatchupManagerIdA = initialA;
  selectedMatchupManagerIdB = initialB;

  renderMatchupDOM();

  modalEl.classList.remove('hidden');
  modalEl.classList.add('flex');
  isMatchupModalOpen = true;

  if (pushState && typeof window !== 'undefined' && window.history?.pushState) {
    const url = new URL(window.location.href);
    url.searchParams.set('matchup', `${initialA}:${initialB}`);
    window.history.pushState({ matchup: `${initialA}:${initialB}` }, '', url.toString());
  }
}

/**
 * Closes the Matchup Modal
 */
export function closeMatchupModal(updateHistory = true): void {
  const modalEl = document.getElementById('matchup-modal');
  if (modalEl) {
    modalEl.classList.add('hidden');
    modalEl.classList.remove('flex');
  }
  isMatchupModalOpen = false;

  if (updateHistory && typeof window !== 'undefined' && window.history?.pushState) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('matchup')) {
      url.searchParams.delete('matchup');
      window.history.pushState({}, '', url.toString());
    }
  }
}

/**
 * Changes Manager A in Matchup modal
 */
export function changeMatchupManagerA(newIdA: string): void {
  if (newIdA === selectedMatchupManagerIdB) {
    // Swap managers
    selectedMatchupManagerIdB = selectedMatchupManagerIdA;
  }
  selectedMatchupManagerIdA = newIdA;
  renderMatchupDOM();
}

/**
 * Changes Manager B in Matchup modal
 */
export function changeMatchupManagerB(newIdB: string): void {
  if (newIdB === selectedMatchupManagerIdA) {
    // Swap managers
    selectedMatchupManagerIdA = selectedMatchupManagerIdB;
  }
  selectedMatchupManagerIdB = newIdB;
  renderMatchupDOM();
}

/**
 * Checks if the Matchup modal is currently visible
 */
export function isMatchupOpen(): boolean {
  return isMatchupModalOpen;
}

/**
 * Gets currently selected matchup manager IDs
 */
export function getSelectedMatchupManagers(): { idA: string | null; idB: string | null } {
  return {
    idA: selectedMatchupManagerIdA,
    idB: selectedMatchupManagerIdB
  };
}

/**
 * Toggles the export / share dropdown menu inside Matchup modal
 */
export function toggleMatchupShareDropdown(e?: Event): void {
  if (e) {
    e.stopPropagation();
  }
  const dropdown = document.getElementById('matchup-share-dropdown-menu');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

/**
 * Closes the export / share dropdown menu inside Matchup modal
 */
export function closeMatchupShareDropdown(): void {
  const dropdown = document.getElementById('matchup-share-dropdown-menu');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
  }
}

/**
 * Exports current Matchup as high-definition 9:16 Instagram/WhatsApp Story
 */
export async function exportMatchupStoryHD(): Promise<void> {
  closeMatchupShareDropdown();
  if (!selectedMatchupManagerIdA || !selectedMatchupManagerIdB) {
    showToast('Nessun duello attivo selezionato', 'error');
    return;
  }
  const managerA = state.managers.find(m => m.id === selectedMatchupManagerIdA);
  const managerB = state.managers.find(m => m.id === selectedMatchupManagerIdB);
  if (managerA && managerB) {
    const { exportH2HDuelStoryHD } = await import('@/export');
    await exportH2HDuelStoryHD(managerA, managerB, matchupScope);
  }
}

/**
 * Captures the Matchup modal dialog in high definition PNG
 */
export async function exportMatchupCardHD(): Promise<void> {
  closeMatchupShareDropdown();
  if (!selectedMatchupManagerIdA || !selectedMatchupManagerIdB) {
    showToast('Nessun duello attivo selezionato', 'error');
    return;
  }
  const managerA = state.managers.find(m => m.id === selectedMatchupManagerIdA);
  const managerB = state.managers.find(m => m.id === selectedMatchupManagerIdB);
  if (!managerA || !managerB) return;

  const card = document.getElementById('matchup-modal-content');
  if (!card) {
    showToast('Impossibile trovare la scheda del matchup', 'error');
    return;
  }

  showToast('Generazione Matchup HD in corso...', 'info');

  try {
    const { renderH2HDuelCanvas, downloadBlob } = await import('@/export');
    const { LEAGUE } = await import('@/config');
    const canvas = await renderH2HDuelCanvas(card);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione dell'immagine", 'error');
        return;
      }
      const filename = `${LEAGUE.filePrefix}_matchup_${managerA.id}_vs_${managerB.id}_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Matchup HD export failed:', err);
    showToast('Impossibile esportare il matchup', 'error');
  }
}

/**
 * Copies preformatted tactical WhatsApp Banter for current Matchup
 */
export async function copyMatchupBanter(): Promise<void> {
  closeMatchupShareDropdown();
  if (!selectedMatchupManagerIdA || !selectedMatchupManagerIdB) {
    showToast('Nessun duello attivo selezionato', 'error');
    return;
  }
  const managerA = state.managers.find(m => m.id === selectedMatchupManagerIdA);
  const managerB = state.managers.find(m => m.id === selectedMatchupManagerIdB);
  if (!managerA || !managerB) {
    showToast('Manager non trovati', 'error');
    return;
  }
  const { computeTacticalMatchup } = await import('@/analytics/tacticalMatchup');
  const liveData = getLiveSeasonDetails();
  const matchup = computeTacticalMatchup(managerA, managerB, state.managers, liveData, matchupScope);
  const text = matchup.banterText;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('Banter Pre-Match WhatsApp copiato! 📋', 'success');
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Banter Pre-Match WhatsApp copiato! 📋', 'success');
    }
  } catch {
    showToast('Errore durante la copia del banter', 'error');
  }
}

/**
 * Shares direct deep link to WhatsApp for this matchup
 */
export function shareMatchupWhatsApp(): void {
  closeMatchupShareDropdown();
  if (!selectedMatchupManagerIdA || !selectedMatchupManagerIdB) return;
  const url = `${window.location.origin}${window.location.pathname}?matchup=${selectedMatchupManagerIdA}:${selectedMatchupManagerIdB}`;
  const text = `Guarda il Matchup Tattico su ${LEAGUE.brand.name}: ${url}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}
