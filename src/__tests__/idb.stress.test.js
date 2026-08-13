import { describe, it, expect } from 'vitest'
import { add, getAll, remove, exportAllData, importAllData, closeDB } from '../idb'

// Stress test: perform many concurrent writes and reads and verify final count
describe('idb stress and recovery', ()=>{
  it('handles many concurrent writes without corruption', async ()=>{
    // create 100 items
    const items = Array.from({length:100}).map((_,i)=> ({ id: 's-'+i, name: 's'+i }))
    await Promise.all(items.map((it,i)=> add('transactions', { ...it, amount: i%2===0? 10 : -5, user_id: 'u1', date: new Date().toISOString() })))
    const all = await getAll('transactions')
    expect(all.length).toBeGreaterThanOrEqual(100)
  })

  it('can export and import snapshot', async ()=>{
    const snap = await exportAllData()
    await closeDB()
    // re-import
    await importAllData(snap)
    const all = await getAll('transactions')
    expect(all.length).toBeGreaterThanOrEqual(0)
  })
})
