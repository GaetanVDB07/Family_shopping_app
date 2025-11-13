import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddItemForm } from '@/components/add-item-form';
import type { GroceryItem } from '@shared/schema';

const toastSpy = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

describe('AddItemForm', () => {
  const baseItem = (overrides: Partial<GroceryItem> = {}): GroceryItem => ({
    id: 1,
    name: 'Sample',
    completed: false,
    addedBy: 'user-1',
    familyId: 'family-1',
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    toastSpy.mockReset();
  });

  it('reactivates a completed item when selecting a suggestion', async () => {
    const onAddItem = vi.fn().mockResolvedValue(undefined);
    const onReactivateItem = vi.fn();

    render(
      <AddItemForm
        onAddItem={onAddItem}
        onReactivateItem={onReactivateItem}
        isLoading={false}
        existingItems={[
          baseItem({ id: 1, name: 'Apples', completed: true }),
          baseItem({ id: 2, name: 'Banana', completed: false }),
        ]}
      />
    );

    const input = screen.getByPlaceholderText('Voeg een item toe...') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'app' } });

    const suggestion = await screen.findByRole('button', { name: 'Apples' });
    fireEvent.mouseDown(suggestion);

    expect(onReactivateItem).toHaveBeenCalledWith(1);
    expect(input.value).toBe('');
    expect(onAddItem).not.toHaveBeenCalled();
  });

  it('prefills the input when selecting a pending item suggestion', async () => {
    const onAddItem = vi.fn().mockResolvedValue(undefined);
    const onReactivateItem = vi.fn();

    render(
      <AddItemForm
        onAddItem={onAddItem}
        onReactivateItem={onReactivateItem}
        isLoading={false}
        existingItems={[baseItem({ id: 5, name: 'Carrots', completed: false })]}
      />
    );

    const input = screen.getByPlaceholderText('Voeg een item toe...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'car' } });

    const suggestion = await screen.findByRole('button', { name: 'Carrots' });
    fireEvent.mouseDown(suggestion);

    expect(onReactivateItem).not.toHaveBeenCalled();
    expect(input.value).toBe('Carrots');
  });

  it('submits a new item and clears the field', async () => {
    const onAddItem = vi.fn().mockResolvedValue(undefined);
    const onReactivateItem = vi.fn();

    render(
      <AddItemForm
        onAddItem={onAddItem}
        onReactivateItem={onReactivateItem}
        isLoading={false}
        existingItems={[]}
      />
    );

    const input = screen.getByPlaceholderText('Voeg een item toe...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Bread  ' } });

    const form = input.closest('form');
    await act(async () => {
      fireEvent.submit(form!);
      await Promise.resolve();
    });

    expect(onAddItem).toHaveBeenCalledWith('Bread', 'Familie');
    expect(input.value).toBe('');
    expect(onReactivateItem).not.toHaveBeenCalled();
  });
});
