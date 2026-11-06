/**
 * src/components/modals/export/StoryExportModal.ts
 * Unified Visual Story & Share Cards Hub:
 * - Preview & export high-DPI 9:16 mobile story cards for Instagram & WhatsApp
 * - 3 Distinct Visual Verticals:
 *   1. 📅 Recap & Risultati Giornata (Match scores, MVP FP, Luck Delta)
 *   2. 🎲 Quote Scudetto & Monte Carlo (Title, Podium, Mid, Flop probabilities & finish ranges)
 *   3. ⚡ Potenza & Elo Radar (3-track Elo + 5-axis tactical polygon)
 * - One-click Copy to Clipboard (Cmd+V on desktop / paste into WhatsApp) & Direct HD PNG Download
 */

import { pushOpenModal, popCloseModal } from '@/components/modals/baseModal';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { showToast } from '@/utils/toast';
import { escapeHtml } from '@/utils/dom';
import { LEAGUE } from '@/config';
import {
  renderStandingsStoryCanvas,
  renderMatchdayRecapStoryCanvas,
  renderMonteCarloStoryCanvas,
  renderTeamPowerRadarStoryCanvas,
  renderManagerStoryCanvas,
  renderTacticalStoryCanvas
} from '@/export/renderers/story';
import { state } from '@/state';
import {
  copyBlobToClipboard,
  downloadBlob
} from '@/export/renderers/core';

export type StoryCardType = 'classifica' | 'recap' | 'mc' | 'power' | 'palmares' | 'tactical';
export type StoryContext = 'league' | 'team';

interface StoryModalState {
  activeTab: StoryCardType;
  context: StoryContext;
  selectedTeamName: string;
  selectedManagerId: string;
  isGenerating: boolean;
  activeCanvas: HTMLCanvasElement | null;
}

const modalState: StoryModalState = {
  activeTab: 'classifica',
  context: 'league',
  selectedTeamName: '',
  selectedManagerId: '',
  isGenerating: false,
  activeCanvas: null
};

function getEffectiveLiveData() {
  return getLiveSeasonDetails() || (typeof window !== 'undefined' ? (window as any).liveSeasonData : null);
}

/**
 * Resolves a target identifier (teamName, managerId, or managerName) to both a teamName and managerId.
 * Supports all 20 managers (active in live season + historical/inactive).
 */
function resolveTargetSelection(target?: string, liveData?: any): { teamName: string; managerId: string } {
  const standings: any[] = liveData?.standings || [];
  const managers = state.managers || [];
  const raw = (target || '').trim();
  const rawLower = raw.toLowerCase();

  let matchedManager = raw
    ? managers.find(
        m =>
          m.id === raw ||
          m.id.toLowerCase() === rawLower ||
          m.name.toLowerCase() === rawLower
      )
    : undefined;

  let matchedStanding = raw
    ? standings.find(
        s =>
          s.teamName === raw ||
          s.teamName?.toLowerCase() === rawLower ||
          s.managerId === raw ||
          s.coach?.toLowerCase() === rawLower
      )
    : undefined;

  if (!matchedManager && matchedStanding) {
    matchedManager = managers.find(
      m =>
        m.id === matchedStanding.managerId ||
        m.name.toLowerCase() === matchedStanding.coach?.toLowerCase()
    );
  }

  if (matchedManager && !matchedStanding) {
    matchedStanding = standings.find(
      s =>
        s.managerId === matchedManager!.id ||
        s.coach?.toLowerCase() === matchedManager!.name.toLowerCase()
    );
  }

  if (!matchedManager && raw) {
    matchedManager = managers.find(m =>
      m.history?.some(h => h.team?.toLowerCase() === rawLower)
    );
  }

  const sortedHistory = matchedManager?.history
    ? [...matchedManager.history]
        .filter(h => h.team && h.team.trim() !== '')
        .sort((a, b) => (b.season || '').localeCompare(a.season || ''))
    : [];

  const resolvedManagerId =
    matchedManager?.id ||
    matchedStanding?.managerId ||
    managers[0]?.id ||
    '';

  const resolvedTeamName =
    matchedStanding?.teamName ||
    (sortedHistory.length > 0 ? sortedHistory[0].team! : '') ||
    raw ||
    standings[0]?.teamName ||
    '';

  return { teamName: resolvedTeamName, managerId: resolvedManagerId };
}

/**
 * Opens the Visual Story & Share Cards Modal
 */
export function openStoryExportModal(
  teamName?: string,
  defaultTab?: StoryCardType,
  context?: StoryContext
): void {
  const liveData = getEffectiveLiveData();
  const isAllTimeManagerTab = defaultTab === 'palmares' || defaultTab === 'tactical';
  const hasLiveStandings = Boolean(liveData && liveData.standings && liveData.standings.length > 0);
  const hasManagers = Boolean(state.managers && state.managers.length > 0);

  if (!hasLiveStandings && !(isAllTimeManagerTab && hasManagers)) {
    showToast('Nessun dato di stagione live disponibile per creare la story', 'info');
    return;
  }

  // Determine context: if explicitly passed, use it; otherwise if teamName is provided, default to 'team', else 'league'
  const resolvedContext: StoryContext = context || (teamName ? 'team' : 'league');
  modalState.context = resolvedContext;

  if (defaultTab) {
    modalState.activeTab = defaultTab;
  } else {
    modalState.activeTab = resolvedContext === 'league' ? 'classifica' : 'mc';
  }

  const resolved = resolveTargetSelection(teamName, liveData);
  modalState.selectedTeamName = resolved.teamName;
  modalState.selectedManagerId = resolved.managerId;
  modalState.isGenerating = false;
  modalState.activeCanvas = null;

  let modalEl = document.getElementById('story-export-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'story-export-modal';
    document.body.appendChild(modalEl);
  }

  renderModalShell(modalEl);
  pushOpenModal('story-export-modal', closeStoryExportModal);
  generateAndRenderPreview();
}

/**
 * Closes the Visual Story Modal
 */
export function closeStoryExportModal(): void {
  const modalEl = document.getElementById('story-export-modal');
  if (modalEl) {
    popCloseModal('story-export-modal');
    modalEl.classList.add('hidden');
    modalState.activeCanvas = null;
  }
}

/**
 * Switches the active story tab
 */
export function switchStoryExportTab(tab: StoryCardType): void {
  if (modalState.activeTab === tab || modalState.isGenerating) return;
  modalState.activeTab = tab;
  updateTabUI();
  generateAndRenderPreview();
}

/**
 * Changes the selected team or manager for team/manager-specific story cards
 */
export function changeStoryExportTeam(teamOrManagerId: string): void {
  if (modalState.isGenerating) return;
  const liveData = getEffectiveLiveData();
  const resolved = resolveTargetSelection(teamOrManagerId, liveData);
  if (
    resolved.teamName === modalState.selectedTeamName &&
    resolved.managerId === modalState.selectedManagerId &&
    teamOrManagerId === modalState.selectedTeamName
  ) {
    return;
  }
  modalState.selectedTeamName = resolved.teamName || teamOrManagerId;
  modalState.selectedManagerId = resolved.managerId;
  generateAndRenderPreview();
}

/**
 * Generates <option> elements for #story-team-select:
 * - For all-time manager tabs ('palmares' | 'tactical'): lists all managers from state.managers (active + historical)
 * - For live season tabs ('mc' | 'power'): lists active teams from liveData.standings
 */
function renderSelectorOptionsHtml(liveData: any): string {
  const standings: any[] = liveData?.standings || [];
  const managers = state.managers || [];
  const isAllTimeManagerTab = modalState.activeTab === 'palmares' || modalState.activeTab === 'tactical';

  if (isAllTimeManagerTab && managers.length > 0) {
    return managers
      .map(m => {
        const liveStanding = standings.find(
          s => s.managerId === m.id || s.coach?.toLowerCase() === m.name.toLowerCase()
        );
        const sortedHistory = [...(m.history || [])]
          .filter(h => h.team && h.team.trim() !== '')
          .sort((a, b) => (b.season || '').localeCompare(a.season || ''));
        const latestTeam = liveStanding?.teamName || (sortedHistory.length > 0 ? sortedHistory[0].team! : 'Storico');
        const isSelected = m.id === modalState.selectedManagerId;
        return `
          <option value="${escapeHtml(m.id)}" ${isSelected ? 'selected' : ''}>
            ${escapeHtml(m.name)} (${escapeHtml(latestTeam)}) — ${m.years} ${m.years === 1 ? 'Stagione' : 'Stagioni'}
          </option>
        `;
      })
      .join('');
  }

  return standings
    .map((t: any) => `
      <option value="${escapeHtml(t.teamName)}" ${t.teamName === modalState.selectedTeamName ? 'selected' : ''}>
        #${t.rank} ${escapeHtml(t.teamName)} (${escapeHtml(t.coach || 'Allenatore')})
      </option>
    `)
    .join('');
}

/**
 * Copies the current story card PNG directly to the system clipboard
 */
export async function copyCurrentStoryCard(): Promise<void> {
  if (modalState.isGenerating) return;
  if (!modalState.activeCanvas) {
    showToast('Generazione scheda in corso...', 'info');
    return;
  }

  const canvas = modalState.activeCanvas;
  canvas.toBlob(async blob => {
    if (!blob) {
      showToast('Errore durante la creazione della scheda', 'error');
      return;
    }
    const filename = `${LEAGUE.brand.name}_Story_${modalState.activeTab}_${Date.now()}.png`;
    await copyBlobToClipboard(blob, filename);
  }, 'image/png');
}

/**
 * Downloads the current story card as a high-resolution PNG file
 */
export function downloadCurrentStoryCard(): void {
  if (modalState.isGenerating) return;
  if (!modalState.activeCanvas) {
    showToast('Generazione scheda in corso...', 'info');
    return;
  }

  const canvas = modalState.activeCanvas;
  canvas.toBlob(blob => {
    if (!blob) {
      showToast('Errore durante la creazione della scheda', 'error');
      return;
    }
    const safeTeam = modalState.selectedTeamName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${LEAGUE.brand.name}_Story_${modalState.activeTab}_${safeTeam || 'Giornata'}_${Date.now()}.png`;
    downloadBlob(blob, filename);
  }, 'image/png');
}

/**
 * Renders the modal container shell and controls
 */
function renderModalShell(container: HTMLElement): void {
  const liveData = getEffectiveLiveData();
  const isAllTimeManagerTab = modalState.activeTab === 'palmares' || modalState.activeTab === 'tactical';

  container.className = 'fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md transition-opacity duration-200';
  container.innerHTML = `
    <div class="relative w-full max-w-xl max-h-[94vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
         style="background-color: var(--modal-bg, #090d16); border-color: var(--table-border, #1e293b); color: var(--text-main, #f8fafc);">
      
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b flex items-center justify-between shrink-0" style="border-color: var(--table-border, #1e293b);">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg shadow-sm">
            📸
          </div>
          <div>
            <h2 class="font-sport font-black text-lg sm:text-xl tracking-wider uppercase text-amber-400 flex items-center gap-2">
              <span>Story Cards Hub</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">HD 9:16</span>
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">
              Condividi su Instagram Stories &amp; WhatsApp in un click
            </p>
          </div>
        </div>

        <button type="button"
                onclick="window.closeStoryExportModal && window.closeStoryExportModal()"
                class="w-9 h-9 rounded-xl border flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
                style="background-color: var(--input-bg, #0f172a); border-color: var(--table-border, #1e293b);"
                title="Chiudi">
          ✕
        </button>
      </div>

      <!-- Segmented Card Vertical Switcher -->
      <div class="px-5 pt-3.5 pb-2 shrink-0 flex flex-col gap-2.5">
        <div class="flex items-center p-1 rounded-2xl border flex-wrap sm:flex-nowrap gap-1" style="background-color: var(--input-bg, #0f172a); border-color: var(--table-border, #1e293b);">
          <button type="button"
                  id="tab-story-classifica"
                  onclick="window.switchStoryExportTab && window.switchStoryExportTab('classifica')"
                  class="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${modalState.activeTab === 'classifica' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'} ${modalState.context === 'team' ? 'hidden' : ''}">
            <span>📊 Classifica Live</span>
          </button>
          <button type="button"
                  id="tab-story-recap"
                  onclick="window.switchStoryExportTab && window.switchStoryExportTab('recap')"
                  class="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${modalState.activeTab === 'recap' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'} ${modalState.context === 'team' ? 'hidden' : ''}">
            <span>📅 Recap Giornata</span>
          </button>
          <button type="button"
                  id="tab-story-mc"
                  onclick="window.switchStoryExportTab && window.switchStoryExportTab('mc')"
                  class="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${modalState.activeTab === 'mc' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'} ${modalState.context === 'league' ? 'hidden' : ''}">
            <span>🎲 Quote</span>
          </button>
          <button type="button"
                  id="tab-story-power"
                  onclick="window.switchStoryExportTab && window.switchStoryExportTab('power')"
                  class="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${modalState.activeTab === 'power' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'} ${modalState.context === 'league' ? 'hidden' : ''}">
            <span>⚡ Potenza</span>
          </button>
          <button type="button"
                  id="tab-story-palmares"
                  onclick="window.switchStoryExportTab && window.switchStoryExportTab('palmares')"
                  class="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${modalState.activeTab === 'palmares' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'} ${modalState.context === 'league' ? 'hidden' : ''}">
            <span>🏆 Palmarès</span>
          </button>
          <button type="button"
                  id="tab-story-tactical"
                  onclick="window.switchStoryExportTab && window.switchStoryExportTab('tactical')"
                  class="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${modalState.activeTab === 'tactical' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'} ${modalState.context === 'league' ? 'hidden' : ''}">
            <span>🎭 Identikit</span>
          </button>
        </div>

        <!-- Team / Manager Selector (Visible for team/manager-level cards) -->
        <div id="story-team-selector-container" class="flex items-center gap-2 ${(modalState.context === 'league' || modalState.activeTab === 'classifica' || modalState.activeTab === 'recap') ? 'hidden' : ''}">
          <label id="story-team-select-label" for="story-team-select" class="text-xs font-bold text-slate-400 shrink-0">
            ${isAllTimeManagerTab ? 'Allenatore:' : 'Squadra:'}
          </label>
          <select id="story-team-select"
                  onchange="window.changeStoryExportTeam && window.changeStoryExportTeam(this.value)"
                  class="w-full text-xs font-bold py-1.5 px-3 rounded-xl border bg-slate-900 text-white cursor-pointer"
                  style="border-color: var(--table-border, #1e293b);">
            ${renderSelectorOptionsHtml(liveData)}
          </select>
        </div>
      </div>

      <!-- Preview Canvas Area -->
      <div class="px-5 py-3 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[360px]">
        <div id="story-preview-container" class="relative w-[240px] sm:w-[270px] aspect-[9/16] rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl bg-slate-950 flex items-center justify-center">
          <div id="story-preview-spinner" class="flex flex-col items-center gap-2 text-slate-400 text-xs">
            <div class="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
            <span>Generazione Card HD in corso...</span>
          </div>
          <div id="story-preview-content" class="w-full h-full hidden"></div>
        </div>
      </div>

      <!-- Modal Actions Footer -->
      <div class="px-5 py-4 border-t flex items-center justify-between gap-3 shrink-0" style="border-color: var(--table-border, #1e293b); background-color: var(--input-bg, #0b1120);">
        <div class="text-[11px] text-slate-400 font-medium hidden sm:block">
          💡 Premi <strong>Copia</strong> per incollare direttamente su WhatsApp Web o Instagram
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button type="button"
                  id="btn-story-copy"
                  onclick="window.copyCurrentStoryCard && window.copyCurrentStoryCard()"
                  class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition flex items-center justify-center gap-2 shadow-md cursor-pointer">
            <span>📋</span>
            <span>Copia Immagine</span>
          </button>

          <button type="button"
                  id="btn-story-download"
                  onclick="window.downloadCurrentStoryCard && window.downloadCurrentStoryCard()"
                  class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 active:scale-95 transition flex items-center justify-center gap-2 shadow-sm cursor-pointer">
            <span>⬇️</span>
            <span>Scarica PNG</span>
          </button>
        </div>
      </div>

    </div>
  `;
}

/**
 * Updates active tab styling in DOM
 */
function updateTabUI(): void {
  const tabs: StoryCardType[] = ['classifica', 'recap', 'mc', 'power', 'palmares', 'tactical'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-story-${t}`);
    if (btn) {
      const isHiddenByContext =
        (modalState.context === 'league' && (t === 'mc' || t === 'power' || t === 'palmares' || t === 'tactical')) ||
        (modalState.context === 'team' && (t === 'classifica' || t === 'recap'));
      if (isHiddenByContext) {
        btn.classList.add('hidden');
      } else {
        btn.classList.remove('hidden');
      }

      if (t === modalState.activeTab) {
        btn.className = `flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer bg-amber-500 text-slate-950 shadow-sm ${isHiddenByContext ? 'hidden' : ''}`;
      } else {
        btn.className = `flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer text-slate-400 hover:text-white ${isHiddenByContext ? 'hidden' : ''}`;
      }
    }
  });

  const selectorContainer = document.getElementById('story-team-selector-container');
  if (selectorContainer) {
    if (modalState.context === 'league' || modalState.activeTab === 'classifica' || modalState.activeTab === 'recap') {
      selectorContainer.classList.add('hidden');
    } else {
      selectorContainer.classList.remove('hidden');
    }
  }

  const isAllTimeManagerTab = modalState.activeTab === 'palmares' || modalState.activeTab === 'tactical';
  const selectLabel = document.getElementById('story-team-select-label');
  if (selectLabel) {
    selectLabel.textContent = isAllTimeManagerTab ? 'Allenatore:' : 'Squadra:';
  }
  const selectEl = document.getElementById('story-team-select') as HTMLSelectElement | null;
  if (selectEl) {
    selectEl.innerHTML = renderSelectorOptionsHtml(getEffectiveLiveData());
  }
}

/**
 * Generates the requested card and renders it into the preview element
 */
async function generateAndRenderPreview(): Promise<void> {
  const liveData = getEffectiveLiveData();
  const isAllTimeManagerTab = modalState.activeTab === 'palmares' || modalState.activeTab === 'tactical';
  if (!liveData && !isAllTimeManagerTab) return;

  const spinner = document.getElementById('story-preview-spinner');
  const content = document.getElementById('story-preview-content');
  if (spinner) spinner.classList.remove('hidden');
  if (content) content.classList.add('hidden');

  modalState.isGenerating = true;

  try {
    let canvas: HTMLCanvasElement;
    const standings = liveData?.standings || [];
    const selectedTeam =
      standings.find(
        (t: any) =>
          t.teamName === modalState.selectedTeamName ||
          (modalState.selectedManagerId && t.managerId === modalState.selectedManagerId)
      ) || standings[0];

    if (modalState.activeTab === 'classifica') {
      canvas = await renderStandingsStoryCanvas(liveData);
    } else if (modalState.activeTab === 'recap') {
      canvas = await renderMatchdayRecapStoryCanvas(undefined, liveData);
    } else if (modalState.activeTab === 'mc') {
      if (!selectedTeam) throw new Error('Squadra non trovata');
      canvas = await renderMonteCarloStoryCanvas(selectedTeam, liveData);
    } else if (modalState.activeTab === 'palmares' || modalState.activeTab === 'tactical') {
      const managers = state.managers || [];
      const manager =
        managers.find(m => m.id === modalState.selectedManagerId) ||
        managers.find(
          m =>
            m.id === modalState.selectedTeamName ||
            m.name.toLowerCase() === modalState.selectedTeamName.toLowerCase()
        ) ||
        (selectedTeam && selectedTeam.managerId
          ? managers.find(m => m.id === selectedTeam.managerId)
          : managers.find(m => m.name.toLowerCase() === selectedTeam?.coach?.toLowerCase())) ||
        managers[0];
      if (!manager) throw new Error('Manager non trovato per la story');
      canvas =
        modalState.activeTab === 'palmares'
          ? await renderManagerStoryCanvas(manager)
          : await renderTacticalStoryCanvas(manager);
    } else {
      if (!selectedTeam) throw new Error('Squadra non trovata');
      canvas = await renderTeamPowerRadarStoryCanvas(selectedTeam, liveData);
    }

    modalState.activeCanvas = canvas;

    if (content) {
      content.innerHTML = '';
      const previewImg = document.createElement('img');
      previewImg.src = canvas.toDataURL('image/png');
      previewImg.className = 'w-full h-full object-cover rounded-2xl drop-shadow-xl';
      content.appendChild(previewImg);
      content.classList.remove('hidden');
    }
    if (spinner) spinner.classList.add('hidden');
  } catch (err) {
    console.error('Failed to generate story card preview:', err);
    if (spinner) {
      spinner.innerHTML = `
        <span class="text-rose-400 font-bold text-xs text-center px-4">
          Errore durante la generazione della scheda
        </span>
      `;
    }
  } finally {
    modalState.isGenerating = false;
  }
}

// Global window bindings for zero-framework HTML inline events
if (typeof window !== 'undefined') {
  (window as any).openStoryExportModal = openStoryExportModal;
  (window as any).closeStoryExportModal = closeStoryExportModal;
  (window as any).switchStoryExportTab = switchStoryExportTab;
  (window as any).changeStoryExportTeam = changeStoryExportTeam;
  (window as any).copyCurrentStoryCard = copyCurrentStoryCard;
  (window as any).downloadCurrentStoryCard = downloadCurrentStoryCard;
}
