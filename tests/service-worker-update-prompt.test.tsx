import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceWorkerUpdatePrompt } from "@/components/service-worker-update-prompt";
import { APP_UPDATE_AVAILABLE_EVENT } from "@/lib/service-worker";

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({ toast }));

describe("ServiceWorkerUpdatePrompt", () => {
  it("shows a refresh action when a new app version becomes active", () => {
    render(<ServiceWorkerUpdatePrompt />);

    window.dispatchEvent(new Event(APP_UPDATE_AVAILABLE_EVENT));

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Nieuwe versie beschikbaar",
        description: expect.stringContaining("nieuwste verbeteringen"),
        action: expect.anything(),
      }),
    );
  });
});
