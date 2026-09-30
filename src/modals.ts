import confetti from 'canvas-confetti';
import { Manager } from './types';
import { state } from './state';
import { verifyAdminPassword } from './config';
import { renderTrophySVG, renderCoachBanner } from './trophies';
import { calculateManagerScore, formatScore } from './score';
import { showToast, enableEditMode } from './ui';
import { saveData } from './storage';
import { renderBoard, updateStatistics } from './main';

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

  // Global Escape key handler
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (managerModal && !managerModal.classList.contains('hidden')) {
        closeManagerModal();
      } else if (profileModal && !profileModal.classList.contains('hidden')) {
        closeProfileModal();
      }
    }
  });
}

