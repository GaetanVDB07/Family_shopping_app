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
    quantity: null,
    unit: null,
    notes: null,
    completed: false,
    addedBy: 'user-1',
    familyId: 'family-1',
    addedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    toastSpy.mockReset();
  });

  it('hides optional fields until the user expands Meer details', () => {
    render(
      <AddItemForm
        onAddItem={vi.fn()}
        onReactivateItem={vi.fn()}
        isLoading={false}
        existingItems={[]}
      />
    );

    expect(screen.queryByPlaceholderText('Aantal (optioneel), bijv. 2')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Notitie (optioneel), bijv. halfvolle melk')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Voeg een item toe...'), {
      target: { value: 'Melk' },
    });

    expect(screen.queryByPlaceholderText('Aantal (optioneel), bijv. 2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Meer details/i }));

    expect(screen.getByPlaceholderText('Aantal (optioneel), bijv. 2')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Notitie (optioneel), bijv. halfvolle melk')).toBeInTheDocument();
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

  it('does not suggest pending items that are already on the list', () => {
    render(
      <AddItemForm
        onAddItem={vi.fn()}
        onReactivateItem={vi.fn()}
        isLoading={false}
        existingItems={[baseItem({ id: 5, name: 'Carrots', completed: false })]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Voeg een item toe...'), {
      target: { value: 'car' },
    });

    expect(screen.queryByRole('button', { name: 'Carrots' })).not.toBeInTheDocument();
  });

  it('warns and blocks adding an active duplicate item', async () => {
    const onAddItem = vi.fn().mockResolvedValue(undefined);

    render(
      <AddItemForm
        onAddItem={onAddItem}
        onReactivateItem={vi.fn()}
        isLoading={false}
        existingItems={[baseItem({ id: 5, name: 'Melk', completed: false })]}
      />
    );

    const input = screen.getByPlaceholderText('Voeg een item toe...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  melk  ' } });

    expect(screen.getByText('Melk staat al op de lijst')).toBeInTheDocument();

    const form = input.closest('form');
    await act(async () => {
      fireEvent.submit(form!);
      await Promise.resolve();
    });

    expect(onAddItem).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith({
      title: 'Staat al op de lijst',
      description: 'Melk staat al op de lijst',
    });
  });

  it('normalizes extra spaces when detecting active duplicates', () => {
    render(
      <AddItemForm
        onAddItem={vi.fn()}
        onReactivateItem={vi.fn()}
        isLoading={false}
        existingItems={[baseItem({ id: 5, name: 'Rode paprika', completed: false })]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Voeg een item toe...'), {
      target: { value: 'rode   paprika' },
    });

    expect(screen.getByText('Rode paprika staat al op de lijst')).toBeInTheDocument();
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

    expect(onAddItem).toHaveBeenCalledWith('Bread', 'Familie', undefined);
    expect(input.value).toBe('');
    expect(onReactivateItem).not.toHaveBeenCalled();
  });

  it('submits notes when provided', async () => {
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

    fireEvent.change(screen.getByPlaceholderText('Voeg een item toe...'), {
      target: { value: 'Melk' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Meer details/i }));
    fireEvent.change(screen.getByPlaceholderText('Notitie (optioneel), bijv. halfvolle melk'), {
      target: { value: '  Halfvolle melk  ' },
    });

    const form = screen.getByPlaceholderText('Voeg een item toe...').closest('form');
    await act(async () => {
      fireEvent.submit(form!);
      await Promise.resolve();
    });

    expect(onAddItem).toHaveBeenCalledWith('Melk', 'Familie', { notes: 'Halfvolle melk' });
  });

  it('submits quantity and unit when provided', async () => {
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

    fireEvent.change(screen.getByPlaceholderText('Voeg een item toe...'), {
      target: { value: 'Melk' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Meer details/i }));
    fireEvent.change(screen.getByPlaceholderText('Aantal (optioneel), bijv. 2'), {
      target: { value: ' 2 ' },
    });
    fireEvent.change(screen.getByPlaceholderText('Eenheid (optioneel), bijv. L, stuks'), {
      target: { value: ' L ' },
    });

    const form = screen.getByPlaceholderText('Voeg een item toe...').closest('form');
    await act(async () => {
      fireEvent.submit(form!);
      await Promise.resolve();
    });

    expect(onAddItem).toHaveBeenCalledWith('Melk', 'Familie', {
      quantity: '2',
      unit: 'L',
    });
  });
});
