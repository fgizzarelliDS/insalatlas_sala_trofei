import { renderNodeToCanvas } from './core';

/**
 * Renders an exact off-screen clone of an individual Hall of Fame Record card into a high-res canvas.
 * Uses html-to-image (SVG foreignObject): the browser's own layout engine renders the card, so
 * pills, badges, crests and text are pixel-identical to the on-screen card.
 * Integrates a unified InsalAtlas official closing footer in place of the share actions.
 */
export async function renderRecordCardCanvas(card: HTMLElement): Promise<HTMLCanvasElement> {
  const clone = card.cloneNode(true) as HTMLElement;
  clone.id = 'record-card-export-clone';

  // 1. Determine natural width of the card, ensuring a minimum for sharp layout
  const cardRect = card.getBoundingClientRect();
  const naturalWidth = Math.round(cardRect.width) || card.offsetWidth || 440;
  const targetWidth = Math.max(naturalWidth, 480);

  // 2. Replace share actions inside the existing footer with InsalAtlas branding (single footer)
  const actionsContainer = clone.querySelector<HTMLElement>('.record-card-actions');
  if (actionsContainer) {
    const brandPill = document.createElement('div');
    brandPill.className = 'flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-80 shrink-0';
    brandPill.style.color = 'var(--text-muted)';
    brandPill.innerHTML = `
      <img src="favicon-64x64.png" alt="InsalAtlas" class="w-3.5 h-3.5 object-contain inline-block rounded-full">
      <span class="font-extrabold tracking-widest text-[10px]" style="color: var(--text-main);">InsalAtlas</span>
      <span class="opacity-40">•</span>
      <span class="text-[9px] tracking-wider" style="color: var(--accent-color);">Record Ufficiale</span>
    `;
    actionsContainer.replaceWith(brandPill);
  }
  clone.querySelectorAll('[id^="record-share-dropdown-"]').forEach(el => el.remove());

  const computedBg = window.getComputedStyle(card).backgroundColor || '#0f172a';
  return renderNodeToCanvas(clone, targetWidth, computedBg);
}
