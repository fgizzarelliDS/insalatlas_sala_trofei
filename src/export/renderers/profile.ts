import { renderNodeToCanvas } from './core';
import { LEAGUE } from '@/config';

/**
 * Renders an exact off-screen clone of the profile modal card into a high-res canvas.
 * Solves viewport clipping, max-height scrolling cuts, and font metric overlaps.
 */
export async function renderProfileModalCanvas(card: HTMLElement): Promise<HTMLCanvasElement> {
  const clone = card.cloneNode(true) as HTMLElement;
  clone.id = 'manager-profile-card-export-clone';

  // 1. Determine natural width of the card as rendered on screen (default max-w-xl is 576px)
  const cardRect = card.getBoundingClientRect();
  const naturalWidth = Math.round(cardRect.width) || card.offsetWidth || 576;
  const targetWidth = Math.max(naturalWidth, 540);

  // 2. Remove interactive UI controls (close button, footer action buttons, share dropdown, tabs, career content)
  clone.querySelector('#profile-modal-close-btn')?.remove();
  clone.querySelector('#profile-modal-footer-actions')?.remove();
  clone.querySelector('#profile-modal-watermark')?.remove();
  clone.querySelector('#share-dropdown-menu')?.remove();
  clone.querySelector('#profile-modal-tabs')?.remove();
  clone.querySelector('#profile-tab-career-content')?.remove();
  clone.querySelectorAll('.competition-drawer').forEach(el => el.remove());

  // Ensure Tab 1 (Bacheca & Palmarès) is always active and visible in exported card
  const palmaresContent = clone.querySelector('#profile-tab-palmares-content') as HTMLElement | null;
  if (palmaresContent) {
    palmaresContent.classList.remove('hidden');
    palmaresContent.style.display = 'block';
  }

  // 3. Add balanced, elegant closing footer with LEAGUE.brand.name • LEAGUE.brand.mainTitle Ufficiale (no links/URLs)
  const footer = document.createElement('div');
  footer.className = 'flex items-center justify-center gap-2 pt-3.5 mt-2 border-t text-xs font-bold tracking-wider uppercase opacity-70';
  footer.style.borderColor = 'var(--table-border)';
  footer.style.color = 'var(--text-muted)';
  footer.innerHTML = `
    <img src="favicon-64x64.png" alt="${LEAGUE.brand.name}" class="w-4 h-4 object-contain inline-block">
    <span>${LEAGUE.brand.name} • ${LEAGUE.brand.mainTitle} Ufficiale</span>
  `;
  clone.appendChild(footer);

  // 4. Ensure clear vertical spacing so Montserrat font never overlaps badge
  const nameEl = clone.querySelector('#profile-name') as HTMLElement | null;
  if (nameEl) {
    nameEl.style.lineHeight = '1.35';
    nameEl.style.marginBottom = '6px';
    nameEl.style.display = 'block';
  }
  const badgeEl = clone.querySelector('#profile-years-badge') as HTMLElement | null;
  if (badgeEl) {
    badgeEl.style.display = 'inline-block';
    badgeEl.style.marginTop = '0';
  }

  const computedBg = window.getComputedStyle(card).backgroundColor || '#0f172a';
  return renderNodeToCanvas(clone, targetWidth, computedBg);
}
