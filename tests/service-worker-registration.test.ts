import { afterEach, describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "@/lib/service-worker";

describe("registerServiceWorker", () => {
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("does nothing when service workers are unavailable", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });

    expect(() => registerServiceWorker()).not.toThrow();
  });

  it("does nothing when registration is disabled", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    const addEventListener = vi.fn();

    Object.defineProperty(globalThis, "navigator", {
      value: { serviceWorker: { register } },
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: { addEventListener },
      configurable: true,
    });

    registerServiceWorker({ enabled: false });

    expect(addEventListener).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it("registers the production service worker after window load", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    const addEventListener = vi.fn((event: string, callback: () => void) => {
      if (event === "load") {
        callback();
      }
    });

    Object.defineProperty(globalThis, "navigator", {
      value: { serviceWorker: { register } },
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: { addEventListener },
      configurable: true,
    });

    registerServiceWorker({ enabled: true });

    expect(addEventListener).toHaveBeenCalledWith("load", expect.any(Function));
    expect(register).toHaveBeenCalledWith("/sw.js");
  });
});
