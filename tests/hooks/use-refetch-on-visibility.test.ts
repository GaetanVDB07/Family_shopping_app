import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRefetchOnVisibility } from '@/hooks/use-refetch-on-visibility';

function setVisibilityState(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  });
}

function dispatchVisibilityChange() {
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useRefetchOnVisibility', () => {
  beforeEach(() => {
    setVisibilityState('visible');
  });

  it('refetches when the tab becomes visible', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);

    setVisibilityState('hidden');
    renderHook(() => useRefetchOnVisibility(refetch));

    expect(refetch).not.toHaveBeenCalled();

    setVisibilityState('visible');
    dispatchVisibilityChange();

    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  it('does not refetch when the tab is hidden', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);

    renderHook(() => useRefetchOnVisibility(refetch));
    setVisibilityState('hidden');
    dispatchVisibilityChange();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(refetch).not.toHaveBeenCalled();
  });

  it('does not run concurrent refetches', async () => {
    let resolveRefetch: (() => void) | null = null;
    const refetch = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveRefetch = resolve; }),
    );

    setVisibilityState('hidden');
    renderHook(() => useRefetchOnVisibility(refetch));

    setVisibilityState('visible');
    dispatchVisibilityChange();
    dispatchVisibilityChange();
    dispatchVisibilityChange();

    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    resolveRefetch?.();
  });

  it('cleans up the listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const refetch = vi.fn().mockResolvedValue(undefined);

    const { unmount } = renderHook(() => useRefetchOnVisibility(refetch));
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });
});
