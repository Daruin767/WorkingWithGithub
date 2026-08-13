import { describe, it, expect, beforeEach } from 'vitest'
import { add, getAll, remove, importAllData, closeDB } from '../idb'

describe('transactions basic', () => {
  beforeEach(async () => {
    // reset DB to a clean state
    await closeDB()
    await importAllData({ transactions: [] })
  })

  it('adds and retrieves a transaction', async () => {
    const tx = { id: 't1', user_id: 'u1', amount: -20, kind: 'unexpected', description: 'Coffee', date: Date.now() }
    await add('transactions', tx)
    const all = await getAll('transactions')
    expect(all.length).toBe(1)
    expect(all[0].id).toBe('t1')
    expect(all[0].amount).toBe(-20)
  })

  it('removes a transaction', async () => {
    const tx = { id: 't2', user_id: 'u1', amount: 50, kind: 'fixed', description: 'Salary', date: Date.now() }
    await add('transactions', tx)
    let all = await getAll('transactions')
    expect(all.some(a => a.id === 't2')).toBe(true)
    await remove('transactions', 't2')
    all = await getAll('transactions')
    expect(all.some(a => a.id === 't2')).toBe(false)
  })

  it('handles multiple concurrent adds without corruption', async () => {
    const items = Array.from({ length: 10 }).map((_, i) => ({ id: 'x' + i, user_id: 'u1', amount: i % 2 === 0 ? 10 : -5, kind: 'fixed', date: Date.now() }))
    await Promise.all(items.map(it => add('transactions', it)))
    const all = await getAll('transactions')
    // at least the 10 items should be present
    expect(all.length).toBeGreaterThanOrEqual(10)
    const ids = new Set(all.map(a => a.id))
    for (const it of items) expect(ids.has(it.id)).toBe(true)
  })
})
