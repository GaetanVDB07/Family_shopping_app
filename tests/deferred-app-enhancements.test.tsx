import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeferredAppEnhancements } from "@/components/deferred-app-enhancements";

vi.mock("@/components/ui/toaster", () => ({
  Toaster: () => <div data-testid="deferred-toaster" />,
}));
vi.mock("@/components/service-worker-update-prompt", () => ({
  ServiceWorkerUpdatePrompt: () => <div data-testid="deferred-update-prompt" />,
}));

describe("DeferredAppEnhancements", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps auxiliary UI out of the critical render and loads it shortly after", async () => {
    vi.useFakeTimers();

    render(<DeferredAppEnhancements />);
    expect(screen.queryByTestId("deferred-toaster")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(screen.getByTestId("deferred-toaster")).toBeInTheDocument();
    expect(screen.getByTestId("deferred-update-prompt")).toBeInTheDocument();
  });
});
