import { Manager, AnalyticsTab, Tab2SortField, Tab2SortDirection, MacroMetricMode } from '@/types';
import { state } from '@/state';
import { verifyAdminPassword } from '@/config';
import { renderTrophySVG, renderCoachBanner } from '@/trophies';
import { calculateManagerScore, formatScore } from '@/score';
import { showToast, enableEditMode } from '@/ui';
import { saveData } from '@/storage';
import { renderBoard, updateStatistics } from '@/main';
import { computeLeagueConcentration, getManagerArchetype, computeTailRiskProfile } from '@/analytics';

/**
 * Opens read-only manager profile modal displaying career honors and trophy shelf
 * @param id - Manager unique ID
 */
export function openProfileModal(id: string): void {
  const m = state.managers.find(item => item.id === id);
  if (!m) return;

  const totalMajor = (m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0);
  const score = calculateManagerScore(m);
  const successRate = m.years > 0 ? Math.round((totalMajor / m.years) * 100) : 0;

  // 1. Vital stats
  const nameEl = document.getElementById('profile-name');
  const yearsEl = document.getElementById('profile-years-badge');
  const scoreEl = document.getElementById('profile-score');
  const rateEl = document.getElementById('profile-success-rate');
  const totalEl = document.getElementById('profile-total-titles');

  if (nameEl) nameEl.textContent = m.name;
  if (yearsEl) yearsEl.textContent = `${m.years} ${m.years === 1 ? 'Stagione disputata' : 'Stagioni disputate'}`;
  if (scoreEl) scoreEl.textContent = `${formatScore(score)} pt`;
  if (rateEl) rateEl.textContent = `${successRate}%`;
  if (totalEl) totalEl.textContent = String(totalMajor);

  // 2. Honorary Badges
  const badgesContainer = document.getElementById('profile-badges-container');
  if (badgesContainer) {
    badgesContainer.innerHTML = '';
    const badges: { label: string; icon: string; color: string; customStyle?: string }[] = [];

    // Behavioral Archetype Badge from Analytics
    const efficiency = m.years > 0 ? parseFloat((totalMajor / m.years).toFixed(2)) : 0;
    const arch = getManagerArchetype(m, totalMajor, efficiency);
    badges.push({
      label: `Profilo: ${arch.tag}`,
      icon: arch.icon,
      color: '',
      customStyle: `background: ${arch.color}25; color: ${arch.color}; border: 1px solid ${arch.color}50;`
    });

    // Net Tail Risk (NTI) Behavioral Badge
    const risk = computeTailRiskProfile(m);
    badges.push({
      label: `Rischio: ${risk.label}`,
      icon: risk.icon,
      color: '',
      customStyle: `background: ${risk.color}25; color: ${risk.color}; border: 1px solid ${risk.color}50;`
    });

    if (m.years >= 8) {
      badges.push({
        label: 'Veterano della Lega',
        icon: 'fa-shield-halved',
        color: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/60'
      });
    }
    if (totalMajor >= 4) {
      badges.push({
        label: 'Re dei Titoli',
        icon: 'fa-crown',
        color: 'bg-amber-900/60 text-amber-300 border-amber-600/60'
      });
    }
    if ((m.gold || 0) >= 2) {
      badges.push({
        label: 'Campione Seriale',
        icon: 'fa-star',
        color: 'bg-yellow-900/60 text-yellow-300 border-yellow-600/60'
      });
    }
    if ((m.cup_gold || 0) + (m.supercup || 0) >= 3) {
      badges.push({
        label: 'Re delle Coppe',
        icon: 'fa-trophy',
        color: 'bg-blue-900/60 text-blue-300 border-blue-600/60'
      });
    }
    if ((m.cartonato || 0) > 0) {
      badges.push({
        label: 'Incubo Playout',
        icon: 'fa-skull-crossbones',
        color: 'bg-rose-950/70 text-rose-300 border-rose-700/60'
      });
    }
    if ((m.spoon || 0) >= 2) {
      badges.push({
        label: 'Collezionista di Cucchiai',
        icon: 'fa-utensils',
        color: 'bg-amber-950/80 text-amber-500 border-amber-800/60'
      });
    }

    if (badges.length === 0) {
      badgesContainer.innerHTML =
        '<span class="text-xs opacity-50 italic">Nessun riconoscimento speciale sbloccato.</span>';
    } else {
      badges.forEach(b => {
        const el = document.createElement('span');
        el.className = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${b.color}`;
        if (b.customStyle) el.style.cssText = b.customStyle;
        el.innerHTML = `<i class="fa-solid ${b.icon}"></i> ${b.label}`;
        badgesContainer.appendChild(el);
      });
    }
  }

  // 3. Graphic Trophy Shelf
  const shelf = document.getElementById('profile-trophy-shelf');
  if (shelf) {
    shelf.innerHTML = '';

    const trophyTypes = [
      { label: 'Scudetti (1° Posto)', count: m.gold || 0, svg: 'gold_cup' },
      { label: 'Secondi Posti', count: m.silver || 0, svg: 'silver_cup' },
      { label: 'Terzi Posti', count: m.bronze || 0, svg: 'bronze_cup' },
      { label: 'Coppe di Lega (Oro)', count: m.cup_gold || 0, svg: 'coppa_gold' },
      { label: 'Coppe di Lega (Argento)', count: m.cup_silver || 0, svg: 'coppa_silver' },
      { label: 'Supercoppe', count: m.supercup || 0, svg: 'supercup' },
      { label: 'Mundialito', count: m.mundialito || 0, svg: 'mundialito' },
      { label: 'Cucchiai di Legno', count: m.spoon || 0, svg: 'wooden_spoon' }
    ];

    trophyTypes.forEach(t => {
      if (t.count > 0) {
        let icons = '';
        for (let i = 0; i < t.count; i++) icons += renderTrophySVG(t.svg);
        shelf.innerHTML += `
          <div class="flex items-center justify-between border-b pb-2 last:border-b-0" style="border-color: var(--table-border);">
            <span class="text-xs font-semibold opacity-80">${t.label} (x${t.count})</span>
            <div class="flex items-center gap-1">${icons}</div>
          </div>
        `;
      }
    });

    // Cartonati / Playout Banners
    const cartonatiCount = m.cartonato || 0;
    const coaches = m.coach_banners || m.cartonato_coaches || [];
    if (cartonatiCount > 0 || coaches.length > 0) {
      let banners: string[] = [];
      if (coaches.length > 0) {
        banners = coaches.map(c => renderCoachBanner(c));
      } else {
        for (let i = 0; i < cartonatiCount; i++) banners.push(renderCoachBanner('CARTONATO'));
      }
      shelf.innerHTML += `
        <div class="flex items-center justify-between pt-1">
          <span class="text-xs font-semibold opacity-80">Banner Playout</span>
          <div class="flex items-center gap-1.5 flex-wrap justify-end">${banners.join('')}</div>
        </div>
      `;
    }

    if (shelf.innerHTML.trim() === '') {
      shelf.innerHTML = '<div class="text-xs opacity-50 italic py-2 text-center">Bacheca ancora vuota.</div>';
    }
  }

  document.getElementById('manager-profile-modal')?.classList.remove('hidden');
}

/**
 * Closes manager profile modal
 */
export function closeProfileModal(): void {
  document.getElementById('manager-profile-modal')?.classList.add('hidden');
}

/**
 * Opens editor modal for adding or modifying a manager
 * @param id - Manager ID or null for new manager
 */
export async function openManagerModal(id: string | null = null): Promise<void> {
  if (!state.isEditMode) {
    const promptMsg = id
      ? '🔐 Inserisci la Password Amministratore per modificare questo allenatore:'
      : '🔐 Inserisci la Password Amministratore per aggiungere un nuovo allenatore:';

    const inputPass = prompt(promptMsg);
    if (!inputPass) return;

    const isValid = await verifyAdminPassword(inputPass);
    if (!isValid) {
      showToast('❌ Password errata. Accesso negato.', 'error');
      return;
    }

    enableEditMode();
  }

  const modal = document.getElementById('manager-modal');
  const title = document.getElementById('modal-title');
  const btnDelete = document.getElementById('btn-delete-manager');

  if (id) {
    const m = state.managers.find(item => item.id === id);
    if (!m) return;

    if (title) title.textContent = `Modifica ${m.name}`;
    (document.getElementById('field-id') as HTMLInputElement).value = m.id;
    (document.getElementById('field-name') as HTMLInputElement).value = m.name;
    (document.getElementById('field-years') as HTMLInputElement).value = String(m.years || 1);
    (document.getElementById('field-gold') as HTMLInputElement).value = String(m.gold || 0);
    (document.getElementById('field-silver') as HTMLInputElement).value = String(m.silver || 0);
    (document.getElementById('field-bronze') as HTMLInputElement).value = String(m.bronze || 0);
    (document.getElementById('field-spoon') as HTMLInputElement).value = String(m.spoon || 0);
    (document.getElementById('field-cup-gold') as HTMLInputElement).value = String(m.cup_gold || 0);
    (document.getElementById('field-cup-silver') as HTMLInputElement).value = String(m.cup_silver || 0);
    (document.getElementById('field-supercup') as HTMLInputElement).value = String(m.supercup || 0);
    (document.getElementById('field-mundialito') as HTMLInputElement).value = String(m.mundialito || 0);
    (document.getElementById('field-cartonato') as HTMLInputElement).value = String(m.cartonato || 0);

    const coaches = m.coach_banners || m.cartonato_coaches || [];
    (document.getElementById('field-cartonato-badges') as HTMLInputElement).value = coaches.join(', ');

    btnDelete?.classList.remove('hidden');
  } else {
    if (title) title.textContent = 'Nuovo Fantallenatore';
    (document.getElementById('manager-form') as HTMLFormElement)?.reset();
    (document.getElementById('field-id') as HTMLInputElement).value = '';
    (document.getElementById('field-years') as HTMLInputElement).value = '1';
    (document.getElementById('field-cartonato-badges') as HTMLInputElement).value = '';
    btnDelete?.classList.add('hidden');
  }

  modal?.classList.remove('hidden');
}

/**
 * Closes manager editor modal
 */
export function closeManagerModal(): void {
  document.getElementById('manager-modal')?.classList.add('hidden');
}

/**
 * Form submit handler for saving manager data
 * @param e - Form submit event
 */
export function saveManager(e: Event): void {
  e.preventDefault();
  const id = (document.getElementById('field-id') as HTMLInputElement).value;
  const name = (document.getElementById('field-name') as HTMLInputElement).value.trim();
  const years = parseInt((document.getElementById('field-years') as HTMLInputElement).value, 10) || 1;

  const rawBadges = (document.getElementById('field-cartonato-badges') as HTMLInputElement).value;
  const cartonatoCoaches = rawBadges
    ? rawBadges.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : [];

  const payload: Omit<Manager, 'id'> = {
    name,
    years,
    gold: parseInt((document.getElementById('field-gold') as HTMLInputElement).value, 10) || 0,
    silver: parseInt((document.getElementById('field-silver') as HTMLInputElement).value, 10) || 0,
    bronze: parseInt((document.getElementById('field-bronze') as HTMLInputElement).value, 10) || 0,
    spoon: parseInt((document.getElementById('field-spoon') as HTMLInputElement).value, 10) || 0,
    cup_gold: parseInt((document.getElementById('field-cup-gold') as HTMLInputElement).value, 10) || 0,
    cup_silver: parseInt((document.getElementById('field-cup-silver') as HTMLInputElement).value, 10) || 0,
    supercup: parseInt((document.getElementById('field-supercup') as HTMLInputElement).value, 10) || 0,
    mundialito: parseInt((document.getElementById('field-mundialito') as HTMLInputElement).value, 10) || 0,
    cartonato: parseInt((document.getElementById('field-cartonato') as HTMLInputElement).value, 10) || 0,
    coach_banners: cartonatoCoaches,
    cartonato_coaches: cartonatoCoaches
  };

  if (id) {
    const idx = state.managers.findIndex(item => item.id === id);
    if (idx !== -1) {
      state.managers[idx] = { id, ...payload };
      showToast(`Dati di ${name} salvati!`, 'success');
    }
  } else {
    const newId = 'm_' + Date.now();
    state.managers.push({ id: newId, ...payload });
    showToast(`${name} aggiunto all'Albo d'Oro!`, 'success');
  }

  saveData();
  renderBoard();
  updateStatistics();
  closeManagerModal();

  if (payload.gold > 0 || payload.mundialito > 0) {
    import('canvas-confetti').then(m => {
      m.default({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    });
  }
}

/**
 * Deletes current manager being edited
 */
export function deleteCurrentManager(): void {
  const id = (document.getElementById('field-id') as HTMLInputElement).value;
  if (!id) return;
  state.managers = state.managers.filter(item => item.id !== id);
  saveData();
  renderBoard();
  updateStatistics();
  closeManagerModal();
  showToast('Fantallenatore rimosso.', 'info');
}

/**
 * Sets up backdrop click and Escape key listeners for all modals
 */
export function initModalListeners(): void {
  const profileModal = document.getElementById('manager-profile-modal');
  const managerModal = document.getElementById('manager-modal');

  // Backdrop click: close profile modal when clicking outside card
  profileModal?.addEventListener('click', (e: MouseEvent) => {
    if (e.target === profileModal) {
      closeProfileModal();
    }
  });

  // Backdrop click: close manager modal when clicking outside card
  managerModal?.addEventListener('click', (e: MouseEvent) => {
    if (e.target === managerModal) {
      closeManagerModal();
    }
  });

  // Backdrop click: close concentration modal when clicking outside card
  const concentrationModal = document.getElementById('concentration-modal');
  concentrationModal?.addEventListener('click', (e: MouseEvent) => {
    if (e.target === concentrationModal) {
      closeConcentrationModal();
    }
  });

  // Click outside listener for tier info popover
  document.addEventListener('click', (e: MouseEvent) => {
    const popover = document.getElementById('tier-info-popover');
    if (popover && !popover.classList.contains('hidden')) {
      const target = e.target as HTMLElement;
      if (!popover.contains(target) && !target.closest('#btn-tier-info')) {
        closeTierInfo();
      }
    }
  });

  // Global Escape key handler
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      const tierPopover = document.getElementById('tier-info-popover');
      if (tierPopover && !tierPopover.classList.contains('hidden')) {
        closeTierInfo();
        return;
      }
      if (concentrationModal && !concentrationModal.classList.contains('hidden')) {
        closeConcentrationModal();
      } else if (managerModal && !managerModal.classList.contains('hidden')) {
        closeManagerModal();
      } else if (profileModal && !profileModal.classList.contains('hidden')) {
        closeProfileModal();
      }
    }
  });
}

let currentTab: AnalyticsTab = 'macro';
let tab2SortField: Tab2SortField = 'podiumRate';
let tab2SortDirection: Tab2SortDirection = 'desc';
let currentMacroMetricMode: MacroMetricMode = 'prestige';

/**
 * Toggles or sets active macro metric mode for Tab 1 ('prestige' | 'raw')
 * @param mode - Mode key
 */
export function setMacroMetricMode(mode: MacroMetricMode): void {
  currentMacroMetricMode = mode;
  renderAnalyticsModalBody();
}

/**
 * Changes active sort field or toggles direction for Tab 2
 * @param field - Sort field ('name' | 'podiumRate' | 'killerInstinct' | 'clutch')
 */
export function changeTab2Sort(field: Tab2SortField): void {
  if (tab2SortField === field) {
    tab2SortDirection = tab2SortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    tab2SortField = field;
    tab2SortDirection = field === 'name' ? 'asc' : 'desc';
  }
  renderAnalyticsModalBody();
}

/**
 * Switches the active sub-tab inside the analytics modal
 * @param tab - Target tab ('macro' | 'clutch' | 'risk')
 */
export function switchAnalyticsTab(tab: AnalyticsTab): void {
  currentTab = tab;
  renderAnalyticsModalBody();
}

/**
 * Toggles the floating contextual tier info popover in Tab 1
 * @param e - Optional click event
 */
export function toggleTierInfo(e?: Event): void {
  if (e) e.stopPropagation();
  const popover = document.getElementById('tier-info-popover');
  if (popover) {
    popover.classList.toggle('hidden');
  }
}

/**
 * Closes the floating contextual tier info popover
 */
export function closeTierInfo(): void {
  const popover = document.getElementById('tier-info-popover');
  if (popover) {
    popover.classList.add('hidden');
  }
}

/**
 * Toggles an educational guide accordion inside the concentration modal
 * @param guideId - Identifier prefix for the guide ('macro-guide' | 'risk-guide')
 */
export function toggleGuide(guideId: string): void {
  const guideContent = document.getElementById(`${guideId}-content`);
  const guideChevron = document.getElementById(`${guideId}-chevron`);
  if (guideContent && guideChevron) {
    const isHidden = guideContent.classList.contains('hidden');
    if (isHidden) {
      guideContent.classList.remove('hidden');
      guideChevron.classList.add('rotate-180');
    } else {
      guideContent.classList.add('hidden');
      guideChevron.classList.remove('rotate-180');
    }
  }
}

/**
 * Backward compatibility alias for toggleGuide
 */
export function toggleConcentrationGuide(guideId: string = 'macro-guide'): void {
  toggleGuide(guideId);
}

/**
 * Renders the internal HTML of the analytics modal according to active tab
 */
function renderAnalyticsModalBody(): void {
  const container = document.getElementById('concentration-modal-content');
  if (!container) return;

  const analysis = computeLeagueConcentration(state.managers);
  const isPrestige = currentMacroMetricMode === 'prestige';

  const activeGini = isPrestige ? analysis.giniPrestige : analysis.giniTrophies;
  const activeGiniLabel = isPrestige ? 'Gini Prestigio' : 'Gini Trofei';
  const activeCR3 = isPrestige ? analysis.cr3PrestigePct : analysis.cr3Pct;
  const activeCR3Sub = isPrestige ? 'del prestigio ai primi 3' : 'dei titoli ai primi 3';
  const activeTop3Names = isPrestige ? analysis.top3PrestigeNames : analysis.top3SilverwareNames;
  const activeTop3Label = activeTop3Names.length > 0 ? activeTop3Names.join(', ') : 'Nessuno';
  const activeHHI = isPrestige ? analysis.hhiPrestige : analysis.hhi;
  const activeHHIDesc = isPrestige ? analysis.hhiPrestigeDescription : analysis.hhiDescription;
  const activeEntropy = isPrestige ? analysis.relativeEntropyPrestige : analysis.relativeEntropy;

  const tableProfiles = isPrestige
    ? [...analysis.profiles].sort((a, b) => b.prestigeScore - a.prestigeScore || b.prestigeEfficiency - a.prestigeEfficiency)
    : [...analysis.profiles].sort((a, b) => b.trophies - a.trophies || b.efficiency - a.efficiency);

  // Sub-tab Navigation button generator
  const tabButton = (id: AnalyticsTab, label: string, icon: string) => {
    const isActive = currentTab === id;
    return `
      <button 
        type="button" 
        onclick="switchAnalyticsTab('${id}')" 
        class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${isActive ? '' : 'hover:bg-white/5'}"
        style="${isActive
        ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
        : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'
      }"
      >
        <i class="${icon}"></i>
        <span>${label}</span>
      </button>
    `;
  };

  let tabContentHTML = '';

  // TAB 1: Macro Balance & Econometrics
  if (currentTab === 'macro') {
    tabContentHTML = `
      <!-- Diagnostic Banner -->
      <div class="p-3 sm:px-3.5 sm:py-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
        <div class="relative">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${analysis.tierColor};"></span>
            <span class="text-xs sm:text-sm uppercase tracking-wider font-black" style="color: ${analysis.tierColor};">${analysis.tierTitle}</span>
            <button 
              type="button" 
              id="btn-tier-info"
              onclick="toggleTierInfo(event)" 
              class="w-4 h-4 rounded-full flex items-center justify-center transition cursor-pointer hover:bg-white/10" 
              title="Informazioni sul Tier di Lega" 
              style="color: var(--text-muted);"
            >
              <i class="fa-solid fa-circle-info text-[11px]"></i>
            </button>
          </div>
          <p class="text-xs mt-0.5 leading-snug" style="color: var(--text-main);">${analysis.tierDescription}</p>

          <!-- Floating Tier Info Popover -->
          <div 
            id="tier-info-popover" 
            class="hidden absolute z-30 top-full left-0 mt-2 w-[calc(100vw-3.5rem)] sm:w-[480px] max-w-full p-3 sm:p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md text-xs transition-all duration-200 max-h-[calc(100vh-220px)] sm:max-h-[350px] overflow-y-auto pr-1"
            style="background: var(--modal-bg); border-color: var(--table-border); color: var(--text-main); scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;"
            onclick="event.stopPropagation()"
          >
            <!-- Popover Header -->
            <div class="flex items-center justify-between pb-1.5 border-b mb-2" style="border-color: var(--table-border);">
              <div class="flex items-center gap-1.5 font-bold">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${analysis.tierColor};"></span>
                <span class="text-[11px] uppercase tracking-wider font-black" style="color: ${analysis.tierColor};">${analysis.tierTitle}</span>
              </div>
              <button type="button" onclick="closeTierInfo()" class="w-5 h-5 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition" style="color: var(--text-main);">
                <i class="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>

            <!-- Current League Explanation -->
            <div class="p-2 rounded-xl mb-2" style="background: var(--table-surface); border: 1px solid var(--table-border);">
              <span class="block text-[9px] uppercase font-bold tracking-wider mb-0.5" style="color: var(--text-muted);">Perché questo Tier?</span>
              <p class="text-[11px] leading-snug">
                ${isPrestige
        ? `Nella visualizzazione <strong>Prestigio (SPI)</strong>, i primi 3 club accentrano il <strong class="text-amber-400 font-mono">${analysis.cr3PrestigePct}%</strong> del prestigio totale e l'indice Gini Prestigio è <strong class="text-amber-400 font-mono">${analysis.giniPrestige.toFixed(2)}</strong>, configurando una <strong>Lega a Tre Velocità</strong> guidata da potenze storiche.`
        : `Nel conteggio dei <strong>Trofei Assoluti (1:1)</strong>, i primi 3 club accentrano il <strong class="text-amber-400 font-mono">${analysis.cr3Pct}%</strong> delle bacheche e l'indice antitrust <strong class="text-amber-400 font-mono">HHI (${analysis.hhi})</strong> supera la soglia di moderata concentrazione (&ge; 1800).`
      }
              </p>
            </div>

            <!-- 4 Tiers Quick Overview -->
            <span class="block text-[9px] uppercase font-bold tracking-wider mb-1" style="color: var(--text-muted);">I 4 Stadi di Competitività</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
              <div class="p-1.5 rounded-lg border flex items-start gap-1.5" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <span class="w-2 h-2 rounded-full bg-emerald-400 mt-0.5 shrink-0"></span>
                <div>
                  <strong class="text-emerald-400 font-bold block">Far West:</strong>
                  <span class="block text-[9px] leading-tight" style="color: var(--text-muted);">G &le; 0.40, CR3 &le; 45%, HHI &lt; 1400. Anarchia e massima alternanza.</span>
                </div>
              </div>
              <div class="p-1.5 rounded-lg border flex items-start gap-1.5" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <span class="w-2 h-2 rounded-full bg-blue-400 mt-0.5 shrink-0"></span>
                <div>
                  <strong class="text-blue-400 font-bold block">Competizione Aperta:</strong>
                  <span class="block text-[9px] leading-tight" style="color: var(--text-muted);">Equilibrio intermedio con rotazione dei campioni e classe media attiva.</span>
                </div>
              </div>
              <div class="p-1.5 rounded-lg border flex items-start gap-1.5" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <span class="w-2 h-2 rounded-full bg-amber-400 mt-0.5 shrink-0"></span>
                <div>
                  <strong class="text-amber-400 font-bold block">Lega a Tre Velocità:</strong>
                  <span class="block text-[9px] leading-tight" style="color: var(--text-muted);">G &gt; 0.55 o CR3 &ge; 58% o HHI &ge; 1800. Oligarchia di 3-4 potenze.</span>
                </div>
              </div>
              <div class="p-1.5 rounded-lg border flex items-start gap-1.5" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <span class="w-2 h-2 rounded-full bg-rose-400 mt-0.5 shrink-0"></span>
                <div>
                  <strong class="text-rose-400 font-bold block">Feudalesimo Assoluto:</strong>
                  <span class="block text-[9px] leading-tight" style="color: var(--text-muted);">(G &gt; 0.75 e CR3 &ge; 72%) o HHI &ge; 2500. Monopolio di 1-2 club.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 text-right shrink-0 self-end sm:self-center">
          <div class="px-2.5 py-1 rounded-lg border text-center" style="border-color: var(--table-border); background: var(--table-surface);">
            <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">${activeGiniLabel}</span>
            <span class="text-sm sm:text-base font-black text-amber-400">${activeGini.toFixed(2)}</span>
          </div>
          <div class="px-2.5 py-1 rounded-lg border text-center" style="border-color: var(--table-border); background: var(--table-surface);">
            <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">Gini Rating</span>
            <span class="text-sm sm:text-base font-black text-blue-400">${analysis.giniRating.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Core Metrics Matrix -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div class="p-2 sm:p-2.5 rounded-lg border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">${isPrestige ? 'Prestigio Top 3 (CR3)' : 'Top 3 (CR3)'}</span>
          <span class="text-base sm:text-lg font-black text-amber-400">${activeCR3}%</span>
          <span class="block text-[9px] mt-0.5 truncate" style="color: var(--text-muted);">${activeCR3Sub}</span>
        </div>

        <div class="p-2 sm:p-2.5 rounded-lg border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">Entropia (H_rel)</span>
          <span class="text-base sm:text-lg font-black text-emerald-400">${activeEntropy.toFixed(2)}</span>
          <span class="block text-[9px] mt-0.5" style="color: var(--text-muted);">1.0 = Max Parità</span>
        </div>

        <div class="p-2 sm:p-2.5 rounded-lg border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">${isPrestige ? 'Indice HHI (Prestigio)' : 'Indice HHI'}</span>
          <span class="text-base sm:text-lg font-black text-amber-400">${activeHHI}</span>
          <span class="block text-[9px] mt-0.5 truncate" style="color: var(--text-muted);">${activeHHIDesc}</span>
        </div>

        <div class="p-2 sm:p-2.5 rounded-lg border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">Malus Lega (CR3)</span>
          <span class="text-base sm:text-lg font-black text-rose-400">${analysis.cr3DishonorPct}%</span>
          <span class="block text-[9px] mt-0.5 truncate" style="color: var(--text-muted);">Cuc. &amp; Cart. nei 3 peggiori</span>
        </div>
      </div>

      <!-- Stacked Dominance Bar -->
      <div>
        <div class="flex items-center justify-between text-[11px] mb-1" style="color: var(--text-main);">
          <span class="font-bold">Egemoni del Torneo (Top 3): <span class="text-amber-400 font-semibold">${activeTop3Label}</span></span>
          <span class="font-mono font-bold">${activeCR3}%</span>
        </div>
        <div class="w-full h-2 rounded-full overflow-hidden flex bg-white/5 border" style="border-color: var(--table-border);">
          <div style="width: ${activeCR3}%; background-color: ${analysis.tierColor};" class="h-full transition-all duration-500"></div>
          <div style="width: ${100 - activeCR3}%; background: rgba(255,255,255,0.15);" class="h-full"></div>
        </div>
      </div>

      <!-- Standings Table Sub-header with Segmented Pill Toggle -->
      <div class="flex items-center justify-between gap-2 mt-2 mb-1">
        <span class="text-xs font-bold" style="color: var(--text-main);">Classifica di Rendimento</span>
        <div class="inline-flex p-0.5 rounded-lg border text-[10px]" style="background: rgba(0,0,0,0.15); border-color: var(--table-border);">
          <button 
            type="button" 
            onclick="setMacroMetricMode('prestige')" 
            class="px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1.5 ${isPrestige ? 'shadow-sm' : 'hover:bg-white/5'}"
            style="${isPrestige
        ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
        : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'}"
            title="Ponderazione per difficoltà: Scudetto (3.0), Coppa (1.5), Supercoppa (0.75), Mundialito (0.50)"
          >
            <i class="fa-solid fa-crown text-[9px]"></i>
            <span>Prestigio</span>
          </button>
          <button 
            type="button" 
            onclick="setMacroMetricMode('raw')" 
            class="px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1.5 ${!isPrestige ? 'shadow-sm' : 'hover:bg-white/5'}"
            style="${!isPrestige
        ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
        : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'}"
            title="Conteggio complessivo non ponderato dei titoli maggiori (1:1)"
          >
            <i class="fa-solid fa-trophy text-[9px]"></i>
            <span>Trofei Assoluti</span>
          </button>
        </div>
      </div>

      <!-- Silverware & Efficiency Share Table -->
      <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border);">
        <div class="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider grid grid-cols-[1fr_120px_80px] sm:grid-cols-[1fr_140px_90px] items-center border-b" style="border-color: var(--table-border); background: rgba(0,0,0,0.12); color: var(--text-muted);">
          <span>Allenatore</span>
          <span class="text-center">${isPrestige ? 'Punti Prestigio' : 'Trofei'}</span>
          <span class="text-right">Quota (%)</span>
        </div>
        <div class="divide-y max-h-[145px] overflow-y-auto pr-1" style="border-color: var(--table-border); scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
          ${tableProfiles.map((p, idx) => `
            <div class="px-3 py-1.5 grid grid-cols-[1fr_120px_80px] sm:grid-cols-[1fr_140px_90px] items-center text-xs sm:text-sm hover:bg-white/5 transition">
              <div class="flex items-center gap-2 min-w-0 pr-2">
                <span class="w-4 text-center font-bold text-[11px] shrink-0 ${idx < 3 ? 'text-amber-400 font-black' : ''}" style="${idx >= 3 ? 'color: var(--text-muted);' : ''}">${idx + 1}</span>
                <span class="font-bold truncate" style="color: var(--text-main);">${p.name}</span>
                <span class="text-[11px] shrink-0 hidden sm:inline" style="color: var(--text-muted);">
                  ${isPrestige ? `(${p.trophies} tit. | ${p.prestigeScore} pt)` : `(${p.trophies} titol${p.trophies === 1 ? 'o' : 'i'})`}
                </span>
              </div>
              <span class="font-mono text-xs text-center" style="color: var(--text-muted);">
                ${isPrestige ? `${p.prestigeEfficiency} pt/anno` : `${p.efficiency} tit/anno`}
              </span>
              <span class="font-mono font-bold text-xs text-right" style="color: var(--text-main);">
                ${(isPrestige ? p.prestigeSharePct : p.trophySharePct).toFixed(1)}%
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Collapsible Educational Info Box for Macro Econometrics -->
      <div class="border rounded-xl overflow-hidden text-xs mt-2" style="border-color: var(--table-border); background: var(--table-surface);">
        <button type="button" onclick="toggleGuide('macro-guide')" class="w-full px-3.5 py-2 flex items-center justify-between font-bold text-left transition hover:bg-white/5" style="color: var(--text-main);">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-question text-amber-400 text-xs"></i>
            <span>Guida Matematica agli Indici Econometrici</span>
          </div>
          <i id="macro-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-xs" style="color: var(--text-muted);"></i>
        </button>
        <div id="macro-guide-content" class="px-4 pb-4 pt-1 space-y-3 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
          <div>
            <div class="flex items-center justify-between">
              <strong class="font-semibold" style="color: var(--text-main);">Indice di Prestigio (SPI):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">3.0·Scud + 1.5·Coppa + 0.75·SC + 0.50·Mund</code>
            </div>
            <p class="mt-0.5">Pondera le competizioni in base alla loro difficoltà strutturale, distinguendo le maratone di 38 turni dalla varianza delle coppe a gara secca. Il selettore sopra la classifica consente di alternare la vista tra Prestigio (SPI) e Trofei Assoluti.</p>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <strong class="font-semibold" style="color: var(--text-main);">Gini Prestigio / Trofei:</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">G = (2 ∑ i·Y_i) / (n ∑ Y_i) - (n+1)/n</code>
            </div>
            <p class="mt-0.5">Misura la disuguaglianza nella distribuzione del prestigio ponderato o dei titoli assoluti. Varia tra 0.0 (parità assoluta) e 1.0 (monopolio totale).</p>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <strong class="font-semibold" style="color: var(--text-main);">Gini Rating (G_rating):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">R'_i = R_i - min(0, min R_j)</code>
            </div>
            <p class="mt-0.5">Misura la concentrazione del punteggio storico normalizzato su scala non-negativa (include podi, coppe, cucchiai e malus playout).</p>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <strong class="font-semibold" style="color: var(--text-main);">Entropia Relativa di Informazione (H_rel):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">H_rel = (-∑ p_i ln p_i) / ln(n)</code>
            </div>
            <p class="mt-0.5">Indica il grado di dispersione informativa dei titoli (1.0 = massima alternanza e parità fra tutti i partecipanti, 0.0 = accentramento estremo).</p>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <strong class="font-semibold" style="color: var(--text-main);">Indice HHI (Herfindahl-Hirschman):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">HHI = ∑ (Quota_i %)^2</code>
            </div>
            <p class="mt-0.5">Misura antitrust standard di mercato: &lt;1500 (mercato aperto), 1500-2500 (moderata concentrazione), &gt;2500 (oligopolio dinastico).</p>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <strong class="font-semibold" style="color: var(--text-main);">Malus di Lega (CR3 Disonori):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">(Top 3 Disonori / Totale Disonori) × 100</code>
            </div>
            <p class="mt-0.5">Percentuale di Cucchiai di Legno e Cartonati subiti dai 3 manager più penalizzati. Misura se le sventure sono concentrate su pochi o distribuite democraticamente.</p>
          </div>
        </div>
      </div>
    `;
  }

  // TAB 2: Clutch vs Bottler & Podiums
  else if (currentTab === 'clutch') {
    const clutchSorted = [...analysis.profiles].sort((a, b) => {
      let cmp = 0;
      if (tab2SortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (tab2SortField === 'podiumRate') {
        cmp = (b.podiumRatePct - a.podiumRatePct) || (b.killerInstinctPct - a.killerInstinctPct) || (b.podiums - a.podiums) || (b.trophies - a.trophies);
      } else if (tab2SortField === 'killerInstinct') {
        cmp = (b.killerInstinctPct - a.killerInstinctPct) || (b.gold - a.gold) || (b.podiums - a.podiums);
      } else if (tab2SortField === 'clutch') {
        cmp = (b.conversionRatePct - a.conversionRatePct) || (b.finalsWon - a.finalsWon) || (b.finalsPlayed - a.finalsPlayed) || (b.trophies - a.trophies);
      }
      return tab2SortDirection === 'desc' ? cmp : -cmp;
    });

    const sortIcon = (field: Tab2SortField) => {
      if (tab2SortField !== field) {
        return '<i class="fa-solid fa-sort opacity-30 text-[9px] ml-1"></i>';
      }
      return tab2SortDirection === 'desc'
        ? '<i class="fa-solid fa-arrow-down-wide-short text-amber-400 text-[10px] ml-1"></i>'
        : '<i class="fa-solid fa-arrow-up-short-wide text-amber-400 text-[10px] ml-1"></i>';
    };

    tabContentHTML = `
      <div class="px-3 py-2 rounded-xl border text-xs" style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
        <p><strong class="font-bold" style="color: var(--text-main);">Cinismo, Podi &amp; Killer Instinct:</strong> Clicca sulle intestazioni delle colonne per ordinare alfabeticamente o per tasso podio, killer instinct e cinismo nelle finali.</p>
      </div>

      <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border);">
        <div class="px-3 py-2 text-[11px] uppercase font-bold tracking-wider grid grid-cols-[1fr_95px_88px_95px] sm:grid-cols-[1fr_120px_110px_120px] gap-2 items-center border-b select-none" style="border-color: var(--table-border); background: rgba(0,0,0,0.12); color: var(--text-muted);">
          <button type="button" onclick="changeTab2Sort('name')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider truncate min-w-0">
            <span>Allenatore</span>
            ${sortIcon('name')}
          </button>
          <button type="button" onclick="changeTab2Sort('podiumRate')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider whitespace-nowrap">
            <span>Tasso Podio</span>
            ${sortIcon('podiumRate')}
          </button>
          <button type="button" onclick="changeTab2Sort('killerInstinct')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider whitespace-nowrap">
            <span>Killer Inst.</span>
            ${sortIcon('killerInstinct')}
          </button>
          <button type="button" onclick="changeTab2Sort('clutch')" class="flex items-center justify-end hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider whitespace-nowrap">
            <span>Cinismo Finali</span>
            ${sortIcon('clutch')}
          </button>
        </div>
        <div class="divide-y max-h-[195px] overflow-y-auto pr-1" style="border-color: var(--table-border); scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
          ${clutchSorted.map((p, idx) => `
            <div class="px-3 py-1.5 grid grid-cols-[1fr_95px_88px_95px] sm:grid-cols-[1fr_120px_110px_120px] gap-2 items-center text-xs sm:text-sm hover:bg-white/5 transition">
              <!-- Allenatore -->
              <div class="min-w-0 flex items-center gap-1.5 pr-1">
                <span class="w-4 text-center font-bold text-[10px] shrink-0 ${idx < 3 ? 'text-amber-400 font-black' : ''}" style="${idx >= 3 ? 'color: var(--text-muted);' : ''}">${idx + 1}</span>
                <div class="min-w-0">
                  <span class="font-bold block truncate text-xs sm:text-sm" style="color: var(--text-main);">${p.name}</span>
                  <span class="text-[10px] block truncate" style="color: var(--text-muted);">${p.years} ann${p.years === 1 ? 'o' : 'i'}</span>
                </div>
              </div>

              <!-- Tasso Podio (PR%) -->
              <div class="text-center">
                <span class="font-mono font-bold text-xs ${p.podiumRatePct >= 50 ? 'text-amber-400 font-black' : ''}" style="${p.podiumRatePct < 50 ? 'color: var(--text-main);' : ''}">
                  ${p.podiumRatePct.toFixed(1)}%
                </span>
                <span class="block text-[9px] font-mono" style="color: var(--text-muted);">${p.podiums}/${p.years}</span>
              </div>

              <!-- Killer Instinct (KI%) -->
              <div class="text-center">
                <span class="font-mono font-bold text-xs ${p.podiums === 0 ? 'opacity-40' : p.killerInstinctPct >= 60 ? 'text-emerald-400 font-black' : p.killerInstinctPct <= 25 ? 'text-orange-400' : ''}" style="${p.podiums > 0 && p.killerInstinctPct > 25 && p.killerInstinctPct < 60 ? 'color: var(--text-main);' : ''}">
                  ${p.podiums > 0 ? `${p.killerInstinctPct.toFixed(0)}%` : '—'}
                </span>
                <span class="block text-[9px] font-mono" style="color: var(--text-muted);">${p.podiums > 0 ? `${p.gold}/${p.podiums} ${p.gold === 1 ? 'oro' : 'ori'}` : '0 podi'}</span>
              </div>

              <!-- Cinismo Finali (CR%) -->
              <div class="text-right">
                <span class="font-mono font-bold text-xs ${p.finalsPlayed === 0 ? 'opacity-40' : p.conversionRatePct >= 70 ? 'text-emerald-400 font-black' : p.conversionRatePct <= 35 && p.finalsPlayed >= 2 ? 'text-indigo-400 font-bold' : ''}" style="${p.finalsPlayed > 0 && (p.conversionRatePct > 35 || p.finalsPlayed < 2) && p.conversionRatePct < 70 ? 'color: var(--text-main);' : ''}">
                  ${p.finalsPlayed > 0 ? `${p.conversionRatePct.toFixed(0)}%` : '—'}
                </span>
                <span class="block text-[9px] font-mono" style="color: var(--text-muted);">${p.finalsPlayed > 0 ? `${p.finalsWon}/${p.finalsPlayed} v.` : '0 fin.'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Collapsible Educational Info Box for Clutch & Podiums -->
      <div class="border rounded-xl overflow-hidden text-xs mt-2" style="border-color: var(--table-border); background: var(--table-surface);">
        <button type="button" onclick="toggleGuide('clutch-guide')" class="w-full px-3.5 py-2 flex items-center justify-between font-bold text-left transition hover:bg-white/5" style="color: var(--text-main);">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-question text-amber-400 text-xs"></i>
            <span>Guida Matematica a Podi &amp; Cinismo</span>
          </div>
          <i id="clutch-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-xs" style="color: var(--text-muted);"></i>
        </button>
        <div id="clutch-guide-content" class="px-4 pb-4 pt-1 space-y-3 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
          <div>
            <div class="flex items-center justify-between">
              <strong class="font-semibold" style="color: var(--text-main);">Tasso di Presenza a Podio (PR%):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">PR% = (Ori + Argenti + Bronzi) / Anni × 100</code>
            </div>
            <p class="mt-0.5">Misura la costanza al vertice nella stagione regolare. Valori ≥ 50% indicano un candidato permanente alle primissime posizioni della classifica.</p>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <strong class="font-semibold" style="color: var(--text-main);">Killer Instinct (KI%):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">KI% = Scudetti / Podi × 100</code>
            </div>
            <p class="mt-0.5">Misura la letalità del podio: la capacità di convertire una stagione da vertice nel trionfo massimo (Scudetto) invece di accontentarsi dei piazzamenti (Argento o Bronzo). Se non ci sono podi, il valore è non definito (—).</p>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <strong class="font-semibold" style="color: var(--text-main);">Cinismo nelle Finali (CR%):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">CR% = (Scudetti + Coppe Vinte) / Finali Totali × 100</code>
            </div>
            <p class="mt-0.5">Rapporto tra finali vinte e disputate (Scudetti e Coppe di Lega, considerando Ori e Argenti). Identifica chi esalta il proprio rendimento negli scontri diretti e chi risente della pressione decisiva.</p>
          </div>
        </div>
      </div>
    `;
  }

  // TAB 3: Risk Archetypes & Feast-or-Famine
  else if (currentTab === 'risk') {
    tabContentHTML = `
      <div class="px-3 py-2 rounded-xl border text-xs" style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
        <p><strong class="font-bold" style="color: var(--text-main);">Archetipi &amp; Filosofie di Roster:</strong> Analisi di coda per misurare la volatilità estrema di ciascun mister (Scudetti vs Retrocessioni e Playout) tramite regolarizzazione Bayesiana e Net Tail Skew.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 h-[238px] max-h-[238px] overflow-y-auto pr-1 snap-y snap-mandatory scroll-smooth" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
        ${analysis.profiles.map(p => `
          <div class="px-2.5 py-1.5 rounded-xl border flex flex-col justify-between snap-start" style="height: 74px; background: var(--table-surface); border-color: var(--table-border);">
            <div class="flex items-center justify-between gap-1.5 min-w-0">
              <span class="font-bold text-xs sm:text-sm truncate" style="color: var(--text-main);">${p.name}</span>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0" style="background: ${p.archetypeColor}20; color: ${p.archetypeColor}; border: 1px solid ${p.archetypeColor}40;">
                <i class="fa-solid ${p.archetypeIcon} text-[8px]"></i>
                ${p.archetypeTag}
              </span>
            </div>
            <div class="grid grid-cols-3 gap-1 text-[10px] border-t pt-1 mt-1" style="border-color: var(--table-border); color: var(--text-muted);">
              <div>
                <span class="block text-[8px] uppercase font-bold opacity-60 leading-none mb-0.5 truncate">FF Bayes</span>
                <span class="font-mono font-bold text-xs leading-none" style="color: var(--text-main);">${p.smoothedFeastOrFamine.toFixed(2)}</span>
              </div>
              <div class="text-center">
                <span class="block text-[8px] uppercase font-bold opacity-60 leading-none mb-0.5 truncate">Net Skew</span>
                <span class="font-mono font-bold text-xs leading-none ${p.netTailSkew > 0 ? 'text-emerald-400 font-bold' : p.netTailSkew < 0 ? 'text-rose-400 font-bold' : ''}">${p.netTailSkew > 0 ? '+' : ''}${p.netTailSkew.toFixed(2)}</span>
              </div>
              <div class="text-right">
                <span class="block text-[8px] uppercase font-bold opacity-60 leading-none mb-0.5 truncate">Indice NTI</span>
                <span class="font-mono font-bold text-xs leading-none block" style="color: ${p.polarityColor};">
                  <i class="fa-solid ${p.polarityIcon} text-[8px] mr-0.5"></i>${p.netTailIndex > 0 ? '+' : ''}${p.netTailIndex.toFixed(2)}
                </span>
                <span class="block text-[8px] font-semibold leading-tight truncate mt-0.5" style="color: ${p.polarityColor};">${p.polarityLabel}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Collapsible Educational Info Box for Risk Profiles & Archetypes -->
      <div class="border rounded-xl overflow-hidden text-xs mt-2" style="border-color: var(--table-border); background: var(--table-surface);">
        <button type="button" onclick="toggleGuide('risk-guide')" class="w-full px-3.5 py-2 flex items-center justify-between font-bold text-left transition hover:bg-white/5" style="color: var(--text-main);">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-question text-amber-400 text-xs"></i>
            <span>Guida agli Archetipi &amp; Indici di Coda (FF, NTS, NTI)</span>
          </div>
          <i id="risk-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-xs" style="color: var(--text-muted);"></i>
        </button>
        <div id="risk-guide-content" class="px-4 pb-4 pt-2 space-y-3.5 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
          
          <!-- Feast-or-Famine Hero Banner -->
          <div class="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3" style="border-color: var(--table-border); background: rgba(0,0,0,0.03);">
            <div>
              <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Indici di Coda &amp; Volatilità</span>
              <strong class="text-xs sm:text-sm font-bold block" style="color: var(--text-main);">Feast-or-Famine (FF̃), Net Skew (NTS) &amp; Net Tail Index (NTI)</strong>
              <p class="text-[11px] mt-0.5 leading-relaxed" style="color: var(--text-muted);">
                La regolarizzazione Bayesiana stabilizza gli estremi verso la media di lega (${analysis.leagueAverageFF.toFixed(2)}/anno). Il Net Tail Skew misura lo sbilanciamento tra trionfi e baratro (con prior M=1.5). L'indice NTI sintetizza magnitudo e polarità in 5 profili comportamentali.
              </p>
            </div>
            <div class="shrink-0 flex flex-col gap-1.5 self-start sm:self-center font-mono text-[9px] text-center">
              <div class="px-2 py-0.5 rounded-lg border font-bold" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                FF̃ = (Coda + 2 × FF̄) / (Anni + 2)
              </div>
              <div class="px-2 py-0.5 rounded-lg border font-bold" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                NTS = (Feast - Disaster) / (Coda + 1.5)
              </div>
              <div class="px-2 py-0.5 rounded-lg border font-bold" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                NTI = FF̃ × NTS ∈ [-1.0, +1.0]
              </div>
            </div>
          </div>

          <!-- NTI Tiers Summary -->
          <div class="border rounded-xl p-3" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
            <span class="block text-[10px] uppercase font-bold tracking-wider mb-2" style="color: var(--text-main);">Fasce di Rischio NTI (Net Tail Index)</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div class="flex items-center gap-2 p-1.5 rounded-lg border" style="border-color: var(--table-border); background: var(--table-surface);">
                <i class="fa-solid fa-bolt text-emerald-400 text-xs shrink-0"></i>
                <div>
                  <strong style="color: #10b981;">Cannibale Assoluto</strong> (NTI &gt; +0.30)
                  <p class="text-[10px] opacity-75">Alta volatilità tutta orientata al trionfo</p>
                </div>
              </div>
              <div class="flex items-center gap-2 p-1.5 rounded-lg border" style="border-color: var(--table-border); background: var(--table-surface);">
                <i class="fa-solid fa-crosshairs text-emerald-400 text-xs shrink-0"></i>
                <div>
                  <strong style="color: #34d399;">Attaccante Efficace</strong> (+0.08 .. +0.30)
                  <p class="text-[10px] opacity-75">Rischia e ottiene più vittorie che baratro</p>
                </div>
              </div>
              <div class="flex items-center gap-2 p-1.5 rounded-lg border" style="border-color: var(--table-border); background: var(--table-surface);">
                <i class="fa-solid fa-scale-balanced text-slate-400 text-xs shrink-0"></i>
                <div>
                  <strong style="color: #94a3b8;">Neutro / Bilanciato</strong> (-0.08 .. +0.08)
                  <p class="text-[10px] opacity-75">Rendimento costante a metà o 50/50 puro</p>
                </div>
              </div>
              <div class="flex items-center gap-2 p-1.5 rounded-lg border" style="border-color: var(--table-border); background: var(--table-surface);">
                <i class="fa-solid fa-shield-halved text-amber-400 text-xs shrink-0"></i>
                <div>
                  <strong style="color: #f59e0b;">Vulnerabile</strong> (-0.30 .. -0.08)
                  <p class="text-[10px] opacity-75">Spesso a rischio nei bassifondi della classifica</p>
                </div>
              </div>
              <div class="flex items-center gap-2 p-1.5 rounded-lg border sm:col-span-2" style="border-color: var(--table-border); background: var(--table-surface);">
                <i class="fa-solid fa-bullseye text-rose-400 text-xs shrink-0"></i>
                <div>
                  <strong style="color: #ef4444;">Bersaglio Mobile</strong> (NTI &le; -0.30)
                  <p class="text-[10px] opacity-75">Alta volatilità con tendenza autodistruttiva (cucchiai/playout)</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Collapsible Waterfall Rules -->
          <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
            <button type="button" onclick="toggleGuide('waterfall-rules')" class="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] font-bold transition hover:bg-white/5" style="color: var(--text-main);">
              <div class="flex items-center gap-1.5">
                <i class="fa-solid fa-layer-group text-amber-400 text-[10px]"></i>
                <span>Regole di Assegnazione &amp; Priorità (Waterfall a 9 Livelli)</span>
              </div>
              <i id="waterfall-rules-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-[10px]" style="color: var(--text-muted);"></i>
            </button>
            <div id="waterfall-rules-content" class="px-3 pb-3 pt-1 border-t hidden space-y-1.5" style="border-color: var(--table-border); color: var(--text-muted);">
              <p class="text-[11px] leading-relaxed">
                Se un manager soddisfa più requisiti, il motore assegna l'archetipo che compare prima in questo ordine gerarchico deterministico:
              </p>
              <div class="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">1. Dominatore</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">2. Vittima</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">3. Cannibale</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">4. Cinico</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">5. Grande Piazzato</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">6. Eterno 2°</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">7. All-or-Nothing</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">8. Grinder</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">9. Partecipante</span>
              </div>
            </div>
          </div>

          <!-- Archetypes Cards Grid (Clean 2-Column Micro-Cards) -->
          <div>
            <span class="block text-[11px] uppercase font-bold tracking-wider mb-2" style="color: var(--text-main);">Tassonomia dei 9 Archetipi</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              <!-- 1. Dominatore Dinastico -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.3);">
                      <i class="fa-solid fa-crown text-[9px]"></i> Dominatore Dinastico
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Titoli ≥ 4 &amp; (Efficienza ≥ 0.40 o Scudetti ≥ 2)
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Egemone cannibale: accumula vittorie a ritmo insostenibile e impone cicli dittatoriali.
                  </p>
                </div>
              </div>

              <!-- 2. Vittima Sacrificale -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3);">
                      <i class="fa-solid fa-skull-crossbones text-[9px]"></i> Vittima Sacrificale
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Disonori ≥ 3 oppure (Disonori ≥ 2 &amp; Titoli = 0)
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Abbonato al muro della vergogna: colleziona retrocessioni e cucchiai senza aver mai assaporato l'oro.
                  </p>
                </div>
              </div>

              <!-- 3. Cannibale del Podio -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3);">
                      <i class="fa-solid fa-trophy text-[9px]"></i> Cannibale del Podio
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Tasso Podio ≥ 50% &amp; KI ≥ 60% (min. 2 Podi)
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Sentenza in campionato: frequenta stabilmente il vertice e converte quasi ogni podio in Scudetto.
                  </p>
                </div>
              </div>

              <!-- 4. Cinico Chirurgico -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);">
                      <i class="fa-solid fa-crosshairs text-[9px]"></i> Cinico Chirurgico
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Finali ≥ 2 &amp; Conversione Finali ≥ 70%
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Freddo e letale nelle partite secche: trasforma quasi ogni finale scudetto o coppa in trionfo.
                  </p>
                </div>
              </div>

              <!-- 5. Il Grande Piazzato -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(217,119,6,0.15); color: #d97706; border: 1px solid rgba(217,119,6,0.3);">
                      <i class="fa-solid fa-ranking-star text-[9px]"></i> Il Grande Piazzato
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Podi ≥ 3 &amp; Killer Instinct ≤ 25%
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Presenza costante nei quartieri alti, ma condannato a fare da testimone ai trionfi altrui.
                  </p>
                </div>
              </div>

              <!-- 6. Eterno Secondo -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(99,102,241,0.15); color: #6366f1; border: 1px solid rgba(99,102,241,0.3);">
                      <i class="fa-solid fa-medal text-[9px]"></i> Eterno Secondo
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Argenti (Camp.+Coppa) ≥ 2 &amp; Conversione ≤ 35%
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Sindrome di Cúper: costantemente all'atto conclusivo ma punito dal destino o dalla tensione.
                  </p>
                </div>
              </div>

              <!-- 7. All-or-Nothing -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(249,115,22,0.15); color: #f97316; border: 1px solid rgba(249,115,22,0.3);">
                      <i class="fa-solid fa-dice text-[9px]"></i> All-or-Nothing
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    FF̃ ≥ 0.45 &amp; Titoli ≥ 1 &amp; Disonori ≥ 1
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Roster spericolato: vive oscillando tra l'estasi del trionfo e l'onta del cucchiaio o playout.
                  </p>
                </div>
              </div>

              <!-- 8. Grinder Metodico -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(6,182,212,0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3);">
                      <i class="fa-solid fa-shield-halved text-[9px]"></i> Grinder Metodico
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Tasso Podio ≥ 30% &amp; Disonori = 0 &amp; Anni ≥ 3
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Gestione solida e pragmatica: evita costantemente i bassifondi e macina piazzamenti regolari.
                  </p>
                </div>
              </div>

              <!-- 9. Partecipante -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3);">
                      <i class="fa-solid fa-user-tie text-[9px]"></i> Partecipante
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Profilo standard o storico in consolidamento
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Condotta di gara senza eccessi agli estremi, in attesa della stagione della svolta.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <!-- Archetipo vs Badge Note -->
          <div class="p-2.5 rounded-xl border text-[10px] sm:text-[11px] flex items-center gap-2" style="border-color: var(--table-border); background: rgba(0,0,0,0.02); color: var(--text-muted);">
            <i class="fa-solid fa-circle-info text-blue-400 shrink-0 text-xs"></i>
            <span><strong style="color: var(--text-main);">Archetipo Primario vs Badge:</strong> Ciascun mister riceve un solo <em>Archetipo Primario</em> distintivo del proprio stile storico, mentre i <em>Badge di Merito</em> (es. Triplete, Decano, Stella) si accumulano liberamente nella bacheca personale.</span>
          </div>

        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Modal Fixed Header -->
    <div class="px-5 py-3 sm:px-6 sm:py-3.5 border-b flex items-center justify-between shrink-0" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-sm" style="background: rgba(255,255,255,0.05); border: 1px solid var(--table-border);">
          <i class="fa-solid fa-chart-pie text-amber-400"></i>
        </div>
        <div>
          <h2 class="flex items-center gap-2 text-sm sm:text-base font-black tracking-tight" style="color: var(--text-main);">
            <span>Analisi InsalAtlas</span>
            <img src="favicon-64x64.png" alt="InsalAtlas logo" class="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
          </h2>
          <span class="text-[11px]" style="color: var(--text-muted);">Analisi &amp; Filosofie di Roster</span>
        </div>
      </div>
      <button type="button" onclick="closeConcentrationModal()" class="w-7 h-7 rounded-full flex items-center justify-center transition border"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>

    <!-- Navigation Tabs Bar -->
    <div class="px-5 sm:px-6 py-2 border-b flex items-center gap-2 overflow-x-auto shrink-0" style="border-color: var(--table-border); background: rgba(0,0,0,0.08);">
      ${tabButton('macro', 'Equilibrio & Macro', 'fa-solid fa-scale-balanced')}
      ${tabButton('clutch', 'Cinismo & Podi', 'fa-solid fa-bullseye')}
      ${tabButton('risk', 'Archetipi', 'fa-solid fa-dice')}
    </div>

    <!-- Modal Scrollable Body -->
    <div class="px-5 py-3 sm:px-6 sm:py-3.5 overflow-y-auto space-y-2.5 flex-1 min-h-0">
      
      <!-- Dynamic Tab Content -->
      ${tabContentHTML}

    </div>

    <!-- Modal Fixed Footer -->
    <div class="px-5 py-2.5 sm:px-6 sm:py-3 border-t flex justify-end shrink-0" style="border-color: var(--table-border);">
      <button type="button" onclick="closeConcentrationModal()" class="px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition shadow-sm"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        Chiudi
      </button>
    </div>
  `;
}

/**
 * Opens modal displaying league concentration, econometric balance, and historical parity
 */
export function openConcentrationModal(): void {
  const modal = document.getElementById('concentration-modal');
  if (!modal) return;
  currentTab = 'macro';
  currentMacroMetricMode = 'prestige';
  renderAnalyticsModalBody();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

/**
 * Closes concentration modal
 */
export function closeConcentrationModal(): void {
  closeTierInfo();
  const modal = document.getElementById('concentration-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

