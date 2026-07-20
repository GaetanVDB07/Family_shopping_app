import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GroceryList from "@/pages/grocery-list";
import type { GroceryItem } from "@shared/schema";

let mockItems: GroceryItem[] = [];
const deleteMutate = vi.fn();
const setLocation = vi.fn();
const setQueryData = vi.fn((queryKey, updater) => {
  const next = typeof updater === "function" ? updater(mockItems) : updater;
  mockItems = [...(next ?? [])];
});
const queryClient = {
  setQueryData,
  cancelQueries: vi.fn(),
  getQueryData: vi.fn(),
};

vi.mock("wouter", () => ({
  useLocation: () => ["/grocery-list/family-1", setLocation],
  useParams: () => ({ familyId: "family-1" }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useMutation: (options: any) => ({
      isPending: false,
      mutate: (variables: any) => deleteMutate(variables),
      mutateAsync: vi.fn(async (variables) => options?.mutationFn?.(variables)),
    }),
    useQueryClient: () => queryClient,
  };
});

vi.mock("@/hooks/use-grocery-items", () => ({
  useGroceryItems: () => ({
    data: mockItems,
    isOfflineData: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-grocery-history", () => ({
  useGroceryHistory: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/use-family-member-names", () => ({
  useFamilyMemberNames: () => ({ memberNames: new Map(), isReady: true }),
}));

vi.mock("@/hooks/use-pull-to-refresh", () => ({
  usePullToRefresh: () => ({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    shouldShowIndicator: false,
  }),
}));

vi.mock("@/hooks/use-online-status", () => ({
  useOnlineStatus: () => true,
}));

vi.mock("@/hooks/use-websocket", () => ({
  useWebSocket: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "user@test.dev" } }),
}));

vi.mock("@/hooks/use-family-status", () => ({
  useFamilyStatus: () => ({
    allFamilies: [{ familyId: "family-1", familyName: "Test Family" }],
    familiesLoading: false,
  }),
}));

vi.mock("@/hooks/use-current-family", () => ({
  useCurrentFamily: () => ({
    currentFamilyId: "family-1",
    currentFamily: { familyId: "family-1", familyName: "Test Family" },
    updateCurrentFamily: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/user-menu", () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

function groceryItem(overrides: Partial<GroceryItem>): GroceryItem {
  return {
    id: 1,
    name: "Melk",
    quantity: null,
    unit: null,
    notes: null,
    completed: false,
    addedBy: "tester",
    addedByName: null,
    familyId: "family-1",
    addedAt: new Date("2026-06-11T12:00:00.000Z"),
    sortOrder: 0,
    completedAt: null,
    archivedAt: null,
    createdAt: new Date("2026-06-11T12:00:00.000Z"),
    ...overrides,
  };
}

function swipeLeftOn(element: HTMLElement) {
  fireEvent.touchStart(element, { touches: [{ clientX: 200, clientY: 20 }] });
  fireEvent.touchMove(element, { touches: [{ clientX: 60, clientY: 20 }] });
  fireEvent.touchEnd(element);
}

describe("GroceryList swipe-delete warning", () => {
  beforeEach(() => {
    localStorage.clear();
    mockItems = [groceryItem({ id: 1, name: "Melk" })];
    vi.clearAllMocks();
  });

  it("warns on the first swipe instead of deleting immediately", () => {
    render(<GroceryList />);

    swipeLeftOn(screen.getByText("Melk"));

    expect(screen.getByText("Item verwijderen?")).toBeInTheDocument();
    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it("deletes after confirming and records the suppression timestamp", () => {
    render(<GroceryList />);

    swipeLeftOn(screen.getByText("Melk"));
    fireEvent.click(screen.getByRole("button", { name: "Verwijderen" }));

    expect(deleteMutate).toHaveBeenCalledWith(1);
    expect(localStorage.getItem("swipe-delete-warning-shown-at:user-1")).not.toBeNull();
  });

  it("does not delete when the warning is cancelled", () => {
    render(<GroceryList />);

    swipeLeftOn(screen.getByText("Melk"));
    fireEvent.click(screen.getByRole("button", { name: "Annuleren" }));

    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it("deletes immediately on swipe while suppression is active", () => {
    localStorage.setItem("swipe-delete-warning-shown-at:user-1", String(Date.now()));
    render(<GroceryList />);

    swipeLeftOn(screen.getByText("Melk"));

    expect(deleteMutate).toHaveBeenCalledWith(1);
    expect(screen.queryByText("Item verwijderen?")).not.toBeInTheDocument();
  });

  it("deletes immediately via the trash button without a warning", () => {
    render(<GroceryList />);

    fireEvent.click(screen.getByRole("button", { name: "Melk verwijderen" }));

    expect(deleteMutate).toHaveBeenCalledWith(1);
    expect(screen.queryByText("Item verwijderen?")).not.toBeInTheDocument();
  });
});
