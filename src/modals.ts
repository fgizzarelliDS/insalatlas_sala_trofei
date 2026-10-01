import confetti from 'canvas-confetti';
import { Manager, AnalyticsTab } from './types';
import { state } from './state';
import { verifyAdminPassword } from './config';
import { renderTrophySVG, renderCoachBanner } from './trophies';
import { calculateManagerScore, formatScore } from './score';
import { showToast, enableEditMode } from './ui';
import { saveData } from './storage';
import { renderBoard, updateStatistics } from './main';
import { computeLeagueConcentration, getManagerArchetype } from './analytics';

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
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
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

  // Global Escape key handler
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
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

/**
 * Switches the active sub-tab inside the analytics modal
 * @param tab - Target tab ('macro' | 'clutch' | 'risk')
 */
export function switchAnalyticsTab(tab: AnalyticsTab): void {
  currentTab = tab;
  renderAnalyticsModalBody();
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
  const top3Label = analysis.top3SilverwareNames.length > 0 ? analysis.top3SilverwareNames.join(', ') : 'Nessuno';

  // Sub-tab Navigation button generator
  const tabButton = (id: AnalyticsTab, label: string, icon: string) => {
    const isActive = currentTab === id;
    return `
      <button 
        type="button" 
        onclick="switchAnalyticsTab('${id}')" 
        class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${isActive ? '' : 'hover:bg-white/5'}"
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
      <div class="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${analysis.tierColor};"></span>
            <span class="text-sm uppercase tracking-widest font-black" style="color: ${analysis.tierColor};">${analysis.tierTitle}</span>
          </div>
          <p class="text-xs sm:text-sm mt-1" style="color: var(--text-main);">${analysis.tierDescription}</p>
        </div>
        <div class="flex items-center gap-2 text-right shrink-0 self-end sm:self-center">
          <div class="px-3 py-1.5 rounded-xl border text-center" style="border-color: var(--table-border); background: var(--table-surface);">
            <span class="block text-[10px] uppercase font-bold" style="color: var(--text-muted);">Gini Trofei</span>
            <span class="text-base sm:text-lg font-black text-amber-400">${analysis.giniTrophies.toFixed(2)}</span>
          </div>
          <div class="px-3 py-1.5 rounded-xl border text-center" style="border-color: var(--table-border); background: var(--table-surface);">
            <span class="block text-[10px] uppercase font-bold" style="color: var(--text-muted);">Gini Rating</span>
            <span class="text-base sm:text-lg font-black text-blue-400">${analysis.giniRating.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Core Metrics Matrix -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 rounded-xl border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <span class="block text-[10px] uppercase font-bold" style="color: var(--text-muted);">Top 3 (CR3)</span>
          <span class="text-xl font-black text-amber-400">${analysis.cr3Pct}%</span>
          <span class="block text-[10px] mt-0.5" style="color: var(--text-muted);">dei titoli ai primi 3</span>
        </div>

        <div class="p-3 rounded-xl border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <span class="block text-[10px] uppercase font-bold" style="color: var(--text-muted);">Entropia (H_rel)</span>
          <span class="text-xl font-black text-emerald-400">${analysis.relativeEntropy.toFixed(2)}</span>
          <span class="block text-[10px] mt-0.5" style="color: var(--text-muted);">1.0 = Max Parità</span>
        </div>

        <div class="p-3 rounded-xl border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <span class="block text-[10px] uppercase font-bold" style="color: var(--text-muted);">Indice HHI</span>
          <span class="text-xl font-black text-amber-400">${analysis.hhi}</span>
          <span class="block text-[10px] mt-0.5 truncate" style="color: var(--text-muted);">${analysis.hhiDescription}</span>
        </div>

        <div class="p-3 rounded-xl border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <span class="block text-[10px] uppercase font-bold" style="color: var(--text-muted);">Malus Lega (CR3)</span>
          <span class="text-xl font-black text-rose-400">${analysis.cr3DishonorPct}%</span>
          <span class="block text-[10px] mt-0.5 truncate" style="color: var(--text-muted);">Cuc. &amp; Cart. nei 3 peggiori</span>
        </div>
      </div>

      <!-- Stacked Dominance Bar -->
      <div>
        <div class="flex items-center justify-between text-xs mb-1.5" style="color: var(--text-main);">
          <span class="font-bold">Egemoni del Torneo (Top 3): <span class="text-amber-400 font-semibold">${top3Label}</span></span>
          <span class="font-mono font-bold">${analysis.cr3Pct}%</span>
        </div>
        <div class="w-full h-3 rounded-full overflow-hidden flex bg-white/5 border" style="border-color: var(--table-border);">
          <div style="width: ${analysis.cr3Pct}%; background-color: ${analysis.tierColor};" class="h-full transition-all duration-500"></div>
          <div style="width: ${100 - analysis.cr3Pct}%; background: rgba(255,255,255,0.15);" class="h-full"></div>
        </div>
      </div>

      <!-- Silverware & Efficiency Share Table -->
      <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border);">
        <div class="px-3 py-2 text-[11px] uppercase font-bold tracking-wider flex justify-between border-b" style="border-color: var(--table-border); background: rgba(0,0,0,0.12); color: var(--text-muted);">
          <span>Allenatore</span>
          <div class="flex gap-4">
            <span>Efficienza/Anno</span>
            <span class="w-16 text-right">Quota (%)</span>
          </div>
        </div>
        <div class="divide-y max-h-56 overflow-y-auto" style="border-color: var(--table-border);">
          ${analysis.profiles.map((p, idx) => `
            <div class="px-3 py-2 flex items-center justify-between text-xs sm:text-sm hover:bg-white/5 transition">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-4 text-center font-bold text-[11px] shrink-0 ${idx < 3 ? 'text-amber-400 font-black' : ''}" style="${idx >= 3 ? 'color: var(--text-muted);' : ''}">${idx + 1}</span>
                <span class="font-bold truncate" style="color: var(--text-main);">${p.name}</span>
                <span class="text-[11px] shrink-0" style="color: var(--text-muted);">(${p.trophies} titol${p.trophies === 1 ? 'o' : 'i'})</span>
              </div>
              <div class="flex items-center gap-4 shrink-0">
                <span class="font-mono text-xs" style="color: var(--text-muted);">${p.efficiency} tit/anno</span>
                <span class="font-mono font-bold text-xs text-right w-12" style="color: var(--text-main);">${p.trophySharePct.toFixed(1)}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Collapsible Educational Info Box for Macro Econometrics -->
      <div class="border rounded-2xl overflow-hidden text-xs mt-3" style="border-color: var(--table-border); background: var(--table-surface);">
        <button type="button" onclick="toggleGuide('macro-guide')" class="w-full px-4 py-3 flex items-center justify-between font-bold text-left transition hover:bg-white/5" style="color: var(--text-main);">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-question text-amber-400"></i>
            <span>Guida Matematica agli Indici Econometrici</span>
          </div>
          <i id="macro-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200" style="color: var(--text-muted);"></i>
        </button>
        <div id="macro-guide-content" class="px-4 pb-4 pt-1 space-y-3 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
          <div>
            <div class="flex items-center justify-between">
              <strong class="font-semibold" style="color: var(--text-main);">Gini Trofei (G_trophies):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">G = (2 ∑ i·T_i) / (n ∑ T_i) - (n+1)/n</code>
            </div>
            <p class="mt-0.5">Misura la disuguaglianza nella distribuzione dei titoli maggiori. Varia tra 0.0 (parità assoluta) e 1.0 (monopolio totale).</p>
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

  // TAB 2: Clutch vs Bottler
  else if (currentTab === 'clutch') {
    const clutchSorted = [...analysis.profiles].sort((a, b) => b.conversionRatePct - a.conversionRatePct || b.finalsWon - a.finalsWon || b.finalsPlayed - a.finalsPlayed);

    tabContentHTML = `
      <div class="p-3.5 rounded-2xl border text-xs" style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
        <p><strong class="font-bold" style="color: var(--text-main);">Indice di Cinismo nelle Finali:</strong> Calcola la percentuale di finali vinte (Scudetti e Coppe di Lega) rispetto al totale delle finali disputate (Ori + Argenti). Premia chi non trema nei momenti decisivi.</p>
      </div>

      <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border);">
        <div class="px-3 py-2 text-[11px] uppercase font-bold tracking-wider flex justify-between border-b" style="border-color: var(--table-border); background: rgba(0,0,0,0.12); color: var(--text-muted);">
          <span>Allenatore</span>
          <div class="flex gap-4 items-center">
            <span>Finali (V/T)</span>
            <span class="w-24 text-right">Cinismo (%)</span>
          </div>
        </div>
        <div class="divide-y max-h-72 overflow-y-auto" style="border-color: var(--table-border);">
          ${clutchSorted.map(p => `
            <div class="px-3 py-2.5 flex items-center justify-between text-xs sm:text-sm hover:bg-white/5 transition">
              <div class="min-w-0">
                <span class="font-bold block truncate" style="color: var(--text-main);">${p.name}</span>
                <span class="text-[10px]" style="color: var(--text-muted);">${p.finalsPlayed === 0 ? 'Nessuna finale disputata' : `${p.finalsWon} vinta/e su ${p.finalsPlayed} finali`}</span>
              </div>
              <div class="flex items-center gap-4 shrink-0">
                <span class="font-mono text-xs" style="color: var(--text-muted);">${p.finalsWon}/${p.finalsPlayed}</span>
                <div class="w-24 text-right">
                  <span class="font-mono font-black text-xs ${p.finalsPlayed === 0 ? 'opacity-40' : p.conversionRatePct >= 70 ? 'text-emerald-400 font-bold' : p.conversionRatePct <= 35 && p.finalsPlayed >= 2 ? 'text-indigo-400 font-bold' : 'text-slate-300'
      }">
                    ${p.finalsPlayed > 0 ? `${p.conversionRatePct.toFixed(0)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // TAB 3: Risk Archetypes & Feast-or-Famine
  else if (currentTab === 'risk') {
    tabContentHTML = `
      <div class="p-2.5 sm:p-3 rounded-xl border text-xs" style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
        <p><strong class="font-bold" style="color: var(--text-main);">Feast-or-Famine &amp; Filosofie di Roster:</strong> Misura la frequenza con cui il mister chiude la stagione agli estremi (1° posto o playout/cucchiaio). Identifica scommesse all-in rispetto a gestioni regolariste.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 h-[238px] max-h-[238px] overflow-y-auto pr-1 snap-y snap-mandatory scroll-smooth" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
        ${analysis.profiles.map(p => `
          <div class="p-2.5 rounded-xl border flex flex-col justify-between snap-start" style="height: 74px; background: var(--table-surface); border-color: var(--table-border);">
            <div class="flex items-center justify-between gap-1.5 min-w-0">
              <span class="font-bold text-xs sm:text-sm truncate" style="color: var(--text-main);">${p.name}</span>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0" style="background: ${p.archetypeColor}20; color: ${p.archetypeColor}; border: 1px solid ${p.archetypeColor}40;">
                <i class="fa-solid ${p.archetypeIcon} text-[8px]"></i>
                ${p.archetypeTag}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[10px] border-t pt-1.5 mt-1" style="border-color: var(--table-border); color: var(--text-muted);">
              <div>
                <span class="block text-[8px] uppercase font-bold opacity-60 leading-none mb-0.5">Feast / Famine</span>
                <span class="font-mono font-bold text-xs leading-none" style="color: var(--text-main);">${p.feastOrFamineRatio} /anno</span>
              </div>
              <div class="text-right">
                <span class="block text-[8px] uppercase font-bold opacity-60 leading-none mb-0.5">Malus (Cuc.+Cart.)</span>
                <span class="font-mono font-bold text-xs leading-none ${p.dishonors > 0 ? 'text-rose-400' : ''}">${p.dishonors}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Collapsible Educational Info Box for Risk Profiles & Archetypes -->
      <div class="border rounded-2xl overflow-hidden text-xs mt-3" style="border-color: var(--table-border); background: var(--table-surface);">
        <button type="button" onclick="toggleGuide('risk-guide')" class="w-full px-4 py-3 flex items-center justify-between font-bold text-left transition hover:bg-white/5" style="color: var(--text-main);">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-question text-amber-400"></i>
            <span>Guida agli Archetipi &amp; Formula Feast-or-Famine</span>
          </div>
          <i id="risk-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200" style="color: var(--text-muted);"></i>
        </button>
        <div id="risk-guide-content" class="px-4 pb-4 pt-2 space-y-3.5 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
          
          <!-- Feast-or-Famine Hero Banner -->
          <div class="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3" style="border-color: var(--table-border); background: rgba(0,0,0,0.03);">
            <div>
              <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Indice di Volatilità</span>
              <strong class="text-xs sm:text-sm font-bold block" style="color: var(--text-main);">Feast-or-Famine Ratio (FF)</strong>
              <p class="text-[11px] mt-0.5 leading-relaxed" style="color: var(--text-muted);">
                Frequenza annua con cui un mister chiude alle code estreme della classifica (1° posto o retrocessione/malus) rispetto a una navigazione costante a centro classifica.
              </p>
            </div>
            <div class="shrink-0 self-start sm:self-center px-3 py-1.5 rounded-lg border font-mono text-[11px] font-bold text-center" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
              FF = (Scudetti + Cucchiai + Cartonati) / Anni
            </div>
          </div>

          <!-- Collapsible Waterfall Rules -->
          <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
            <button type="button" onclick="toggleGuide('waterfall-rules')" class="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] font-bold transition hover:bg-white/5" style="color: var(--text-main);">
              <div class="flex items-center gap-1.5">
                <i class="fa-solid fa-layer-group text-amber-400 text-[10px]"></i>
                <span>Regole di Assegnazione &amp; Priorità (Waterfall)</span>
              </div>
              <i id="waterfall-rules-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-[10px]" style="color: var(--text-muted);"></i>
            </button>
            <div id="waterfall-rules-content" class="px-3 pb-3 pt-1 border-t hidden space-y-1.5" style="border-color: var(--table-border); color: var(--text-muted);">
              <p class="text-[11px] leading-relaxed">
                Se un manager soddisfa più requisiti, il motore assegna l'archetipo che compare prima in questo ordine gerarchico:
              </p>
              <div class="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">1. Dominatore</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">2. Cinico</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">3. Eterno 2°</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">4. All-or-Nothing</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">5. Vittima</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">6. Grinder</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">7. Ufficiale</span>
              </div>
            </div>
          </div>

          <!-- Archetypes Cards Grid (Clean 2-Column Micro-Cards) -->
          <div>
            <span class="block text-[11px] uppercase font-bold tracking-wider mb-2" style="color: var(--text-main);">Tassonomia degli Archetipi</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              <!-- Dominatore Dinastico -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.3);">
                      <i class="fa-solid fa-crown text-[9px]"></i> Dominatore Dinastico
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Titoli ≥ 4 &amp; Efficienza ≥ 0.50 tit/anno
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Egemone cannibale: accumula vittorie a ritmo insostenibile e impone cicli dittatoriali.
                  </p>
                </div>
              </div>

              <!-- Cinico Chirurgico -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);">
                      <i class="fa-solid fa-crosshairs text-[9px]"></i> Cinico Chirurgico
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Finali ≥ 2 &amp; Conversione ≥ 70%
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Freddo e letale nelle partite che contano: trasforma quasi ogni finale scudetto o coppa in trionfo.
                  </p>
                </div>
              </div>

              <!-- Eterno Secondo -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(99,102,241,0.15); color: #6366f1; border: 1px solid rgba(99,102,241,0.3);">
                      <i class="fa-solid fa-medal text-[9px]"></i> Eterno Secondo
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Argenti ≥ 2 &amp; Conversione ≤ 35%
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Sindrome di Cúper: costantemente al vertice ma punito dal destino o dalla tensione all'ultimo respiro.
                  </p>
                </div>
              </div>

              <!-- All-or-Nothing -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(249,115,22,0.15); color: #f97316; border: 1px solid rgba(249,115,22,0.3);">
                      <i class="fa-solid fa-dice text-[9px]"></i> All-or-Nothing
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    FF ≥ 0.60 &amp; Scudetti ≥ 1 &amp; Malus ≥ 1
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Roster spericolato: vive oscillando tra l'estasi dello scudetto e l'onta del cucchiaio o playout.
                  </p>
                </div>
              </div>

              <!-- Vittima Sacrificale -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3);">
                      <i class="fa-solid fa-skull-crossbones text-[9px]"></i> Vittima Sacrificale
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Disonori (Cuc.+Cart.) ≥ 2 &amp; Titoli = 0
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Abbonato al muro della vergogna: colleziona retrocessioni e malus senza mai aver assaporato l'oro.
                  </p>
                </div>
              </div>

              <!-- Grinder Metodico -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(6,182,212,0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3);">
                      <i class="fa-solid fa-shield-halved text-[9px]"></i> Grinder Metodico
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    FF ≤ 0.25 &amp; Disonori = 0 &amp; Anni ≥ 3
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Gestione solida e pragmatica: evita costantemente i bassifondi e macina piazzamenti regolari.
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
    <div class="p-5 sm:p-6 pb-3 border-b flex items-center justify-between shrink-0" style="border-color: var(--table-border);">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm" style="background: rgba(255,255,255,0.05); border: 1px solid var(--table-border);">
          <i class="fa-solid fa-chart-pie text-amber-400"></i>
        </div>
        <div>
          <h2 class="flex items-center gap-2 text-base sm:text-lg font-black tracking-tight" style="color: var(--text-main);">
            <span>Analisi InsalAtlas</span>
            <img src="favicon-32x32.png" alt="InsalAtlas logo" class="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
          </h2>
          <span class="text-xs" style="color: var(--text-muted);">Analisi & Filosofie di Roster</span>
        </div>
      </div>
      <button type="button" onclick="closeConcentrationModal()" class="w-8 h-8 rounded-full flex items-center justify-center transition border"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <!-- Navigation Tabs Bar -->
    <div class="px-5 sm:px-6 pt-3 pb-2 border-b flex items-center gap-2 overflow-x-auto shrink-0" style="border-color: var(--table-border); background: rgba(0,0,0,0.08);">
      ${tabButton('macro', 'Equilibrio & Macro', 'fa-solid fa-scale-balanced')}
      ${tabButton('clutch', 'Cinismo & Finali', 'fa-solid fa-bullseye')}
      ${tabButton('risk', 'Archetipi', 'fa-solid fa-dice')}
    </div>

    <!-- Modal Scrollable Body -->
    <div class="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0">
      
      <!-- Dynamic Tab Content -->
      ${tabContentHTML}

    </div>

    <!-- Modal Fixed Footer -->
    <div class="p-4 sm:p-5 border-t flex justify-end shrink-0" style="border-color: var(--table-border);">
      <button type="button" onclick="closeConcentrationModal()" class="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition shadow-sm"
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
  renderAnalyticsModalBody();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

/**
 * Closes concentration modal
 */
export function closeConcentrationModal(): void {
  const modal = document.getElementById('concentration-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

