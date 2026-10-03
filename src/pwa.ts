import { showToast } from '@/ui';

// Holds the deferred beforeinstallprompt event
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Initializes PWA Service Worker and sets up native install prompt listeners
 */
export function initPWA(): void {
  if (typeof window === 'undefined') return;

  // 1. Service Worker Registration
  if ('serviceWorker' in navigator) {
    const isLocalhost = Boolean(
      window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    );

    // Only activate Service Worker in production / GitHub Pages to keep dev reload instant
    if (!isLocalhost) {
      // Auto-reload immediately when a new service worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      // Periodically check for updates when returning to the app
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          navigator.serviceWorker.getRegistration().then((reg) => {
            reg?.update();
          });
        }
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            // Check for updates on initial page load
            reg.update();

            reg.addEventListener('updatefound', () => {
              const installingWorker = reg.installing;
              if (installingWorker) {
                installingWorker.addEventListener('statechange', () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('PWA: Nuova versione disponibile in background.');
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('PWA: Registrazione Service Worker fallita:', err);
          });
      });
    }
  }

  // 2. BeforeInstallPrompt Event Listener
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;

    // Reveal discrete install button in the top navigation bar
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      installBtn.classList.remove('hidden');
      installBtn.classList.add('inline-flex');
    }
  });

  // 3. AppInstalled Event Listener
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      installBtn.classList.add('hidden');
      installBtn.classList.remove('inline-flex');
    }
    showToast('InsalAtlas installata con successo sulla schermata Home!', 'success');
  });

  // 4. iOS Safari Detection: Reveal button with iOS guidance if running in mobile Safari (non-standalone)
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone;

  if (isIos && !isStandalone) {
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      installBtn.classList.remove('hidden');
      installBtn.classList.add('inline-flex');
    }
  }
}

/**
 * Triggered when clicking the discrete install button
 */
export async function promptPWAInstall(): Promise<void> {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone;

  if (isStandalone) {
    showToast('InsalAtlas è già installata!', 'info');
    return;
  }

  // If native Chrome/Android deferred prompt is available
  if (deferredPrompt) {
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast('Installazione avviata...', 'success');
      }
      deferredPrompt = null;
      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) {
        installBtn.classList.add('hidden');
        installBtn.classList.remove('inline-flex');
      }
    } catch (err) {
      console.warn('Install prompt failed:', err);
    }
    return;
  }

  // Guidance for iOS Safari
  if (isIos) {
    showToast('Su iOS: tocca il tasto Condividi (⬆️) in Safari e seleziona "Aggiungi a schermata Home"', 'info');
    return;
  }

  showToast('Per installare: apri le impostazioni del browser (⋮) e seleziona "Installa app" o "Aggiungi a Home"', 'info');
}
