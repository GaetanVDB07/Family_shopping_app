import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { GroceryItemComponent } from '../client/src/components/grocery-item'
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
    fireEvent.click(screen.getAllByRole('button')[0])
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
})
