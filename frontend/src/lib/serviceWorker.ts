/**
 * Service Worker Registration
 * Handles PWA installation and offline capabilities
 */

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

export function register(config?: ServiceWorkerConfig): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';
      registerValidSW(swUrl, config);
    });
  }
}

function registerValidSW(swUrl: string, config?: ServiceWorkerConfig): void {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      // Check for updates periodically
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000
      ); // Check every hour

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available
              if (config?.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Content is cached for offline use
              if (config?.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });

  // Handle offline/online events
  if (config?.onOffline || config?.onOnline) {
    window.addEventListener('online', () => {
      config.onOnline?.();
    });

    window.addEventListener('offline', () => {
      config.onOffline?.();
    });
  }
}

export function unregister(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('Error during service worker unregistration:', error);
      });
  }
}

// Skip waiting when there's an update
export function skipWaiting(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // SECURITY: ServiceWorker.postMessage() is inherently same-origin safe
    // Service workers can only be registered for the same origin, and postMessage
    // to the controller always goes to the same-origin service worker.
    // Validate controller scriptURL matches our origin as defense in depth.
    const controller = navigator.serviceWorker.controller;
    try {
      const controllerUrl = new URL(controller.scriptURL);
      if (controllerUrl.origin !== window.location.origin) {
        console.warn('[Security] Service worker controller origin mismatch');
        return;
      }
    } catch {
      console.warn('[Security] Unable to validate service worker controller');
      return;
    }
    controller.postMessage({ type: 'SKIP_WAITING' });
  }
}

// Clear all service worker caches
export function clearCache(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // SECURITY: ServiceWorker.postMessage() is inherently same-origin safe
    // Validate controller scriptURL matches our origin as defense in depth.
    const controller = navigator.serviceWorker.controller;
    try {
      const controllerUrl = new URL(controller.scriptURL);
      if (controllerUrl.origin !== window.location.origin) {
        console.warn('[Security] Service worker controller origin mismatch');
        return;
      }
    } catch {
      console.warn('[Security] Unable to validate service worker controller');
      return;
    }
    controller.postMessage({ type: 'CLEAR_CACHE' });
  }
}

// Check if app can be installed (PWA)
export function canInstall(): boolean {
  return 'BeforeInstallPromptEvent' in window;
}

// PWA install prompt handler
let deferredPrompt: Event | null = null;

export function setupInstallPrompt(callback: (canInstall: boolean) => void): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    callback(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    callback(false);
  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;

  const promptEvent = deferredPrompt as unknown as {
    prompt: () => void;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };

  promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  deferredPrompt = null;

  return outcome === 'accepted';
}

export default {
  register,
  unregister,
  skipWaiting,
  clearCache,
  canInstall,
  setupInstallPrompt,
  promptInstall,
};
