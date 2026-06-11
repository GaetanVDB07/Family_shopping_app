import type { ClipboardEvent, KeyboardEvent } from "react";

export const VALIDATION_ERROR_TOAST_DURATION = 2500;

export function maxLengthMessage(maxLength: number): string {
  return `Maximaal ${maxLength} tekens toegestaan`;
}

export function parseApiErrorBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as { message?: unknown; error?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    // Plain-text error bodies are shown as-is below.
  }

  return trimmed;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

type ErrorToastFn = (props: {
  title?: string;
  description?: string;
  variant?: "destructive";
  duration?: number;
}) => void;

export function toastApiError(toast: ErrorToastFn, error: unknown, fallback: string): void {
  toast({
    title: "Fout",
    description: getApiErrorMessage(error, fallback),
    variant: "destructive",
    duration: VALIDATION_ERROR_TOAST_DURATION,
  });
}

let lastMaxLengthToastAt = 0;

export function notifyMaxLengthLimit(toast: ErrorToastFn, maxLength: number): void {
  const now = Date.now();
  if (now - lastMaxLengthToastAt < 1500) {
    return;
  }

  lastMaxLengthToastAt = now;
  toast({
    title: "Fout",
    description: maxLengthMessage(maxLength),
    variant: "destructive",
    duration: VALIDATION_ERROR_TOAST_DURATION,
  });
}

export function maxLengthInputProps(maxLength: number, toast: ErrorToastFn) {
  return {
    maxLength,
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      if (
        input.value.length >= maxLength &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        notifyMaxLengthLimit(toast, maxLength);
      }
    },
    onPaste: (event: ClipboardEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const pasted = event.clipboardData.getData("text");
      if (input.value.length + pasted.length > maxLength) {
        notifyMaxLengthLimit(toast, maxLength);
      }
    },
  };
}
