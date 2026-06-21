const STORAGE_KEY = "checkoff-feedback:v1";

export interface CheckoffFeedbackPreferences {
  haptic: boolean;
  sound: boolean;
}

const DEFAULT_PREFERENCES: CheckoffFeedbackPreferences = {
  haptic: true,
  sound: true,
};

let audioContext: AudioContext | null = null;

function getStorage(): Storage | null {
  return "localStorage" in globalThis ? globalThis.localStorage : null;
}

export function getCheckoffFeedbackPreferences(): CheckoffFeedbackPreferences {
  const storage = getStorage();
  if (!storage) {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFERENCES };
    }

    const parsed = JSON.parse(raw) as Partial<CheckoffFeedbackPreferences>;
    return {
      haptic: parsed.haptic ?? DEFAULT_PREFERENCES.haptic,
      sound: parsed.sound ?? DEFAULT_PREFERENCES.sound,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function setCheckoffFeedbackPreferences(
  preferences: CheckoffFeedbackPreferences,
): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function playCheckoffHaptic(): void {
  try {
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
    }
  } catch {
    // Ignore unsupported or blocked vibration APIs.
  }
}

export async function playCheckoffSound(): Promise<void> {
  try {
    const AudioContextClass =
      globalThis.AudioContext
      ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    const context = audioContext;
    if (context.state === "suspended") {
      await context.resume();
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.08);
  } catch {
    // Ignore unsupported or blocked audio APIs.
  }
}

export function playCheckoffFeedback(
  preferences: CheckoffFeedbackPreferences = getCheckoffFeedbackPreferences(),
): void {
  if (preferences.haptic) {
    playCheckoffHaptic();
  }

  if (preferences.sound) {
    void playCheckoffSound();
  }
}
