interface RegisterServiceWorkerOptions {
  enabled?: boolean;
}

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
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
