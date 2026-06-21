import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GroceryList from "@/pages/grocery-list";
import type { GroceryItem } from "@shared/schema";
import { getQueuedGroceryMutations } from "@/lib/offline-grocery-queue";

let mockItems: GroceryItem[] = [];
let mockIsOfflineData = false;
let mockIsOnline = true;
const setLocation = vi.fn();
const memberNames = new Map([["22222222-2222-2222-2222-222222222222", "Lisa"]]);
const setQueryData = vi.fn((queryKey, updater) => {
  const next =
    typeof updater === "function"
      ? updater(mockItems)
      : updater;

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
      mutate: vi.fn(),
      mutateAsync: vi.fn(async (variables) => options?.mutationFn?.(variables)),
    }),
    useQueryClient: () => queryClient,
  };
});

vi.mock("@/hooks/use-grocery-items", () => ({
  useGroceryItems: () => ({
    data: mockItems,
    isOfflineData: mockIsOfflineData,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-grocery-history", () => ({
  useGroceryHistory: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-family-member-names", () => ({
  useFamilyMemberNames: () => ({
    memberNames,
    isReady: true,
  }),
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
  useOnlineStatus: () => mockIsOnline,
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

describe("GroceryList shopping-friendly polish", () => {
  beforeEach(() => {
    localStorage.clear();
    mockItems = [];
    mockIsOfflineData = false;
    mockIsOnline = true;
    vi.clearAllMocks();
  });

  it("shows grocery progress without switching to a separate mode", () => {
    mockItems.push(
      groceryItem({ id: 1, name: "Melk", completed: true }),
      groceryItem({ id: 2, name: "Brood", completed: false }),
      groceryItem({ id: 3, name: "Appels", completed: false }),
    );

    render(<GroceryList />);

    expect(screen.getByText("1 van 3 klaar")).toBeInTheDocument();
    expect(screen.getByText("2 te gaan")).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar", {
      name: "Voortgang boodschappen",
    });
    expect(progressBar).toHaveAttribute("aria-valuenow", "1");
    expect(progressBar).toHaveAttribute("aria-valuemax", "3");
  });

  it("shows a done state when every item is completed", () => {
    mockItems.push(
      groceryItem({ id: 1, name: "Melk", completed: true }),
      groceryItem({ id: 2, name: "Brood", completed: true }),
    );

    render(<GroceryList />);

    expect(screen.getByText("2 van 2 klaar")).toBeInTheDocument();
    expect(screen.getAllByText("Alles afgevinkt").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Je boodschappenlijst is klaar."),
    ).toBeInTheDocument();
  });

  it("shows when the visible list comes from offline cache", () => {
    mockIsOnline = true;
    mockIsOfflineData = true;
    mockItems.push(groceryItem({ id: 1, name: "Melk" }));

    render(<GroceryList />);

    expect(
      screen.getByText(
        "Je bent offline. Wij synchroniseren je wijzigingen zodra je weer online bent.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alles afvinken/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Nog te kopen/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Wis alles/i })).toBeDisabled();
  });

  it("re-applies member names when grocery items load after member names", () => {
    const { rerender } = render(<GroceryList />);

    mockItems = [
      groceryItem({
        id: 1,
        addedBy: "22222222-2222-2222-2222-222222222222",
      }),
    ];
    rerender(<GroceryList />);

    expect(mockItems[0]?.addedBy).toBe("Lisa");
  });

  it("queues and optimistically caches a new item while offline", async () => {
    mockIsOnline = false;

    render(<GroceryList />);

    fireEvent.change(screen.getByPlaceholderText("Voeg een item toe..."), {
      target: { value: "Offline melk" },
    });
    await act(async () => {
      fireEvent.submit(
        screen.getByPlaceholderText("Voeg een item toe...").closest("form")!,
      );
      await Promise.resolve();
    });

    expect(mockItems).toEqual([
      expect.objectContaining({
        name: "Offline melk",
        completed: false,
        familyId: "family-1",
      }),
    ]);
    expect(getQueuedGroceryMutations("family-1")).toEqual([
      expect.objectContaining({
        type: "add",
        payload: expect.objectContaining({ name: "Offline melk" }),
      }),
    ]);
  });
});
