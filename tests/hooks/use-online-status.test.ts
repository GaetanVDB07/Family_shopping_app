import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useOnlineStatus } from "@/hooks/use-online-status";

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    value,
    configurable: true,
  });
}

describe("useOnlineStatus", () => {
  it("returns the browser online state and follows online/offline events", () => {
    setNavigatorOnline(true);

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    act(() => {
      setNavigatorOnline(false);
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toBe(false);

    act(() => {
      setNavigatorOnline(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current).toBe(true);
  });
});
