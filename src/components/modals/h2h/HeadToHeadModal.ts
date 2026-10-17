import type { Manager } from '@/types';
import { state } from '@/state';
import { computeHeadToHead } from '@/analytics';
import { renderHeadToHeadModalHTML, type H2HTabMode } from './HeadToHeadTemplate';
import { closeProfileModal } from '@/components/modals/ProfileModal';
import { buildH2HWhatsAppShareText, buildMultiManagerWhatsAppShareText } from '@/export/share';

let selectedManagerIdA: string | null = null;
let selectedManagerIdB: string | null = null;
let multiSelectedManagerIds: string[] = [];
let hiddenMultiManagerIds: Set<string> = new Set();
let multiTournamentMode: 'ppg' | 'simultaneous' = 'simultaneous';
let isChronologyExpanded = false;
let h2hVisualMode: 'radar' | 'bars' = 'radar';
let currentH2HTab: H2HTabMode = 'duel';
let currentNemesisFilter: 'active' | 'veterans' | 'all' = 'active';

/**
 * Sets multi-manager mini-tournament mode ('ppg' or 'simultaneous')
 */
export function setMultiTournamentMode(mode: 'ppg' | 'simultaneous'): void {
  multiTournamentMode = mode;
  renderHeadToHeadDOM(true);
}

/**
 * Gets current multi-manager mini-tournament mode
 */
export function getMultiTournamentMode(): 'ppg' | 'simultaneous' {
  return multiTournamentMode;
}

/**
 * Initializes default 3 multi-managers if list is empty
 */
function initDefaultMultiManagers(): void {
  const chosen: string[] = [];
  if (selectedManagerIdA && state.managers.some(m => m.id === selectedManagerIdA)) {
    chosen.push(selectedManagerIdA);
  }
  if (selectedManagerIdB && state.managers.some(m => m.id === selectedManagerIdB) && !chosen.includes(selectedManagerIdB)) {
    chosen.push(selectedManagerIdB);
  }
  for (const m of state.managers) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(m.id)) {
      chosen.push(m.id);
    }
  }
  multiSelectedManagerIds = chosen;
}

/**
 * Sets visual comparison mode: 'radar' or 'bars'
 */
export function setH2HVisualMode(mode: 'radar' | 'bars'): void {
  h2hVisualMode = mode;
  renderHeadToHeadDOM(true);
}

/**
 * Gets current visual comparison mode
 */
export function getH2HVisualMode(): 'radar' | 'bars' {
  return h2hVisualMode;
}

/**
 * Sets active sub-tab: 'duel' (1vs1 face-off), 'multi' (Tavolo Rivali 3+), or 'matrix' (N x N cross-table)
 */
export function setH2HTab(tab: H2HTabMode): void {
  currentH2HTab = tab;
  if (tab === 'multi' && multiSelectedManagerIds.length < 3) {
    initDefaultMultiManagers();
  }
  renderHeadToHeadDOM();
  updateURL();
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
  clearH2HReturnContext,
  type ProfileReturnContext,
  getProfileReturnContext,
  setProfileReturnContext,
  clearProfileReturnContext
} from './HeadToHeadContext';

export {
  type H2HReturnContext,
  getH2HReturnContext,
  setH2HReturnContext,
  clearH2HReturnContext,
  type ProfileReturnContext,
  getProfileReturnContext,
  setProfileReturnContext,
  clearProfileReturnContext
};

/**
 * Updates URL search parameter with ?h2h=idA:idB, ?h2h=multi&m=..., or ?h2h=matrix
 */
function updateURL(idA?: string, idB?: string, pushState = false): void {
  if (typeof window !== 'undefined' && window.history && window.location) {
    const url = new URL(window.location.href);
    url.searchParams.delete('manager');
    if (currentH2HTab === 'matrix') {
      url.searchParams.set('h2h', 'matrix');
      url.searchParams.delete('m');
    } else if (currentH2HTab === 'multi') {
      url.searchParams.set('h2h', 'multi');
      if (multiSelectedManagerIds.length > 0) {
        url.searchParams.set('m', multiSelectedManagerIds.join(':'));
      }
    } else {
      const effectiveA = idA || selectedManagerIdA;
      const effectiveB = idB || selectedManagerIdB;
      if (effectiveA && effectiveB) {
        url.searchParams.set('h2h', `${effectiveA}:${effectiveB}`);
        url.searchParams.delete('m');
      }
    }
    if (pushState) {
      window.history.pushState({ h2h: url.searchParams.get('h2h') }, '', url.toString());
    } else {
      window.history.replaceState({ h2h: url.searchParams.get('h2h') }, '', url.toString());
    }
  }
}

/**
 * Removes ?h2h and ?m search parameters from URL
 */
function cleanURL(): void {
  if (typeof window !== 'undefined' && window.history && window.location) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('h2h') || url.searchParams.has('m')) {
      url.searchParams.delete('h2h');
      url.searchParams.delete('m');
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
 * Returns to the previous manager profile from the H2H duel modal.
 */
export function returnToPreviousProfile(): void {
  const context = getProfileReturnContext();
  clearProfileReturnContext();
  closeHeadToHeadModal(false);
  if (context && typeof window !== 'undefined' && (window as any).openProfileModal) {
    (window as any).openProfileModal(context.managerId, true);
  }
}

/**
 * Renders the Head-to-Head modal content into #head-to-head-modal-content
 * and adjusts modal card width dynamically based on active tab
 */
export function renderHeadToHeadDOM(preserveScroll = false): void {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('head-to-head-modal-content');
  if (!container || !selectedManagerIdA || !selectedManagerIdB) return;

  const scrollContainer = container.querySelector ? container.querySelector('.overflow-y-auto') : null;
  const prevScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

  const managerA = state.managers.find(m => m.id === selectedManagerIdA);
  const managerB = state.managers.find(m => m.id === selectedManagerIdB);

  if (!managerA || !managerB) return;

  // Dynamically adjust modal container width: max-w-2xl for duel, max-w-4xl for multi, max-w-5xl for matrix
  const dialog = document.getElementById('head-to-head-dialog');
  if (dialog) {
    if (currentH2HTab === 'matrix') {
      dialog.classList.remove('max-w-2xl', 'max-w-4xl');
      dialog.classList.add('max-w-5xl');
    } else if (currentH2HTab === 'multi') {
      dialog.classList.remove('max-w-2xl', 'max-w-5xl');
      dialog.classList.add('max-w-4xl');
    } else {
      dialog.classList.remove('max-w-4xl', 'max-w-5xl');
      dialog.classList.add('max-w-2xl');
    }
  }

  if (currentH2HTab === 'multi' && multiSelectedManagerIds.length < 3) {
    initDefaultMultiManagers();
  }

  const multiManagers = multiSelectedManagerIds
    .map(id => state.managers.find(m => m.id === id))
    .filter((m): m is Manager => Boolean(m));

  const profileReturnContext = getProfileReturnContext();
  let profileReturnManagerName: string | null = null;
  if (profileReturnContext) {
    const origMgr = state.managers.find(m => m.id === profileReturnContext.managerId);
    profileReturnManagerName = origMgr ? origMgr.name : profileReturnContext.managerId;
  }

  const stats = computeHeadToHead(managerA, managerB);
  container.innerHTML = renderHeadToHeadModalHTML(
    stats,
    state.managers,
    isChronologyExpanded,
    h2hVisualMode,
    currentH2HTab,
    currentNemesisFilter,
    profileReturnManagerName,
    multiManagers,
    hiddenMultiManagerIds,
    multiTournamentMode
  );

  if (preserveScroll && prevScrollTop > 0 && container.querySelector) {
    const newScrollContainer = container.querySelector('.overflow-y-auto');
    if (newScrollContainer) {
      newScrollContainer.scrollTop = prevScrollTop;
    }
  }
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
    clearProfileReturnContext();
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
  renderHeadToHeadDOM(true);
}

/**
 * Shortcut to open H2H modal from manager's ProfileModal
 */
export function openH2HFromProfile(): void {
  const currentId = state.selectedManagerId;
  if (!currentId) return;
  setProfileReturnContext({ managerId: currentId });
  closeProfileModal(false);

  // Find another prominent manager as B (e.g. first manager different from current)
  const otherManager = state.managers.find(m => m.id !== currentId);
  openHeadToHeadModal(currentId, otherManager?.id, 'duel', true);
}

/**
 * Opens H2H comparison with a specific opponent directly from a profile rivalry badge
 */
export function openH2HWithOpponent(managerId: string, opponentId: string): void {
  setProfileReturnContext({ managerId });
  closeProfileModal(false);
  openHeadToHeadModal(managerId, opponentId, 'duel', true);
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

  const text = buildH2HWhatsAppShareText(managerA, managerB);
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

/**
 * Exports current 1vs1 H2H Duel as high-definition 9:16 Instagram/WhatsApp Story
 */
export async function exportCurrentH2HDuelStoryHD(): Promise<void> {
  if (!selectedManagerIdA || !selectedManagerIdB) return;
  const managerA = state.managers.find(m => m.id === selectedManagerIdA);
  const managerB = state.managers.find(m => m.id === selectedManagerIdB);
  if (managerA && managerB) {
    const { exportH2HDuelStoryHD } = await import('@/export/share');
    await exportH2HDuelStoryHD(managerA, managerB);
  }
}

/**
 * Changes a manager at a specific index in the multi-manager comparison
 */
export function changeMultiManager(index: number, newId: string): void {
  if (index >= 0 && index < multiSelectedManagerIds.length) {
    const existingIdx = multiSelectedManagerIds.indexOf(newId);
    if (existingIdx !== -1) {
      multiSelectedManagerIds[existingIdx] = multiSelectedManagerIds[index];
    }
    multiSelectedManagerIds[index] = newId;
    renderHeadToHeadDOM();
    updateURL();
  }
}

/**
 * Adds next available manager to the multi-manager comparison (max 6)
 */
export function addNextMultiManager(): void {
  if (multiSelectedManagerIds.length >= 6) return;
  const next = state.managers.find(m => !multiSelectedManagerIds.includes(m.id));
  if (next) {
    multiSelectedManagerIds.push(next.id);
    renderHeadToHeadDOM();
    updateURL();
  }
}

/**
 * Removes a manager from the multi-manager comparison (min 3)
 */
export function removeMultiManager(id: string): void {
  if (multiSelectedManagerIds.length <= 3) return;
  multiSelectedManagerIds = multiSelectedManagerIds.filter(mId => mId !== id);
  hiddenMultiManagerIds.delete(id);
  renderHeadToHeadDOM();
  updateURL();
}

/**
 * Toggles visibility of a manager's polygon on the multi-manager radar
 */
export function toggleMultiManagerVisibility(id: string): void {
  if (hiddenMultiManagerIds.has(id)) {
    hiddenMultiManagerIds.delete(id);
  } else {
    if (hiddenMultiManagerIds.size < multiSelectedManagerIds.length - 1) {
      hiddenMultiManagerIds.add(id);
    }
  }
  renderHeadToHeadDOM(true);
}

/**
 * Gets currently selected multi-manager IDs
 */
export function getMultiSelectedManagerIds(): string[] {
  return [...multiSelectedManagerIds];
}

/**
 * Sets multi-manager selection IDs
 */
export function setMultiSelectedManagerIds(ids: string[]): void {
  multiSelectedManagerIds = ids.filter(id => state.managers.some(m => m.id === id));
  if (multiSelectedManagerIds.length < 3) {
    initDefaultMultiManagers();
  }
  renderHeadToHeadDOM();
  updateURL();
}

/**
 * Opens H2H modal directly into the multi-manager "Tavolo dei Rivali" tab
 */
export function openMultiManagerModal(
  managerIds?: string[],
  pushState = false
): void {
  if (state.managers.length < 2) return;
  if (managerIds && managerIds.length >= 2) {
    multiSelectedManagerIds = managerIds.filter(id => state.managers.some(m => m.id === id));
  }
  if (multiSelectedManagerIds.length < 3) {
    initDefaultMultiManagers();
  }
  openHeadToHeadModal(undefined, undefined, 'multi', pushState);
}

/**
 * Exports current Tavolo dei Rivali cluster as high-definition 9:16 Story
 */
export async function exportMultiManagerStoryHD(): Promise<void> {
  const managers = multiSelectedManagerIds
    .map(id => state.managers.find(m => m.id === id))
    .filter((m): m is Manager => Boolean(m));
  if (managers.length >= 2) {
    const { exportMultiManagerStoryHD: exportStory } = await import('@/export/share');
    await exportStory(managers, multiTournamentMode);
  }
}

/**
 * Triggers HD snapshot export for the current Tavolo dei Rivali view
 */
export async function exportCurrentMultiManagerHD(): Promise<void> {
  const { exportMultiManagerHD } = await import('@/export/share');
  await exportMultiManagerHD();
}

/**
 * Copies HD snapshot of current Tavolo dei Rivali directly to clipboard
 */
export async function copyCurrentMultiManagerToClipboard(): Promise<void> {
  const { copyMultiManagerToClipboard } = await import('@/export/share');
  await copyMultiManagerToClipboard();
}

/**
 * Generates WhatsApp share link and text for Tavolo dei Rivali
 */
export function shareMultiManagerWhatsApp(): void {
  if (multiSelectedManagerIds.length < 3) return;
  const managers = multiSelectedManagerIds
    .map(id => state.managers.find(m => m.id === id))
    .filter((m): m is Manager => Boolean(m));
  if (managers.length < 3) return;

  const text = buildMultiManagerWhatsAppShareText(managers, multiSelectedManagerIds);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }
}

// Window bindings for inline HTML onclick handlers
if (typeof window !== 'undefined') {
  const w = window as any;
  w.setH2HTab = setH2HTab;
  w.changeMultiManager = changeMultiManager;
  w.addNextMultiManager = addNextMultiManager;
  w.removeMultiManager = removeMultiManager;
  w.toggleMultiManagerVisibility = toggleMultiManagerVisibility;
  w.openMultiManagerModal = openMultiManagerModal;
  w.setMultiTournamentMode = setMultiTournamentMode;
  w.exportCurrentH2HDuelStoryHD = exportCurrentH2HDuelStoryHD;
  w.exportMultiManagerStoryHD = exportMultiManagerStoryHD;
  w.exportCurrentMultiManagerHD = exportCurrentMultiManagerHD;
  w.copyCurrentMultiManagerToClipboard = copyCurrentMultiManagerToClipboard;
  w.shareMultiManagerWhatsApp = shareMultiManagerWhatsApp;
}

