import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FamilySwitcher } from "@/components/family-switcher";

const families = [
  { familyId: "family-1", familyName: "Familie Jansen" },
  { familyId: "family-2", familyName: "Familie Peeters" },
];

describe("FamilySwitcher", () => {
  it("renders nothing when the user belongs to a single family", () => {
    render(
      <FamilySwitcher
        families={[families[0]]}
        currentFamilyId="family-1"
        onSwitch={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Wissel van familie/i }),
    ).not.toBeInTheDocument();
  });

  it("lets the user switch to another family from the dropdown", async () => {
    const user = userEvent.setup();
    const onSwitch = vi.fn();

    render(
      <FamilySwitcher
        families={families}
        currentFamilyId="family-1"
        onSwitch={onSwitch}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Wissel van familie/i }));
    await user.click(screen.getByRole("menuitem", { name: "Familie Peeters" }));

    expect(onSwitch).toHaveBeenCalledTimes(1);
    expect(onSwitch).toHaveBeenCalledWith("family-2");
  });

  it("marks the current family in the dropdown", async () => {
    const user = userEvent.setup();

    render(
      <FamilySwitcher
        families={families}
        currentFamilyId="family-1"
        onSwitch={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Wissel van familie/i }));

    expect(
      screen.getByRole("menuitem", { name: /Familie Jansen/ }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      screen.getByRole("menuitem", { name: /Familie Peeters/ }),
    ).not.toHaveAttribute("aria-current");
  });
});
