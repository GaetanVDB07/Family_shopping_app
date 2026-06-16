import { useEffect, useRef } from "react";

/**
 * Refetch data when the browser tab becomes visible again.
 *
 * Mobile browsers often pause WebSockets while a tab is in the background,
 * so this is a lightweight way to resync after the user returns to the app.
 */
export function useRefetchOnVisibility(refetch: () => Promise<unknown>) {
  const isRefetchingRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible" || isRefetchingRef.current) {
        return;
      }

      isRefetchingRef.current = true;
      try {
        await refetch();
      } finally {
        isRefetchingRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refetch]);
}
