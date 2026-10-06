import { state } from '@/state';
import { calculateManagerScore } from '@/score';
import { populateProfileModalDOM } from './ProfileModalTemplate';
import {
  shareViaWhatsApp,
  exportProfileModalHD,
  copyProfileModalToClipboard
} from '@/export';

/**
 * Switches between Tab 1 ('palmares') and Tab 2 ('career')
 */
export function switchProfileModalTab(tab: 'palmares' | 'career'): void {
  const palmaresContent = document.getElementById('profile-tab-palmares-content');
  const careerContent = document.getElementById('profile-tab-career-content');
  const btnPalmares = document.getElementById('profile-tab-btn-palmares');
  const btnCareer = document.getElementById('profile-tab-btn-career');

  const activeBtnClass =
    'min-w-0 flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 border border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-sm';
  const inactiveBtnClass =
    'min-w-0 flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 border border-transparent opacity-60 hover:opacity-100';

  if (tab === 'palmares') {
    palmaresContent?.classList.remove('hidden');
    careerContent?.classList.add('hidden');
    if (btnPalmares) btnPalmares.className = activeBtnClass;
    if (btnCareer) btnCareer.className = inactiveBtnClass;
  } else {
    palmaresContent?.classList.add('hidden');
    careerContent?.classList.remove('hidden');
    if (btnCareer) btnCareer.className = activeBtnClass;
    if (btnPalmares) btnPalmares.className = inactiveBtnClass;
  }
}

/**
 * Opens read-only manager profile modal displaying career honors and trophy shelf
 * @param id - Manager unique ID
 */
export function openProfileModal(id: string): void {
  const m = state.managers.find(item => item.id === id);
  if (!m) return;
  state.selectedManagerId = id;

  const totalMajor = (m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0);
  const score = calculateManagerScore(m);
  const successRate = m.years > 0 ? Math.round((totalMajor / m.years) * 100) : 0;

  populateProfileModalDOM(m, score, totalMajor, successRate);
  switchProfileModalTab('palmares');

  const modal = document.getElementById('manager-profile-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  // Synchronize browser URL query param with ?manager=<id>
  if (typeof window !== 'undefined' && window.history && window.location) {
    const url = new URL(window.location.href);
    url.searchParams.set('manager', id);
    window.history.replaceState({ managerId: id }, '', url.toString());
  }
}

/**
 * Closes manager profile modal and cleans URL
 */
export function closeProfileModal(): void {
  closeShareDropdown();
  const modal = document.getElementById('manager-profile-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  state.selectedManagerId = null;

  // Clear query param from browser URL
  if (typeof window !== 'undefined' && window.history && window.location) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('manager')) {
      url.searchParams.delete('manager');
      window.history.replaceState({}, '', url.toString());
    }
  }
}

/**
 * Toggles the export / share dropdown menu inside the profile modal
 */
export function toggleShareDropdown(e?: Event): void {
  if (e) {
    e.stopPropagation();
  }
  const dropdown = document.getElementById('share-dropdown-menu');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

/**
 * Closes the export / share dropdown menu inside the profile modal
 */
export function closeShareDropdown(): void {
  const dropdown = document.getElementById('share-dropdown-menu');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
  }
}

/**
 * Triggers HD Profile Modal export for currently opened profile
 */
export async function exportCurrentProfileModalHD(): Promise<void> {
  if (!state.selectedManagerId) return;
  const manager = state.managers.find(m => m.id === state.selectedManagerId);
  if (manager) {
    await exportProfileModalHD(manager);
  }
}

/**
 * Copies HD Profile Modal image directly to clipboard for currently opened profile
 */
export async function copyCurrentProfileModalToClipboard(): Promise<void> {
  if (!state.selectedManagerId) return;
  const manager = state.managers.find(m => m.id === state.selectedManagerId);
  if (manager) {
    await copyProfileModalToClipboard(manager);
  }
}

/**
 * Backward-compatibility alias for exportCurrentProfileModalHD
 */
export async function exportCurrentManagerCard(): Promise<void> {
  await exportCurrentProfileModalHD();
}

/**
 * Triggers direct WhatsApp share for currently opened profile
 */
export function shareCurrentManagerWhatsApp(): void {
  if (!state.selectedManagerId) return;
  const manager = state.managers.find(m => m.id === state.selectedManagerId);
  if (manager) {
    shareViaWhatsApp(manager);
  }
}

/**
 * Backward-compatibility alias for copyCurrentProfileModalToClipboard
 */
export async function copyCurrentManagerCardToClipboard(): Promise<void> {
  await copyCurrentProfileModalToClipboard();
}

/**
 * Toggles and populates the competition leaderboard drawer
 */
export function toggleCompetitionDrawer(competitionId: number, season?: string): void {
  if (typeof document === 'undefined') return;
  const drawer = document.getElementById(`drawer-comp-${competitionId}`);
  if (!drawer) return;

  if (!drawer.classList.contains('hidden')) {
    drawer.classList.add('hidden');
    return;
  }

  const comp = state.competitions?.find(c => c.id === competitionId);
  if (!comp || !comp.ranking || comp.ranking.length === 0) {
    drawer.innerHTML = `
      <div class="text-[11px] opacity-60 italic py-1 text-center">
        Dettaglio classifica non disponibile per questa edizione (${season || ''}).
      </div>
    `;
    drawer.classList.remove('hidden');
    return;
  }

  let rows = '';
  comp.ranking.forEach(r => {
    const isCurrentManager = state.selectedManagerId && r.managerId === state.selectedManagerId;
    const highlightClass = isCurrentManager
      ? 'bg-amber-500/15 border-l-2 border-amber-400 font-bold'
      : 'opacity-90 hover:bg-white/5';

    let rankLabel = `#${r.rank}`;
    if (r.rank === 1) rankLabel = '🥇 1°';
    else if (r.rank === 2) rankLabel = '🥈 2°';
    else if (r.rank === 3) rankLabel = '🥉 3°';

    // Canonical manager name as in the main table
    const mgr = state.managers?.find(m => m.id === r.managerId);
    const managerName = mgr ? mgr.name : (r.coach || 'Sconosciuto');

    // Points display (sanitize 2020/21 unrecorded points or cups)
    const hasValidPoints = typeof r.points === 'number' && r.points > 0 && comp.season !== '2020/21';
    const ptsStr = hasValidPoints ? `${r.points} pt` : '-';

    rows += `
      <tr class="border-b last:border-b-0 transition-colors ${highlightClass}" style="border-color: var(--table-border);">
        <td class="py-2 px-2 text-center align-middle font-bold text-xs whitespace-nowrap w-12">
          ${rankLabel}
        </td>
        <td class="py-2 px-2 text-left align-middle">
          <div class="font-bold text-xs leading-snug break-words" style="color: var(--text-main);">
            ${r.teamName}
          </div>
          <div class="text-[11px] font-semibold flex items-center gap-1 mt-0.5" style="color: var(--accent-color, #f59e0b);">
            <i class="fa-solid fa-user-tie text-[9px] opacity-70"></i>
            <span>${managerName}</span>
          </div>
        </td>
        <td class="py-2 px-2 text-right align-middle whitespace-nowrap font-mono text-xs font-bold w-16 opacity-90">
          ${ptsStr}
        </td>
      </tr>
    `;
  });

  drawer.innerHTML = `
    <div class="rounded-xl overflow-hidden border text-xs my-1" style="border-color: var(--table-border); background-color: var(--table-surface);">
      <div class="px-3 py-2 flex items-center justify-between border-b" style="border-color: var(--table-border); background-color: var(--header-bg); color: var(--header-text);">
        <span class="font-sport font-bold text-xs tracking-wide flex items-center gap-1.5">
          <i class="fa-solid fa-trophy text-amber-400"></i>
          <span>${comp.name} (${comp.season})</span>
        </span>
        <button type="button" onclick="window.toggleCompetitionDrawer(${competitionId})"
          class="text-xs font-black px-2 py-0.5 rounded-lg border transition opacity-80 hover:opacity-100 shadow-sm"
          style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
          ✕
        </button>
      </div>
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b text-[10px] uppercase font-bold tracking-wider opacity-80" style="border-color: var(--table-border); color: var(--text-muted);">
            <th class="py-1.5 px-2 text-center w-12">#</th>
            <th class="py-1.5 px-2 text-left">Squadra / Allenatore</th>
            <th class="py-1.5 px-2 text-right w-16">Punti</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  drawer.classList.remove('hidden');
}

// Bind to window for inline HTML onclick handlers
if (typeof window !== 'undefined') {
  (window as unknown as { toggleCompetitionDrawer?: typeof toggleCompetitionDrawer }).toggleCompetitionDrawer = toggleCompetitionDrawer;
  (window as unknown as { switchProfileModalTab?: typeof switchProfileModalTab }).switchProfileModalTab = switchProfileModalTab;
}
