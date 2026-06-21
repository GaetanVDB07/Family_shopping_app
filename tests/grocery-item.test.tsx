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
