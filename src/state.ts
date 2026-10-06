import { AppState } from '@/types';
import { DEFAULT_TITLES } from '@/config';

const isMobileDevice = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 767px)').matches;

export const state: AppState = {
  managers: [],
  competitions: [],
  currentTheme: 'gazzetta',
  currentSort: 'trophies_desc',
  displayMode: isMobileDevice ? 'compact' : 'multiple',
  isEditMode: false,
  selectedManagerId: null,
  titles: { ...DEFAULT_TITLES }
};
