import type { RecordCategory } from '@/types';
import { renderRecordsContentHTML } from './RecordsTab';

export * from './RecordsTab';

let currentRecordsCategory: RecordCategory | 'all' = 'all';

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
export function filterRecordsCategory(category: RecordCategory | 'all'): void {
  renderRecordsTab(category);
}

// Bind to window for HTML inline event handlers
if (typeof window !== 'undefined') {
  (window as unknown as { filterRecordsCategory?: typeof filterRecordsCategory }).filterRecordsCategory =
    filterRecordsCategory;
}
