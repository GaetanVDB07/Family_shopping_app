interface RegisterServiceWorkerOptions {
  enabled?: boolean;
}

export const APP_UPDATE_AVAILABLE_EVENT = "app:update-available";

export function registerServiceWorker({
  enabled = true,
}: RegisterServiceWorkerOptions = {}): void {
  if (!enabled) {
    return;
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let updateAnnounced = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || updateAnnounced) {
        return;
      }

      updateAnnounced = true;
      window.dispatchEvent(new Event(APP_UPDATE_AVAILABLE_EVENT));
    });

    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(__APP_VERSION__)}`)
      .then((registration) => {
        const checkForUpdates = () => void registration.update();
        window.addEventListener("focus", checkForUpdates);
      })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });
  });
}
