import type { TitlesConfig } from '@/types';
import { state } from '@/state';

/**
 * Injects state.titles into mapped DOM elements
 * @param titles - Optional override
 */
export function applyTitlesToDOM(titles: TitlesConfig = state.titles): void {
  const map: Record<string, string | undefined> = {
    'title-brand-main': titles.brandMain,
    'title-brand-highlight': titles.brandHighlight,
    'title-brand-sub': titles.brandSub,
    'title-main-heading': titles.mainHeading,
    'title-sub-heading': titles.subHeading,
    'title-league-caption': titles.leagueCaption,
    'th-col-1': titles.col1,
    'th-col-2': titles.col2,
    'th-col-3': titles.col3,
    'th-col-4': titles.col4,
    'th-col-5': titles.col5,
    'th-col-6': titles.col6,
    'th-col-7': titles.col7
  };

  for (const [id, val] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.textContent = val;
  }

  // Also apply any dynamic column titles mapped by data-title-key
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    const dynamicHeaders = document.querySelectorAll<HTMLElement>('[data-title-key]');
    dynamicHeaders.forEach(el => {
      const key = el.dataset.titleKey;
      if (key && titles[key] && typeof titles[key] === 'string') {
        el.textContent = titles[key] as string;
      }
    });
  }
}
