import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type ZarithPwaUpdateDetail = {
  version: string;
  registration?: ServiceWorkerRegistration;
  worker?: ServiceWorker | null;
};

declare global {
  interface Window {
    deferredZarithInstallPrompt?: BeforeInstallPromptEvent;
    zarithWaitingServiceWorker?: ServiceWorker | null;
    zarithServiceWorkerRegistration?: ServiceWorkerRegistration;
  }
}

const ZARITH_BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION || new Date().toISOString();
const PWA_UPDATE_REQUESTED_STORAGE_KEY = "zarith_pwa_update_requested";

function dispatchPwaUpdateAvailable(detail: Partial<ZarithPwaUpdateDetail> = {}) {
  window.zarithWaitingServiceWorker = detail.worker || detail.registration?.waiting || null;
  if (detail.registration) window.zarithServiceWorkerRegistration = detail.registration;
  window.dispatchEvent(new CustomEvent<ZarithPwaUpdateDetail>("zarith:pwa-update-available", {
    detail: {
      version: detail.version || ZARITH_BUILD_VERSION,
      registration: detail.registration,
      worker: detail.worker,
    },
  }));
}

createRoot(document.getElementById("root")!).render(<App />);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  window.deferredZarithInstallPrompt = event as BeforeInstallPromptEvent;
  window.dispatchEvent(new CustomEvent("zarith:pwa-install-available"));
});

window.addEventListener("appinstalled", () => {
  window.deferredZarithInstallPrompt = undefined;
  window.dispatchEvent(new CustomEvent("zarith:pwa-installed"));
});

if ("serviceWorker" in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    const updateRequested = window.sessionStorage.getItem(PWA_UPDATE_REQUESTED_STORAGE_KEY) === "true";
    window.dispatchEvent(new CustomEvent("zarith:pwa-sw-controllerchange"));

    if (updateRequested) {
      refreshing = true;
      window.sessionStorage.removeItem(PWA_UPDATE_REQUESTED_STORAGE_KEY);
      window.location.reload();
    }
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SW_UPDATE_READY" && navigator.serviceWorker.controller) {
      dispatchPwaUpdateAvailable({
        version: event.data.version || ZARITH_BUILD_VERSION,
        registration: window.zarithServiceWorkerRegistration,
        worker: window.zarithServiceWorkerRegistration?.waiting || null,
      });
    }
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
      .then((registration) => {
        window.zarithServiceWorkerRegistration = registration;

        if (registration.waiting && navigator.serviceWorker.controller) {
          dispatchPwaUpdateAvailable({ registration, worker: registration.waiting });
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              dispatchPwaUpdateAvailable({ registration, worker: registration.waiting || newWorker });
            }
          });
        });

        registration.update().catch(() => undefined);
        window.setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => undefined);
          }
        });
      })
      .catch((error) => {
        console.warn("Falha ao registrar service worker da Zarith:", error);
      });
  });
}
