import { getProfileModalShellHTML } from './profile/ProfileModalShell';
import { getManagerModalShellHTML } from './ManagerModalShell';
import { getSeasonModalShellHTML } from './season/SeasonModalShell';

/**
 * Injects modal shells into their anchor roots in the DOM once during application bootstrap.
 */
export function initModalMounts(): void {
  // 1. Manager Profile Modal
  const profileRoot = document.getElementById('manager-profile-modal-root');
  if (profileRoot && !document.getElementById('manager-profile-modal')) {
    profileRoot.innerHTML = getProfileModalShellHTML();
  }

  // 2. Add / Edit Manager Modal
  const managerRoot = document.getElementById('manager-modal-root');
  if (managerRoot && !document.getElementById('manager-modal')) {
    managerRoot.innerHTML = getManagerModalShellHTML();
  }

  // 3. New Season / Import Modal
  const seasonRoot = document.getElementById('season-modal-root');
  if (seasonRoot && !document.getElementById('season-modal')) {
    seasonRoot.innerHTML = getSeasonModalShellHTML();
  }

  // 4. Competitive Health & Analytics Modal
  const concentrationRoot = document.getElementById('concentration-modal-root');
  if (concentrationRoot && !document.getElementById('concentration-modal')) {
    concentrationRoot.innerHTML = `
      <!-- Modal: Concentration & Competitive Health -->
      <div id="concentration-modal"
        class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden items-center justify-center p-2 sm:p-4">
        <div class="w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative"
          style="background-color: var(--modal-bg); border-color: var(--modal-border); color: var(--modal-text);">
          <div id="concentration-modal-content" class="flex flex-col h-full overflow-hidden"></div>
        </div>
      </div>
    `;
  }

  // 5. Head-to-Head Comparison Modal
  const h2hRoot = document.getElementById('head-to-head-modal-root');
  if (h2hRoot && !document.getElementById('head-to-head-modal')) {
    h2hRoot.innerHTML = `
      <!-- Modal: Head-to-Head Comparison -->
      <div id="head-to-head-modal"
        class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden items-center justify-center p-2 sm:p-4">
        <div id="head-to-head-dialog" class="w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative transition-all duration-300"
          style="background-color: var(--modal-bg); border-color: var(--modal-border); color: var(--modal-text);">
          <div id="head-to-head-modal-content" class="flex flex-col h-full overflow-hidden"></div>
        </div>
      </div>
    `;
  }
}
