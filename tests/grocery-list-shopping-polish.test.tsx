import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GroceryList from "@/pages/grocery-list";
import type { GroceryItem } from "@shared/schema";
import { getQueuedGroceryMutations } from "@/lib/offline-grocery-queue";

let mockItems: GroceryItem[] = [];
let mockIsOfflineData = false;
let mockIsOnline = true;
let mockFamilies = [{ familyId: "family-1", familyName: "Test Family" }];
const refetchGroceryItems = vi.fn();
const setLocation = vi.fn();
const updateCurrentFamily = vi.fn();
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
    refetch: refetchGroceryItems,
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
    allFamilies: mockFamilies,
    familiesLoading: false,
  }),
}));

vi.mock("@/hooks/use-current-family", () => ({
  useCurrentFamily: () => ({
    currentFamilyId: "family-1",
    currentFamily:
      mockFamilies.find((family) => family.familyId === "family-1") ?? null,
    updateCurrentFamily,
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
    mockFamilies = [{ familyId: "family-1", familyName: "Test Family" }];
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

  it("loads drag-and-drop controls only after reorder mode is requested", async () => {
    mockItems.push(
      groceryItem({ id: 1, name: "Melk", sortOrder: 0 }),
      groceryItem({ id: 2, name: "Brood", sortOrder: 1 }),
    );

    render(<GroceryList />);

    expect(screen.queryByRole("button", { name: "Melk verslepen" })).not.toBeInTheDocument();

    const reorderButton = screen.getByRole("button", { name: "Volgorde" });
    expect(reorderButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(reorderButton);

    expect(
      await screen.findByRole("button", { name: "Melk verslepen" }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Klaar" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows a done state when every item is completed", () => {
    mockItems.push(
      groceryItem({ id: 1, name: "Melk", completed: true }),
      groceryItem({ id: 2, name: "Brood", completed: true }),
    );

    render(<GroceryList />);

    expect(screen.getByText("2 van 2 klaar")).toBeInTheDocument();
    // The stats card is the single place that announces the done state;
    // a second celebration card would be redundant.
    expect(screen.getAllByText("Alles afgevinkt")).toHaveLength(1);
    expect(
      screen.queryByText("Je boodschappenlijst is klaar."),
    ).not.toBeInTheDocument();
  });

  it("tucks bulk actions into a single Acties menu", async () => {
    const user = userEvent.setup();
    mockItems.push(groceryItem({ id: 1, name: "Melk" }));

    render(<GroceryList />);

    expect(screen.queryByRole("button", { name: /Alles afvinken/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Acties/i }));

    expect(screen.getByRole("menuitem", { name: /Alles afvinken/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Nog te kopen/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Wis alles/i })).toBeInTheDocument();
  });

  it("clears the search query with the clear button", async () => {
    const user = userEvent.setup();
    mockItems.push(
      groceryItem({ id: 1, name: "Melk" }),
      groceryItem({ id: 2, name: "Brood" }),
    );

    render(<GroceryList />);

    const search = screen.getByPlaceholderText("Zoek in boodschappenlijst...");
    await user.type(search, "melk");

    expect(screen.queryByText("Brood")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zoekopdracht wissen" }));

    expect(search).toHaveValue("");
    expect(screen.getByText("Brood")).toBeInTheDocument();
  });

  it("offers to clear the search when nothing matches", async () => {
    const user = userEvent.setup();
    mockItems.push(groceryItem({ id: 1, name: "Melk" }));

    render(<GroceryList />);

    const search = screen.getByPlaceholderText("Zoek in boodschappenlijst...");
    await user.type(search, "xyz");

    expect(screen.getByText('Geen items gevonden voor "xyz"')).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Wis zoekopdracht" }));

    expect(search).toHaveValue("");
    expect(screen.getByText("Melk")).toBeInTheDocument();
  });

  it("focuses the add-item input from the empty-state call to action", async () => {
    const user = userEvent.setup();

    render(<GroceryList />);

    await user.click(
      screen.getByRole("button", { name: /Voeg je eerste item toe/i }),
    );

    expect(screen.getByPlaceholderText("Voeg een item toe...")).toHaveFocus();
  });

  it("switches families from the header dropdown", async () => {
    const user = userEvent.setup();
    mockFamilies = [
      { familyId: "family-1", familyName: "Test Family" },
      { familyId: "family-2", familyName: "Second Family" },
    ];

    render(<GroceryList />);

    await user.click(screen.getByRole("button", { name: /Wissel van familie/i }));
    await user.click(screen.getByRole("menuitem", { name: "Second Family" }));

    expect(updateCurrentFamily).toHaveBeenCalledWith("family-2");
    expect(setLocation).toHaveBeenCalledWith("/grocery-list/family-2");
  });

  it("shows when the visible list comes from offline cache while the server is unreachable", async () => {
    const user = userEvent.setup();
    mockIsOnline = true;
    mockIsOfflineData = true;
    mockItems.push(groceryItem({ id: 1, name: "Melk" }));

    render(<GroceryList />);

    expect(
      screen.getByText(
        "We kunnen de server niet bereiken. Je ziet opgeslagen gegevens; wijzigingen worden later gesynchroniseerd.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Acties/i }));

    expect(
      screen.getByRole("menuitem", { name: /Alles afvinken/i }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("menuitem", { name: /Nog te kopen/i }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("menuitem", { name: /Wis alles/i }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("refetches cached offline data when the browser reports online again", async () => {
    mockIsOnline = false;
    mockIsOfflineData = true;
    mockItems.push(groceryItem({ id: 1, name: "Melk" }));

    const { rerender } = render(<GroceryList />);

    expect(refetchGroceryItems).not.toHaveBeenCalled();

    mockIsOnline = true;
    rerender(<GroceryList />);

    await waitFor(() => {
      expect(refetchGroceryItems).toHaveBeenCalledTimes(1);
    });
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
