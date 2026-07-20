import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { GroceryItemComponent, groceryItemPropsAreEqual } from '../client/src/components/grocery-item'
import type { GroceryItem } from '../shared/schema'

const sampleItem: GroceryItem = {
  id: 1,
  name: 'Milk',
  quantity: null,
  unit: null,
  notes: null,
  completed: false,
  addedBy: 'tester',
  addedByName: 'tester',
  familyId: 'fam1',
  addedAt: new Date('2026-06-11T12:00:00.000Z'),
  sortOrder: 0,
  completedAt: null,
  archivedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

describe('GroceryItemComponent', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders item name and triggers toggle', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    render(<GroceryItemComponent item={sampleItem} onToggle={onToggle} onDelete={onDelete} />)
    expect(screen.getByText('Milk')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Milk afvinken' }))
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  it('renders item notes when provided', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    render(
      <GroceryItemComponent
        item={{ ...sampleItem, notes: 'Halfvolle melk' }}
        onToggle={onToggle}
        onDelete={onDelete}
      />
    )
    expect(screen.getByText('Halfvolle melk')).toBeInTheDocument()
  })

  it('shows who added the item and when', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-11T15:00:00.000Z'))

    const onToggle = vi.fn()
    const onDelete = vi.fn()
    render(<GroceryItemComponent item={sampleItem} onToggle={onToggle} onDelete={onDelete} />)
    expect(screen.getByText(/door tester · vandaag/i)).toBeInTheDocument()
  })

  it('renders quantity and unit when provided', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    render(
      <GroceryItemComponent
        item={{ ...sampleItem, quantity: '2', unit: 'L' }}
        onToggle={onToggle}
        onDelete={onDelete}
      />
    )
    expect(screen.getByText('2 L')).toBeInTheDocument()
  })

  it('edits item details', async () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    const onUpdate = vi.fn()

    render(
      <GroceryItemComponent
        item={{ ...sampleItem, quantity: '1', unit: 'L', notes: 'Halfvol' }}
        onToggle={onToggle}
        onDelete={onDelete}
        onUpdate={onUpdate}
      />
    )

    fireEvent.click(screen.getByLabelText('Milk bewerken'))
    fireEvent.change(screen.getByPlaceholderText('Itemnaam'), { target: { value: 'Havermelk' } })
    fireEvent.change(screen.getByPlaceholderText('Hoeveelheid'), { target: { value: '2' } })
    fireEvent.change(screen.getByPlaceholderText('Eenheid'), { target: { value: 'pakken' } })
    fireEvent.change(screen.getByPlaceholderText('Notities'), { target: { value: 'Ongezoet' } })
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(1, {
        name: 'Havermelk',
        quantity: '2',
        unit: 'pakken',
        notes: 'Ongezoet',
      })
    })
  })

  it('configures the reorder handle for touch dragging', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    render(
      <GroceryItemComponent
        item={sampleItem}
        onToggle={onToggle}
        onDelete={onDelete}
        dragHandleProps={{ role: 'button', tabIndex: 0 }}
      />
    )

    const handle = screen.getByRole('button', { name: 'Milk verslepen' })

    expect(handle).toHaveAttribute('data-grocery-drag-handle', 'true')
    expect((handle as HTMLElement).style.touchAction).toBe('none')
  })

  it('does not treat touches on the reorder handle as swipe-to-delete gestures', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    render(
      <GroceryItemComponent
        item={sampleItem}
        onToggle={onToggle}
        onDelete={onDelete}
        dragHandleProps={{ role: 'button', tabIndex: 0 }}
      />
    )

    const handle = screen.getByRole('button', { name: 'Milk verslepen' })

    fireEvent.touchStart(handle, {
      touches: [{ clientX: 120, clientY: 20 }],
    })
    fireEvent.touchMove(handle, {
      touches: [{ clientX: 20, clientY: 20 }],
    })
    fireEvent.touchEnd(handle)

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('keeps desktop delete available while placing the drag handle at the end', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    const onUpdate = vi.fn()

    render(
      <GroceryItemComponent
        item={sampleItem}
        onToggle={onToggle}
        onDelete={onDelete}
        onUpdate={onUpdate}
        dragHandleProps={{ role: 'button', tabIndex: 0 }}
      />
    )

    const editButton = screen.getByRole('button', { name: 'Milk bewerken' })
    const deleteButton = screen.getByRole('button', { name: 'Milk verwijderen' })
    const dragHandle = screen.getByRole('button', { name: 'Milk verslepen' })

    expect(deleteButton).toHaveClass('hidden', 'sm:inline-flex')
    expect(
      editButton.compareDocumentPosition(deleteButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      deleteButton.compareDocumentPosition(dragHandle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('reports a left swipe as a "swipe" delete', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    render(<GroceryItemComponent item={sampleItem} onToggle={onToggle} onDelete={onDelete} />)

    const name = screen.getByText('Milk')
    fireEvent.touchStart(name, { touches: [{ clientX: 120, clientY: 20 }] })
    fireEvent.touchMove(name, { touches: [{ clientX: 20, clientY: 20 }] })
    fireEvent.touchEnd(name)

    expect(onDelete).toHaveBeenCalledWith(sampleItem, 'swipe')
  })

  it('reports a trash button click as a "button" delete', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    render(<GroceryItemComponent item={sampleItem} onToggle={onToggle} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Milk verwijderen' }))

    expect(onDelete).toHaveBeenCalledWith(sampleItem, 'button')
  })

  it('groceryItemPropsAreEqual treats unchanged items as equal', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    const props = { item: sampleItem, onToggle, onDelete }

    expect(groceryItemPropsAreEqual(props, props)).toBe(true)
    expect(groceryItemPropsAreEqual(props, {
      ...props,
      item: { ...sampleItem, completed: true },
    })).toBe(false)
    expect(groceryItemPropsAreEqual(props, {
      ...props,
      onToggle: vi.fn(),
    })).toBe(false)
    expect(groceryItemPropsAreEqual(props, {
      ...props,
      item: { ...sampleItem, name: 'Cheese' },
    })).toBe(false)
  })

  it('memo comparator allows rerender when only unrelated item fields change', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    const baseProps = { item: sampleItem, onToggle, onDelete }
    const nextProps = {
      ...baseProps,
      item: {
        ...sampleItem,
        familyId: 'other-family',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    }

    expect(groceryItemPropsAreEqual(baseProps, nextProps)).toBe(true)
  })
})
