import { state } from '@/state';
import { computeHeadToHead } from '@/analytics';
import { formatScore } from '@/score';
import { renderHeadToHeadModalHTML, type H2HTabMode } from './HeadToHeadTemplate';
import { closeProfileModal } from '@/components/modals/ProfileModal';

let selectedManagerIdA: string | null = null;
let selectedManagerIdB: string | null = null;
let isChronologyExpanded = false;
let h2hVisualMode: 'radar' | 'bars' = 'radar';
let currentH2HTab: H2HTabMode = 'duel';
let currentNemesisFilter: 'active' | 'veterans' | 'all' = 'active';

/**
 * Sets visual comparison mode: 'radar' or 'bars'
 */
export function setH2HVisualMode(mode: 'radar' | 'bars'): void {
  h2hVisualMode = mode;
  renderHeadToHeadDOM();
}

/**
 * Gets current visual comparison mode
 */
export function getH2HVisualMode(): 'radar' | 'bars' {
  return h2hVisualMode;
}

/**
 * Sets active sub-tab: 'duel' (1vs1 face-off) or 'matrix' (N x N cross-table)
 */
export function setH2HTab(tab: H2HTabMode): void {
  currentH2HTab = tab;
  renderHeadToHeadDOM();
}

/**
 * Gets active H2H sub-tab
 */
export function getH2HTab(): H2HTabMode {
  return currentH2HTab;
}

/**
 * Sets scope filter for the Nemesis matrix ('active' | 'veterans' | 'all')
 */
export function setNemesisFilter(filter: 'active' | 'veterans' | 'all'): void {
  currentNemesisFilter = filter;
  renderHeadToHeadDOM();
}

/**
 * Selects a specific duel from the matrix and switches immediately to the 1vs1 duel tab
 */
export function selectH2HDuel(idA: string, idB: string): void {
  selectedManagerIdA = idA;
  selectedManagerIdB = idB;
  currentH2HTab = 'duel';
  isChronologyExpanded = false;
  renderHeadToHeadDOM();
  updateURL(selectedManagerIdA, selectedManagerIdB);
}

import {
  type H2HReturnContext,
  getH2HReturnContext,
  setH2HReturnContext,
  clearH2HReturnContext
} from './HeadToHeadContext';

export {
  type H2HReturnContext,
  getH2HReturnContext,
  setH2HReturnContext,
  clearH2HReturnContext
};

/**
 * Updates URL search parameter with ?h2h=idA:idB
 */
function updateURL(idA: string, idB: string, pushState = false): void {
  if (typeof window !== 'undefined' && window.history && window.location) {
    const url = new URL(window.location.href);
    url.searchParams.delete('manager');
    url.searchParams.set('h2h', `${idA}:${idB}`);
    if (pushState) {
      window.history.pushState({ h2h: `${idA}:${idB}` }, '', url.toString());
    } else {
      window.history.replaceState({ h2h: `${idA}:${idB}` }, '', url.toString());
    }
  }
}

/**
 * Removes ?h2h search parameter from URL
 */
function cleanURL(): void {
  if (typeof window !== 'undefined' && window.history && window.location) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('h2h')) {
      url.searchParams.delete('h2h');
      window.history.replaceState({}, '', url.toString());
    }
  }
}

/**
 * Opens a manager's profile from the H2H duel, storing the duel context so the user can easily return.
 */
export function openProfileFromH2H(targetManagerId: string): void {
  if (selectedManagerIdA && selectedManagerIdB) {
    setH2HReturnContext({
      managerIdA: selectedManagerIdA,
      managerIdB: selectedManagerIdB
    });
  }
  closeHeadToHeadModal(false);
  if (typeof window !== 'undefined' && (window as any).openProfileModal) {
    (window as any).openProfileModal(targetManagerId, true);
  }
}

/**
 * Returns to the previous H2H duel from the manager profile modal.
 */
export function returnToPreviousH2HDuel(): void {
  const context = getH2HReturnContext();
  clearH2HReturnContext();
  if (typeof window !== 'undefined' && (window as any).closeProfileModal) {
    (window as any).closeProfileModal(false);
  }
  if (context) {
    openHeadToHeadModal(context.managerIdA, context.managerIdB, 'duel', true);
  }
}

/**
 * Renders the Head-to-Head modal content into #head-to-head-modal-content
 * and adjusts modal card width dynamically based on active tab
 */
export function renderHeadToHeadDOM(): void {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('head-to-head-modal-content');
  if (!container || !selectedManagerIdA || !selectedManagerIdB) return;

  const managerA = state.managers.find(m => m.id === selectedManagerIdA);
  const managerB = state.managers.find(m => m.id === selectedManagerIdB);

  if (!managerA || !managerB) return;

  // Dynamically adjust modal container width: max-w-2xl for duel, max-w-5xl for matrix
  const dialog = document.getElementById('head-to-head-dialog');
  if (dialog) {
    if (currentH2HTab === 'matrix') {
      dialog.classList.remove('max-w-2xl');
      dialog.classList.add('max-w-5xl');
    } else {
      dialog.classList.remove('max-w-5xl');
      dialog.classList.add('max-w-2xl');
    }
  }

  const stats = computeHeadToHead(managerA, managerB);
  container.innerHTML = renderHeadToHeadModalHTML(
    stats,
    state.managers,
    isChronologyExpanded,
    h2hVisualMode,
    currentH2HTab,
    currentNemesisFilter
  );
}

/**
 * Opens Head-to-Head modal with specified or default managers
 */
export function openHeadToHeadModal(
  idA?: string,
  idB?: string,
  initialTab: H2HTabMode = 'duel',
  pushState = false
): void {
  if (state.managers.length < 2) return;

  // Determine initial manager A
  let initialA = idA && state.managers.some(m => m.id === idA) ? idA : state.managers[0].id;

  // Determine initial manager B (must be different from A)
  let initialB = idB && state.managers.some(m => m.id === idB && m.id !== initialA)
    ? idB
    : state.managers.find(m => m.id !== initialA)?.id || state.managers[1].id;

  selectedManagerIdA = initialA;
  selectedManagerIdB = initialB;
  currentH2HTab = initialTab;
  isChronologyExpanded = false;

  renderHeadToHeadDOM();
  updateURL(selectedManagerIdA, selectedManagerIdB, pushState);

  const modal = typeof document !== 'undefined' ? document.getElementById('head-to-head-modal') : null;
  if (modal) {
    if (!(modal as any)._hasBackdropListener) {
      modal.addEventListener('click', (e: MouseEvent) => {
        if (e.target === modal) {
          closeHeadToHeadModal();
        }
      });
      (modal as any)._hasBackdropListener = true;
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

/**
 * Closes Head-to-Head modal and cleans URL
 */
export function closeHeadToHeadModal(clean = true): void {
  const modal = typeof document !== 'undefined' ? document.getElementById('head-to-head-modal') : null;
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  if (clean) {
    cleanURL();
  }
}

/**
 * Swaps Contender A and Contender B
 */
export function swapH2HManagers(): void {
  if (!selectedManagerIdA || !selectedManagerIdB) return;
  const temp = selectedManagerIdA;
  selectedManagerIdA = selectedManagerIdB;
  selectedManagerIdB = temp;

  renderHeadToHeadDOM();
  updateURL(selectedManagerIdA, selectedManagerIdB);
}

/**
 * Changes Contender A from dropdown
 */
export function changeH2HManagerA(newId: string): void {
  if (newId === selectedManagerIdB) {
    // If user picks same as B, swap them
    swapH2HManagers();
    return;
  }
  selectedManagerIdA = newId;
  renderHeadToHeadDOM();
  if (selectedManagerIdA && selectedManagerIdB) {
    updateURL(selectedManagerIdA, selectedManagerIdB);
  }
}

/**
 * Changes Contender B from dropdown
 */
export function changeH2HManagerB(newId: string): void {
  if (newId === selectedManagerIdA) {
    // If user picks same as A, swap them
    swapH2HManagers();
    return;
  }
  selectedManagerIdB = newId;
  renderHeadToHeadDOM();
  if (selectedManagerIdA && selectedManagerIdB) {
    updateURL(selectedManagerIdA, selectedManagerIdB);
  }
}

/**
 * Toggles expanded chronology of duels in H2H modal
 */
export function toggleH2HChronology(): void {
  isChronologyExpanded = !isChronologyExpanded;
  renderHeadToHeadDOM();
}

/**
 * Shortcut to open H2H modal from manager's ProfileModal
 */
export function openH2HFromProfile(): void {
  const currentId = state.selectedManagerId;
  if (!currentId) return;
  closeProfileModal();

  // Find another prominent manager as B (e.g. first manager different from current)
  const otherManager = state.managers.find(m => m.id !== currentId);
  openHeadToHeadModal(currentId, otherManager?.id, 'duel');
}

/**
 * Opens H2H comparison with a specific opponent directly from a profile rivalry badge
 */
export function openH2HWithOpponent(managerId: string, opponentId: string): void {
  closeProfileModal();
  openHeadToHeadModal(managerId, opponentId, 'duel');
}

/**
 * Shortcut to open H2H modal directly into the global Nemesis Matrix view
 */
export function openNemesisMatrixModal(): void {
  openHeadToHeadModal(undefined, undefined, 'matrix');
}

/**
 * Generates formatted text and triggers WhatsApp share for the current duel
 */
export function shareH2HWhatsApp(): void {
  if (!selectedManagerIdA || !selectedManagerIdB) return;
  const managerA = state.managers.find(m => m.id === selectedManagerIdA);
  const managerB = state.managers.find(m => m.id === selectedManagerIdB);
  if (!managerA || !managerB) return;

  const stats = computeHeadToHead(managerA, managerB);

  let baseUrl = 'https://fgizzarellids.github.io/insalatlas_sala_trofei/';
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }

  const shareUrl = `${baseUrl}?h2h=${encodeURIComponent(managerA.id)}:${encodeURIComponent(managerB.id)}`;

  const text = `⚔️ *InsalAtlas • Duello Head-to-Head*
👤 *${managerA.name.toUpperCase()}* vs *${managerB.name.toUpperCase()}*

🏁 *Scontri Diretti in Campionato:*
${stats.winsA} Vittorie ${managerA.name} • ${stats.ties} Pari • ${stats.winsB} Vittorie ${managerB.name} (${stats.sharedSeasonsCount} campionati condivisi)

🏆 *Palmarès a Confronto:*
• Scudetti: ${managerA.gold || 0} vs ${managerB.gold || 0}
• Coppe di Lega: ${managerA.cup_gold || 0} vs ${managerB.cup_gold || 0}
• Rating Storico: ${formatScore(stats.palmares.ratingScore.a)} PT vs ${formatScore(stats.palmares.ratingScore.b)} PT

📊 *Indice di Freddezza:*
• ${managerA.name}: ${stats.metricsA.clutchIcon} ${stats.metricsA.clutchLabel}
• ${managerB.name}: ${stats.metricsB.clutchIcon} ${stats.metricsB.clutchLabel}

📜 *Verdetto:* ${stats.narrativeVerdict}

👉 Guarda il duello completo:
${shareUrl}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Toggles the export / share dropdown menu inside the H2H duel modal
 */
export function toggleH2HShareDropdown(e?: Event): void {
  if (e) {
    e.stopPropagation();
  }
  const dropdown = document.getElementById('h2h-share-dropdown-menu');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

/**
 * Closes the export / share dropdown menu inside the H2H duel modal
 */
export function closeH2HShareDropdown(): void {
  const dropdown = document.getElementById('h2h-share-dropdown-menu');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
  }
}

/**
 * Triggers HD export for the currently opened H2H duel
 */
export async function exportCurrentH2HDuelHD(): Promise<void> {
  if (!selectedManagerIdA || !selectedManagerIdB) return;
  const managerA = state.managers.find(m => m.id === selectedManagerIdA);
  const managerB = state.managers.find(m => m.id === selectedManagerIdB);
  if (managerA && managerB) {
    const { exportH2HDuelHD } = await import('@/export/share');
    await exportH2HDuelHD(managerA, managerB);
  }
}

/**
 * Copies HD image of current H2H duel directly to clipboard
 */
export async function copyCurrentH2HDuelToClipboard(): Promise<void> {
  if (!selectedManagerIdA || !selectedManagerIdB) return;
  const managerA = state.managers.find(m => m.id === selectedManagerIdA);
  const managerB = state.managers.find(m => m.id === selectedManagerIdB);
  if (managerA && managerB) {
    const { copyH2HDuelToClipboard } = await import('@/export/share');
    await copyH2HDuelToClipboard(managerA, managerB);
  }
}

