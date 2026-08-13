import { describe, it, expect } from 'vitest'
import { periodStartFor, sumForPeriod } from '../utils/limits'

describe('limits utils', () => {
  it('periodStartFor - daily', () => {
    const d = '2026-08-13T12:34:39.085-05:00'
    const s = periodStartFor(d, 'daily')
    const sd = new Date(s)
    expect(sd.getFullYear()).toBe(2026)
    expect(sd.getMonth()).toBe(7) // August is month 7 (0-based)
    expect(sd.getDate()).toBe(13)
  })

  it('periodStartFor - weekly (monday)', () => {
    // 2026-08-13 is Thursday; week start should be Monday 2026-08-10
    const d = '2026-08-13T00:00:00.000Z'
    const s = periodStartFor(d, 'weekly')
    const sd = new Date(s)
    expect(sd.getDay()).toBe(1) // Monday
    expect(sd.getDate()).toBe(10)
  })

  it('periodStartFor - biweekly', () => {
    const d1 = '2026-08-05T00:00:00.000Z' // first half
    const s1 = periodStartFor(d1, 'biweekly')
    expect(new Date(s1).getDate()).toBe(1)
    const d2 = '2026-08-20T00:00:00.000Z' // second half
    const s2 = periodStartFor(d2, 'biweekly')
    expect(new Date(s2).getDate()).toBe(15)
  })

  it('sumForPeriod sums transactions for current period', () => {
    // construct transactions around Aug 2026 month
    const txs = [
      { id: 't1', date: '2026-08-01T10:00:00.000Z', amount: -10, category: 'food', user_id: 'u1' },
      { id: 't2', date: '2026-08-05T10:00:00.000Z', amount: -20, category: 'food', user_id: 'u1' },
      { id: 't3', date: '2026-07-25T10:00:00.000Z', amount: -50, category: 'food', user_id: 'u1' },
      { id: 't4', date: '2026-08-10T10:00:00.000Z', amount: 100, category: 'income', user_id: 'u1' }
    ]
    // assert monthly total for August should sum amounts whose date in August
    const res = sumForPeriod(txs, 'monthly', { category: 'food', user_id: 'u1' })
    expect(res.total).toBe(-30)
    expect(res.count).toBe(2)
  })
})
