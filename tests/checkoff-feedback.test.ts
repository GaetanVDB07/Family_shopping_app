import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCheckoffFeedbackPreferences,
  playCheckoffFeedback,
  playCheckoffHaptic,
  playCheckoffSound,
  setCheckoffFeedbackPreferences,
} from "@/lib/checkoff-feedback";

describe("checkoff feedback", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults haptic and sound feedback to enabled", () => {
    expect(getCheckoffFeedbackPreferences()).toEqual({
      haptic: true,
      sound: true,
    });
  });

  it("persists feedback preferences in localStorage", () => {
    setCheckoffFeedbackPreferences({ haptic: false, sound: true });

    expect(getCheckoffFeedbackPreferences()).toEqual({
      haptic: false,
      sound: true,
    });
  });

  it("vibrates when haptic feedback is enabled", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: vibrate,
    });

    playCheckoffHaptic();

    expect(vibrate).toHaveBeenCalledWith(12);
  });

  it("plays only enabled feedback channels", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: vibrate,
    });

    playCheckoffFeedback({ haptic: true, sound: false });
    expect(vibrate).toHaveBeenCalledTimes(1);

    vibrate.mockClear();
    playCheckoffFeedback({ haptic: false, sound: true });
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("does not throw when vibration or audio APIs are unavailable", () => {
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, "AudioContext", {
      configurable: true,
      value: undefined,
    });

    expect(() => playCheckoffHaptic()).not.toThrow();
    expect(playCheckoffSound()).resolves.toBeUndefined();
    expect(() => playCheckoffFeedback({ haptic: true, sound: true })).not.toThrow();
  });

  it("waits for a suspended audio context before scheduling sound", async () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    const start = vi.fn();
    const stop = vi.fn();
    const setValueAtTime = vi.fn();
    const exponentialRampToValueAtTime = vi.fn();
    const connect = vi.fn();

    class MockAudioContext {
      state = "suspended";
      currentTime = 0;
      destination = {};
      resume = resume;
      createOscillator() {
        return {
          connect,
          frequency: { value: 0 },
          type: "sine",
          start,
          stop,
        };
      }
      createGain() {
        return {
          connect,
          gain: { setValueAtTime, exponentialRampToValueAtTime },
        };
      }
    }

    Object.defineProperty(globalThis, "AudioContext", {
      configurable: true,
      value: MockAudioContext,
    });

    await playCheckoffSound();

    expect(resume).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
  });
});
