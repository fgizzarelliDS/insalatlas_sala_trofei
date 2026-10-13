import { state } from '@/state';
import { computeHeadToHead } from '@/analytics';
import { formatScore } from '@/score';
import { renderHeadToHeadModalHTML } from './HeadToHeadTemplate';
import { closeProfileModal } from '@/components/modals/ProfileModal';

let selectedManagerIdA: string | null = null;
let selectedManagerIdB: string | null = null;
let isChronologyExpanded = false;
let h2hVisualMode: 'radar' | 'bars' = 'radar';

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
 * Updates URL search parameter with ?h2h=idA:idB
 */
function updateURL(idA: string, idB: string): void {
  if (typeof window !== 'undefined' && window.history && window.location) {
    const url = new URL(window.location.href);
    url.searchParams.set('h2h', `${idA}:${idB}`);
    window.history.replaceState({ h2h: `${idA}:${idB}` }, '', url.toString());
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
 * Renders the Head-to-Head modal content into #head-to-head-modal-content
 */
export function renderHeadToHeadDOM(): void {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('head-to-head-modal-content');
  if (!container || !selectedManagerIdA || !selectedManagerIdB) return;

  const managerA = state.managers.find(m => m.id === selectedManagerIdA);
  const managerB = state.managers.find(m => m.id === selectedManagerIdB);

  if (!managerA || !managerB) return;

  const stats = computeHeadToHead(managerA, managerB);
  container.innerHTML = renderHeadToHeadModalHTML(stats, state.managers, isChronologyExpanded, h2hVisualMode);
}

/**
 * Opens Head-to-Head modal with specified or default managers
 */
export function openHeadToHeadModal(idA?: string, idB?: string): void {
  if (state.managers.length < 2) return;

  // Determine initial manager A
  let initialA = idA && state.managers.some(m => m.id === idA) ? idA : state.managers[0].id;

  // Determine initial manager B (must be different from A)
  let initialB = idB && state.managers.some(m => m.id === idB && m.id !== initialA)
    ? idB
    : state.managers.find(m => m.id !== initialA)?.id || state.managers[1].id;

  selectedManagerIdA = initialA;
  selectedManagerIdB = initialB;
  isChronologyExpanded = false;

  renderHeadToHeadDOM();
  updateURL(selectedManagerIdA, selectedManagerIdB);

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
export function closeHeadToHeadModal(): void {
  const modal = typeof document !== 'undefined' ? document.getElementById('head-to-head-modal') : null;
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  cleanURL();
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
  openHeadToHeadModal(currentId, otherManager?.id);
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

  let baseUrl = 'https://fgizzarelliids.github.io/insalatlas_sala_trofei/';
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
