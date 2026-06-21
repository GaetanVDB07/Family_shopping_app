import { describe, expect, it } from "vitest";
import {
  LIST_ITEM_MAX_STAGGER_INDEX,
  LIST_ITEM_STAGGER_DISABLE_THRESHOLD,
  LIST_ITEM_STAGGER_STEP_MS,
  getListItemStaggerAnimation,
} from "../client/src/lib/list-item-animation";

describe("getListItemStaggerAnimation", () => {
  it("keeps staggered enter animation for small lists", () => {
    expect(getListItemStaggerAnimation(2, 5)).toEqual({
      className: "animate-in slide-in-from-left duration-300",
      style: { animationDelay: `${2 * LIST_ITEM_STAGGER_STEP_MS}ms` },
    });
  });

  it("caps stagger delay after the configured index", () => {
    const cappedIndex = LIST_ITEM_MAX_STAGGER_INDEX + 5;

    expect(getListItemStaggerAnimation(cappedIndex, 15)).toEqual({
      className: "animate-in slide-in-from-left duration-300",
      style: {
        animationDelay: `${LIST_ITEM_MAX_STAGGER_INDEX * LIST_ITEM_STAGGER_STEP_MS}ms`,
      },
    });
  });

  it("disables stagger animation for large lists", () => {
    expect(
      getListItemStaggerAnimation(0, LIST_ITEM_STAGGER_DISABLE_THRESHOLD + 1),
    ).toEqual({});
    expect(
      getListItemStaggerAnimation(5, LIST_ITEM_STAGGER_DISABLE_THRESHOLD + 1),
    ).toEqual({});
  });
});
