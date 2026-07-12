import { lazy, Suspense, useEffect, useState } from "react";

const Toaster = lazy(() =>
  import("@/components/ui/toaster").then((module) => ({
    default: module.Toaster,
  })),
);
const ServiceWorkerUpdatePrompt = lazy(() =>
  import("@/components/service-worker-update-prompt").then((module) => ({
    default: module.ServiceWorkerUpdatePrompt,
  })),
);

export function DeferredAppEnhancements() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: Window["requestIdleCallback"];
      cancelIdleCallback?: Window["cancelIdleCallback"];
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleCallbackId = idleWindow.requestIdleCallback(() => setReady(true), {
        timeout: 1_500,
      });
      return () => idleWindow.cancelIdleCallback?.(idleCallbackId);
    }

    const timeoutId = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Toaster />
      <ServiceWorkerUpdatePrompt />
    </Suspense>
  );
}
