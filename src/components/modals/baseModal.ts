import { closeProfileModal, closeShareDropdown } from './ProfileModal';
import { closeManagerModal } from './ManagerModal';
import { closeConcentrationModal, closeTierInfo } from './ConcentrationModal';
import { closeSeasonModal } from './season/SeasonModalController';
import { closeHeadToHeadModal, closeH2HShareDropdown } from './h2h/HeadToHeadModal';
import { closeAllRecordShareDropdowns } from '@/components/board/records';

/**
 * Sets up backdrop click and Escape key listeners for all modals
 */
export function initModalListeners(): void {
  const profileModal = document.getElementById('manager-profile-modal');
  const managerModal = document.getElementById('manager-modal');
  const concentrationModal = document.getElementById('concentration-modal');
  const seasonModal = document.getElementById('season-modal');
  const h2hModal = document.getElementById('head-to-head-modal');

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
  concentrationModal?.addEventListener('click', (e: MouseEvent) => {
    if (e.target === concentrationModal) {
      closeConcentrationModal();
    }
  });

  // Backdrop click: close season modal when clicking outside card
  seasonModal?.addEventListener('click', (e: MouseEvent) => {
    if (e.target === seasonModal) {
      closeSeasonModal();
    }
  });

  // Backdrop click: close head-to-head modal when clicking outside card
  h2hModal?.addEventListener('click', (e: MouseEvent) => {
    if (e.target === h2hModal) {
      closeHeadToHeadModal();
    }
  });

  // Click outside listener for tier info popover and share dropdown menu
  document.addEventListener('click', (e: MouseEvent) => {
    const popover = document.getElementById('tier-info-popover');
    if (popover && !popover.classList.contains('hidden')) {
      const target = e.target as HTMLElement;
      if (!popover.contains(target) && !target.closest('#btn-tier-info')) {
        closeTierInfo();
      }
    }

    const shareDropdown = document.getElementById('share-dropdown-menu');
    if (shareDropdown && !shareDropdown.classList.contains('hidden')) {
      const target = e.target as HTMLElement;
      if (!shareDropdown.contains(target) && !target.closest('#btn-share-dropdown')) {
        closeShareDropdown();
      }
    }

    const h2hShareDropdown = document.getElementById('h2h-share-dropdown-menu');
    if (h2hShareDropdown && !h2hShareDropdown.classList.contains('hidden')) {
      const target = e.target as HTMLElement;
      if (!h2hShareDropdown.contains(target) && !target.closest('#btn-h2h-share-dropdown')) {
        closeH2HShareDropdown();
      }
    }

    const targetEl = e.target as HTMLElement;
    if (!targetEl.closest('.record-card-actions')) {
      closeAllRecordShareDropdowns();
    }
  });

  // Global Escape key handler
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeAllRecordShareDropdowns();
      const shareDropdown = document.getElementById('share-dropdown-menu');
      if (shareDropdown && !shareDropdown.classList.contains('hidden')) {
        closeShareDropdown();
        return;
      }
      const h2hShareDropdown = document.getElementById('h2h-share-dropdown-menu');
      if (h2hShareDropdown && !h2hShareDropdown.classList.contains('hidden')) {
        closeH2HShareDropdown();
        return;
      }
      const tierPopover = document.getElementById('tier-info-popover');
      if (tierPopover && !tierPopover.classList.contains('hidden')) {
        closeTierInfo();
        return;
      }
      if (h2hModal && !h2hModal.classList.contains('hidden')) {
        closeHeadToHeadModal();
      } else if (seasonModal && !seasonModal.classList.contains('hidden')) {
        closeSeasonModal();
      } else if (concentrationModal && !concentrationModal.classList.contains('hidden')) {
        closeConcentrationModal();
      } else if (managerModal && !managerModal.classList.contains('hidden')) {
        closeManagerModal();
      } else if (profileModal && !profileModal.classList.contains('hidden')) {
        closeProfileModal();
      }
    }
  });
}
