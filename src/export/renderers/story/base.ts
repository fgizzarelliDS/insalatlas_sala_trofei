import { LEAGUE, LEAGUE_SITE_HOST } from '@/config';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
export const SAFE_ZONE_TOP = 160;
export const SAFE_ZONE_BOTTOM = 220;

/**
 * Creates the base 1080x1920 story container with Instagram/WhatsApp safe zones
 */
export function createStoryContainer(title: string, subtitle: string): {
  container: HTMLDivElement;
  contentBox: HTMLDivElement;
} {
  const container = document.createElement('div');
  container.id = 'league-story-export-container';
  container.style.width = `${STORY_WIDTH}px`;
  container.style.height = `${STORY_HEIGHT}px`;
  container.style.maxHeight = `${STORY_HEIGHT}px`;
  container.style.minHeight = `${STORY_HEIGHT}px`;
  container.style.boxSizing = 'border-box';
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';
  container.style.padding = `${SAFE_ZONE_TOP}px 60px ${SAFE_ZONE_BOTTOM}px 60px`;
  container.style.background = 'radial-gradient(ellipse at 50% 12%, #1e1b4b 0%, #090d16 60%, #020617 100%)';
  container.style.color = '#f8fafc';
  container.style.fontFamily = "'Montserrat', 'Inter', system-ui, -apple-system, sans-serif";
  if (container.style && typeof container.style.setProperty === 'function') {
    container.style.setProperty('--text-main', '#f8fafc');
    container.style.setProperty('--text-muted', '#94a3b8');
    container.style.setProperty('--h2h-contender-a', '#f43f5e');
    container.style.setProperty('--h2h-contender-b', '#06b6d4');
    container.style.setProperty('--table-border', '#334155');
    container.style.setProperty('--table-surface', 'rgba(15, 23, 42, 0.7)');
  }

  // Top Safe-Zone Border Indicator / Header Bar
  const headerBar = document.createElement('div');
  headerBar.className = 'w-full flex items-center justify-between pb-6 border-b border-amber-500/30';
  headerBar.innerHTML = `
    <div class="flex items-center gap-3">
      <img src="favicon-64x64.png" alt="Logo" class="w-10 h-10 object-contain drop-shadow-md">
      <div>
        <h1 class="font-sport font-black text-2xl tracking-wider uppercase text-amber-400 leading-none">
          ${LEAGUE.brand.name.toUpperCase()}
        </h1>
        <p class="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">
          ${subtitle}
        </p>
      </div>
    </div>
    <div class="px-3.5 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 font-extrabold text-xs tracking-wider uppercase">
      ${title}
    </div>
  `;
  container.appendChild(headerBar);

  // Content Box (Centered inside Safe Zone)
  const contentBox = document.createElement('div');
  contentBox.className = 'flex-1 flex flex-col justify-around py-6 w-full max-w-[960px] mx-auto';
  container.appendChild(contentBox);

  // Bottom Safe-Zone Watermark Footer
  const footerBar = document.createElement('div');
  footerBar.className = 'w-full pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-bold tracking-wider uppercase';
  footerBar.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
      <span>${LEAGUE.brand.mainTitle || 'Sala Trofei'} Ufficiale</span>
    </div>
    <span class="text-slate-500">${LEAGUE_SITE_HOST}</span>
  `;
  container.appendChild(footerBar);

  return { container, contentBox };
}
