import { closeAlboShareDropdown } from '@/components/board/tableBoard';
import { closePosterShareDropdown, closeAllRecordShareDropdowns } from '@/components/board/records';
import { closeH2HShareDropdown, closeTrophyShareDropdown } from '@/components/modals';
import { closeTeamMatchesShareDropdown, closeMeritShareDropdown } from '@/components/board/seasonsArchive';

/**
 * Global document click listener that closes all active share dropdown popovers
 * whenever a click occurs outside their trigger button or dropdown panel.
 */
export function initDropdownClickOutsideListener(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (!target.closest('#btn-albo-share-dropdown') && !target.closest('#albo-share-dropdown-menu')) {
      closeAlboShareDropdown();
    }
    if (!target.closest('#btn-poster-share-dropdown') && !target.closest('#poster-share-dropdown-menu')) {
      closePosterShareDropdown();
    }
    if (!target.closest('[id^="record-share-btn-"]') && !target.closest('[id^="record-share-dropdown-"]')) {
      closeAllRecordShareDropdowns();
    }
    if (!target.closest('#btn-h2h-share-dropdown') && !target.closest('#h2h-share-dropdown-menu')) {
      closeH2HShareDropdown();
    }
    if (!target.closest('#btn-trophy-share-dropdown') && !target.closest('#trophy-share-dropdown-menu')) {
      closeTrophyShareDropdown();
    }
    if (!target.closest('#btn-team-matches-share') && !target.closest('#team-matches-share-dropdown')) {
      closeTeamMatchesShareDropdown();
    }
    if (
      !target.closest('#btn-merit-share-desktop') &&
      !target.closest('#btn-merit-share-mobile') &&
      !target.closest('.merit-share-btn') &&
      !target.closest('[id^="merit-share-dropdown-"]')
    ) {
      closeMeritShareDropdown();
    }
  });
}
