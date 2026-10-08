import { useState, useEffect } from "react";

let deferredPrompt = null;
const installListeners = new Set();
let isAppInstalled = false;

// Check if app is already running in standalone PWA mode
export function isStandalonePWA() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://")
  );
}

// Global listener for beforeinstallprompt
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    deferredPrompt = e;
    installListeners.forEach((listener) => listener(true));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    isAppInstalled = true;
    installListeners.forEach((listener) => listener(false));
  });
}

/**
 * Register Service Worker with immediate update detection.
 * Ensures users are never stuck on stale versions.
 */
export function registerServiceWorker({ onUpdate } = {}) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  // Avoid SW in development if desired, but allow testing if sw.js exists
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Periodic check for SW updates (e.g. every hour or on window focus)
        window.addEventListener("focus", () => {
          registration.update().catch(() => {});
        });

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // A new version is available and ready
              if (onUpdate) {
                onUpdate(registration);
              } else {
                // Auto-activate new worker
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            }
          });
        });
      })
      .catch((err) => {
        console.warn("ServiceWorker registration note:", err);
      });

    // Refresh tab when a newly activated worker claims control
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

/**
 * Trigger browser native install prompt
 */
export async function promptInstall() {
  if (!deferredPrompt) return false;

  deferredPrompt.prompt();
  const choiceResult = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installListeners.forEach((listener) => listener(false));

  return choiceResult.outcome === "accepted";
}

/**
 * React hook for unobtrusive PWA Install button
 */
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(Boolean(deferredPrompt));
  const [isStandalone, setIsStandalone] = useState(isStandalonePWA());

  useEffect(() => {
    setIsStandalone(isStandalonePWA());

    const updateState = (available) => {
      setCanInstall(available && !isStandalonePWA());
    };

    installListeners.add(updateState);
    if (deferredPrompt && !isStandalonePWA()) {
      setCanInstall(true);
    }

    return () => {
      installListeners.delete(updateState);
    };
  }, []);

  return {
    canInstall: canInstall && !isStandalone,
    promptInstall,
    isStandalone,
  };
}
