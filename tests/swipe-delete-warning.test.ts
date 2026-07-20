import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  SWIPE_DELETE_WARNING_INTERVAL_MS,
  shouldShowSwipeDeleteWarning,
  recordSwipeDeleteWarningShown,
} from '../client/src/lib/swipe-delete-warning'

describe('swipe-delete-warning', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the warning when nothing was recorded yet', () => {
    expect(shouldShowSwipeDeleteWarning('user-1')).toBe(true)
  })

  it('suppresses the warning within 60 minutes of recording', () => {
    const now = Date.now()
    recordSwipeDeleteWarningShown('user-1', now)

    expect(shouldShowSwipeDeleteWarning('user-1', now + SWIPE_DELETE_WARNING_INTERVAL_MS - 1)).toBe(false)
  })

  it('shows the warning again once 60 minutes have passed', () => {
    const now = Date.now()
    recordSwipeDeleteWarningShown('user-1', now)

    expect(shouldShowSwipeDeleteWarning('user-1', now + SWIPE_DELETE_WARNING_INTERVAL_MS)).toBe(true)
  })

  it('shows the warning when the stored value is corrupted', () => {
    localStorage.setItem('swipe-delete-warning-shown-at:user-1', 'not-a-number')

    expect(shouldShowSwipeDeleteWarning('user-1')).toBe(true)
  })

  it('shows the warning when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })

    expect(shouldShowSwipeDeleteWarning('user-1')).toBe(true)
  })

  it('does not crash when recording and localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })

    expect(() => recordSwipeDeleteWarningShown('user-1')).not.toThrow()
  })

  it('tracks suppression per user', () => {
    const now = Date.now()
    recordSwipeDeleteWarningShown('user-1', now)

    expect(shouldShowSwipeDeleteWarning('user-2', now)).toBe(true)
    expect(shouldShowSwipeDeleteWarning('user-1', now)).toBe(false)
  })
})
