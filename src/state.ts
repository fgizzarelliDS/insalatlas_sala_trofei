import { AppState } from './types';
import { DEFAULT_TITLES } from './config';

export const state: AppState = {
  managers: [],
  currentTheme: 'gazzetta',
  currentSort: 'trophies_desc',
  displayMode: 'multiple',
  isEditMode: false,
  selectedManagerId: null,
  titles: { ...DEFAULT_TITLES }
};
