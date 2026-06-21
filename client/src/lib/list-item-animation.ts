export const LIST_ITEM_STAGGER_STEP_MS = 50;
export const LIST_ITEM_MAX_STAGGER_INDEX = 12;
export const LIST_ITEM_STAGGER_DISABLE_THRESHOLD = 20;

export interface ListItemStaggerAnimation {
  className?: string;
  style?: { animationDelay: string };
}

export function getListItemStaggerAnimation(
  index: number,
  listLength: number,
): ListItemStaggerAnimation {
  if (listLength > LIST_ITEM_STAGGER_DISABLE_THRESHOLD) {
    return {};
  }

  const cappedIndex = Math.min(index, LIST_ITEM_MAX_STAGGER_INDEX);

  return {
    className: "animate-in slide-in-from-left duration-300",
    style: { animationDelay: `${cappedIndex * LIST_ITEM_STAGGER_STEP_MS}ms` },
  };
}
