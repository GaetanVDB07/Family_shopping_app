import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GroceryItemComponent } from '../client/src/components/grocery-item'
import type { GroceryItem } from '../shared/schema'

const sampleItem: GroceryItem = {
  id: 1,
  name: 'Milk',
  completed: false,
  addedBy: 'tester',
  familyId: 'fam1',
  createdAt: new Date()
}

describe('GroceryItemComponent', () => {
  it('renders item name and triggers toggle', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    render(<GroceryItemComponent item={sampleItem} onToggle={onToggle} onDelete={onDelete} />)
    expect(screen.getByText('Milk')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(onToggle).toHaveBeenCalledWith(1)
  })
})
