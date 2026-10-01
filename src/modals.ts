import confetti from 'canvas-confetti';
import { Manager } from './types';
import { state } from './state';
import { verifyAdminPassword } from './config';
import { renderTrophySVG, renderCoachBanner } from './trophies';
import { calculateManagerScore, formatScore } from './score';
import { showToast, enableEditMode } from './ui';
import { saveData } from './storage';
import { renderBoard, updateStatistics } from './main';
import { computeLeagueConcentration } from './analytics';

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
    const badges: { label: string; icon: string; color: string }[] = [];

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

/**
 * Toggles the educational econometric guide accordion inside the concentration modal
 */
export function toggleConcentrationGuide(): void {
  const guideContent = document.getElementById('concentration-guide-content');
  const guideChevron = document.getElementById('concentration-guide-chevron');
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
 * Opens modal displaying league concentration, econometric balance, and historical parity
 */
export function openConcentrationModal(): void {
  const analysis = computeLeagueConcentration(state.managers);
  const container = document.getElementById('concentration-modal-content');
  const modal = document.getElementById('concentration-modal');

  if (!container || !modal) return;

  const top3Label = analysis.top3Names.length > 0 ? analysis.top3Names.join(', ') : 'Nessuno';

  container.innerHTML = `
    <!-- Modal Fixed Header -->
    <div class="p-5 sm:p-6 pb-4 border-b flex items-center justify-between shrink-0" style="border-color: var(--table-border);">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm" style="background: rgba(255,255,255,0.05); border: 1px solid var(--table-border);">
          <i class="fa-solid fa-chart-pie text-amber-400"></i>
        </div>
        <div>
          <h2 class="text-lg sm:text-xl font-black tracking-tight" style="color: var(--text-main);">Stato di Salute della Lega</h2>
          <span class="text-xs" style="color: var(--text-muted);">Indice di Concentrazione, Parità &amp; Dinastie</span>
        </div>
      </div>
      <button type="button" onclick="closeConcentrationModal()" class="w-8 h-8 rounded-full flex items-center justify-center transition border"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <!-- Modal Scrollable Body -->
    <div class="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
      
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
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-3 rounded-xl border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <span class="block text-[11px] uppercase font-bold" style="color: var(--text-muted);">Monopolio Top 3 (CR3)</span>
          <span class="text-xl font-black text-amber-400">${analysis.cr3Pct}%</span>
          <span class="block text-[10px] mt-0.5" style="color: var(--text-muted);">dei titoli ai primi 3</span>
        </div>

        <div class="p-3 rounded-xl border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <span class="block text-[11px] uppercase font-bold" style="color: var(--text-muted);">Indice HHI</span>
          <span class="text-xl font-black text-amber-400">${analysis.hhi}</span>
          <span class="block text-[10px] mt-0.5" style="color: var(--text-muted);">${analysis.hhiDescription}</span>
        </div>

        <div class="p-3 rounded-xl border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <span class="block text-[11px] uppercase font-bold" style="color: var(--text-muted);">Concentrazione Cartonati</span>
          <span class="text-xl font-black text-rose-400">${analysis.cr3DishonorPct}%</span>
          <span class="block text-[10px] mt-0.5" style="color: var(--text-muted);">nei peggiori 3 mister</span>
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
          ${analysis.shares.map((s, idx) => `
            <div class="px-3 py-2 flex items-center justify-between text-xs sm:text-sm hover:bg-white/5 transition">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-4 text-center font-bold text-[11px] shrink-0 ${idx < 3 ? 'text-amber-400 font-black' : ''}" style="${idx >= 3 ? 'color: var(--text-muted);' : ''}">${idx + 1}</span>
                <span class="font-bold truncate" style="color: var(--text-main);">${s.name}</span>
                <span class="text-[11px] shrink-0" style="color: var(--text-muted);">(${s.trophies} titol${s.trophies === 1 ? 'o' : 'i'})</span>
              </div>
              <div class="flex items-center gap-4 shrink-0">
                <span class="font-mono text-xs" style="color: var(--text-muted);">${s.efficiency} tit/anno</span>
                <span class="font-mono font-bold text-xs text-right w-12" style="color: var(--text-main);">${s.sharePct.toFixed(1)}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Collapsible Educational Info Box -->
      <div class="border rounded-2xl overflow-hidden text-xs" style="border-color: var(--table-border); background: rgba(255,255,255,0.02);">
        <button type="button" onclick="toggleConcentrationGuide()" class="w-full px-4 py-3 flex items-center justify-between font-bold text-left transition hover:bg-white/5" style="color: var(--text-main);">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-question text-amber-400"></i>
            <span>Guida agli Indici Econometrici</span>
          </div>
          <i id="concentration-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200" style="color: var(--text-muted);"></i>
        </button>
        <div id="concentration-guide-content" class="px-4 pb-4 pt-1 space-y-2 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
          <div>
            <strong class="font-semibold" style="color: var(--text-main);">Gini Trofei:</strong> Misura la disuguaglianza nella bacheca (0 = ogni squadra ha vinto gli stessi titoli, 1 = un solo padrone assoluto).
          </div>
          <div>
            <strong class="font-semibold" style="color: var(--text-main);">Gini Rating:</strong> Misura la concentrazione della competitività globale: include podi (2° e 3° posti), finali perse, piazzamenti e malus playout, pesati tramite il sistema di punteggio storico.
          </div>
          <div>
            <strong class="font-semibold" style="color: var(--text-main);">Monopolio Top 3 (CR3):</strong> Percentuale cumulativa dei titoli maggiori detenuta dai primi 3 all-time.
          </div>
          <div>
            <strong class="font-semibold" style="color: var(--text-main);">Indice HHI (Herfindahl-Hirschman):</strong> Misura la concentrazione di mercato (somma dei quadrati delle quote). Sotto 1500 indica parità elevata, sopra 2500 oligopolio/dinastia.
          </div>
          <div>
            <strong class="font-semibold" style="color: var(--text-main);">Concentrazione Cartonati:</strong> Quota percentuale di sconfitte ai playout accentrata nei 3 peggiori manager storici.
          </div>
          <div>
            <strong class="font-semibold" style="color: var(--text-main);">Efficienza/Anno:</strong> Rapporto tra trofei vinti e anni di permanenza nella lega (<span class="font-mono">Trofei / Anni</span>), che premia chi converte rapidamente le stagioni in trionfi.
          </div>
        </div>
      </div>

    </div>

    <!-- Modal Fixed Footer -->
    <div class="p-4 sm:p-5 border-t flex justify-end shrink-0" style="border-color: var(--table-border);">
      <button type="button" onclick="closeConcentrationModal()" class="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition shadow-sm"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        Chiudi
      </button>
    </div>
  `;

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

