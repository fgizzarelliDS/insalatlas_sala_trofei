import type { RecordCategory } from '@/types';
import { renderRecordsContentHTML } from './RecordsTab';

export * from './RecordsTab';

let currentRecordsCategory: RecordCategory | 'all' = 'all';

export function getCurrentRecordsCategory(): RecordCategory | 'all' {
  return currentRecordsCategory;
}

export function setCurrentRecordsCategory(category: RecordCategory | 'all'): void {
  currentRecordsCategory = category;
}

/**
 * Renders the Records & Primati tab content inside `#main-tab-records-content`
 */
export function renderRecordsTab(category: RecordCategory | 'all' = currentRecordsCategory): void {
  currentRecordsCategory = category;
  const container = document.getElementById('main-tab-records-content');
  if (!container) return;

  container.innerHTML = renderRecordsContentHTML(currentRecordsCategory);
}

/**
 * Filter records by category from interactive pill clicks
 */
export function filterRecordsCategory(category: RecordCategory | 'all', updateHistory = true): void {
  renderRecordsTab(category);

  if (updateHistory && typeof window !== 'undefined' && window.location) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'records');
      if (category === 'all') {
        url.searchParams.delete('category');
        url.searchParams.delete('cat');
      } else {
        url.searchParams.set('category', category);
        url.searchParams.delete('cat');
      }
      window.history.replaceState({ tab: 'records', category }, '', url.toString());
    } catch {
      // Ignored in mocked environments
    }
  }
}

// Bind to window for HTML inline event handlers
if (typeof window !== 'undefined') {
  (window as unknown as { filterRecordsCategory?: typeof filterRecordsCategory }).filterRecordsCategory =
    filterRecordsCategory;
}
