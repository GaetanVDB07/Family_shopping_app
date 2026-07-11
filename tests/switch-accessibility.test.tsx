import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Switch } from "@/components/ui/switch";

describe("Switch touch target", () => {
  it("provides a 44 by 44 pixel mobile target around the visual track", () => {
    render(<Switch aria-label="Meldingen" />);

    expect(screen.getByRole("switch", { name: "Meldingen" })).toHaveClass("h-11", "w-11");
  });
});
