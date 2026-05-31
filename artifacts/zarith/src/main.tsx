import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    deferredZarithInstallPrompt?: BeforeInstallPromptEvent;
  }
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
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch((error) => {
      console.warn("Falha ao registrar service worker da Zarith:", error);
    });
  });
}
