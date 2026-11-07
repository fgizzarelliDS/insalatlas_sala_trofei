/**
 * src/analytics/tactical/tacticalLore.ts
 * Manager Lore Catalog State and Asynchronous Fetching
 */

import type { ManagerLoreCatalog } from './types';

let cachedManagerLore: ManagerLoreCatalog = {};
let managerLoreFetchPromise: Promise<ManagerLoreCatalog> | null = null;

/**
 * Asynchronously loads custom manager lore from public/data/manager_lore.json
 */
export async function loadManagerLore(): Promise<ManagerLoreCatalog> {
  if (managerLoreFetchPromise) return managerLoreFetchPromise;
  if (typeof fetch === 'undefined') return cachedManagerLore;

  managerLoreFetchPromise = (async () => {
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './';
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const urls = [
      `${normalizedBase}manager_lore.json`,
      `manager_lore.json`,
      `./manager_lore.json`,
      `/manager_lore.json`,
      `${normalizedBase}data/manager_lore.json`
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            cachedManagerLore = data;
            return cachedManagerLore;
          }
        }
      } catch {
        // try next candidate
      }
    }
    return cachedManagerLore;
  })();

  return managerLoreFetchPromise;
}

export function getCachedManagerLore(): ManagerLoreCatalog {
  return cachedManagerLore;
}

export function setManagerLore(lore: ManagerLoreCatalog): void {
  cachedManagerLore = lore;
}
