/**
 * src/components/modals/matchup/MatchupModal.ts
 * Lifecycle & State Controller for the Dedicated Tactical Matchup Pre-Match Modal
 */

import { state } from '@/state';
import { renderMatchupModalHTML } from './MatchupTemplate';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';

let selectedMatchupManagerIdA: string | null = null;
let selectedMatchupManagerIdB: string | null = null;
let isMatchupModalOpen = false;

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

    // Backdrop click listener to dismiss modal
    modalEl.addEventListener('click', (e) => {
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
function renderMatchupDOM(): void {
  mountMatchupModal();
  const contentEl = document.getElementById('matchup-modal-content');
  if (!contentEl) return;

  if (state.managers.length < 2) return;

  const mgrA = state.managers.find(m => m.id === selectedMatchupManagerIdA) || state.managers[0];
  const mgrB = state.managers.find(m => m.id === selectedMatchupManagerIdB && m.id !== mgrA.id) ||
    state.managers.find(m => m.id !== mgrA.id) ||
    state.managers[1];

  selectedMatchupManagerIdA = mgrA.id;
  selectedMatchupManagerIdB = mgrB.id;

  const liveData = getLiveSeasonDetails();
  contentEl.innerHTML = renderMatchupModalHTML(mgrA, mgrB, state.managers, liveData);
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
