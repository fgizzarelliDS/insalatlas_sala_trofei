import type { RecordCategory } from '@/types';
import { state } from '@/state';
import { computeAllLeagueRecords, filterRecordsByCategory } from '@/analytics/records';
import {
  renderRecordsContentHTML,
  filterRecordsBySearch,
  renderRecordCard,
  renderRecordsEmptyState
} from './RecordsTab';

export * from './RecordsTab';

let currentRecordsCategory: RecordCategory | 'all' = 'all';
let currentRecordsSearchQuery = '';

export function getCurrentRecordsCategory(): RecordCategory | 'all' {
  return currentRecordsCategory;
}

export function getCurrentRecordsSearchQuery(): string {
  return currentRecordsSearchQuery;
}

export function setCurrentRecordsCategory(category: RecordCategory | 'all'): void {
  currentRecordsCategory = category;
}

export function setCurrentRecordsSearchQuery(query: string): void {
  currentRecordsSearchQuery = query;
}

/**
 * Renders the Records & Primati tab content inside `#main-tab-records-content`
 */
export function renderRecordsTab(
  category: RecordCategory | 'all' = currentRecordsCategory,
  searchQuery: string = currentRecordsSearchQuery
): void {
  currentRecordsCategory = category;
  currentRecordsSearchQuery = searchQuery;
  const container = document.getElementById('main-tab-records-content');
  if (!container) return;

  container.innerHTML = renderRecordsContentHTML(currentRecordsCategory, currentRecordsSearchQuery);
}

/**
 * Filter records by category from interactive pill clicks
 */
export function filterRecordsCategory(category: RecordCategory | 'all', updateHistory = true): void {
  currentRecordsCategory = category;
  renderRecordsTab(currentRecordsCategory, currentRecordsSearchQuery);

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
      if (currentRecordsSearchQuery) {
        url.searchParams.set('q', currentRecordsSearchQuery);
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState(
        { tab: 'records', category, q: currentRecordsSearchQuery },
        '',
        url.toString()
      );
    } catch {
      // Ignored in mocked environments
    }
  }
}

/**
 * Live instant search across all records
 */
export function searchRecords(query: string, updateHistory = true): void {
  currentRecordsSearchQuery = query.trim();

  // If user enters a search query, search globally across all categories
  if (currentRecordsSearchQuery) {
    currentRecordsCategory = 'all';
  }

  const cardsContainer = document.getElementById('records-cards-container');
  const counterBadge = document.getElementById('records-counter-badge');
  const searchInput = document.getElementById('records-search-input') as HTMLInputElement | null;

  if (cardsContainer && counterBadge && searchInput) {
    // Dynamic lightweight update to avoid losing input focus
    const allRecords = computeAllLeagueRecords(state.managers, state.competitions);
    const byCategory = filterRecordsByCategory(allRecords, currentRecordsCategory);
    const filtered = filterRecordsBySearch(byCategory, currentRecordsSearchQuery);

    cardsContainer.innerHTML = filtered.length > 0
      ? filtered.map(r => renderRecordCard(r)).join('')
      : renderRecordsEmptyState(currentRecordsSearchQuery);

    counterBadge.textContent = `${filtered.length} Primati`;

    const clearBtn = document.getElementById('records-search-clear-btn');
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !currentRecordsSearchQuery);
    }

    // Ensure input value reflects query if called programmatically and not currently focused
    if (document.activeElement !== searchInput && searchInput.value !== query) {
      searchInput.value = query;
    }
  } else {
    // Fallback full re-render
    renderRecordsTab(currentRecordsCategory, currentRecordsSearchQuery);
  }

  if (updateHistory && typeof window !== 'undefined' && window.location) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'records');
      if (currentRecordsSearchQuery) {
        url.searchParams.set('q', currentRecordsSearchQuery);
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState(
        { tab: 'records', category: currentRecordsCategory, q: currentRecordsSearchQuery },
        '',
        url.toString()
      );
    } catch {
      // Ignored in mocked environments
    }
  }
}

/**
 * Resets search input and restores full category view
 */
export function clearRecordsSearch(): void {
  currentRecordsSearchQuery = '';
  renderRecordsTab(currentRecordsCategory, '');

  if (typeof window !== 'undefined' && window.location) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      window.history.replaceState(
        { tab: 'records', category: currentRecordsCategory },
        '',
        url.toString()
      );
    } catch {
      // Ignored
    }
  }
}

// Bind to window for HTML inline event handlers
if (typeof window !== 'undefined') {
  Object.assign(window, {
    filterRecordsCategory,
    searchRecords,
    clearRecordsSearch
  });
}
