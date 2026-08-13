import { describe, it, expect, beforeEach } from 'vitest'
import { add, getAll, exportAllData, importAllData, closeDB } from '../idb'

function randDelay(max=30){ return new Promise(r=> setTimeout(r, Math.random()*max)) }

describe('idb offline stress & recovery', () => {
  beforeEach(async ()=>{
    try{ await closeDB() }catch(e){}
    // start clean
    await importAllData({ transactions: [] })
  })

  it('survives random closes during concurrent writes', async () => {
    const items = Array.from({ length: 100 }).map((_, i) => ({ id: 's-' + i, user_id: 'u1', amount: i % 2 === 0 ? 10 : -5, kind: 'fixed', date: Date.now() }))
    const runners = items.map(async (it)=>{
      await randDelay()
      await add('transactions', it)
      // occasionally simulate abrupt close
      if(Math.random() < 0.03){
        await closeDB()
        // short pause to simulate downtime
        await randDelay(20)
      }
    })
    await Promise.all(runners)
    // reopen and check
    const all = await getAll('transactions')
    expect(all.length).toBeGreaterThanOrEqual(100)
    const ids = new Set(all.map(a=>a.id))
    for(const it of items) expect(ids.has(it.id)).toBe(true)
  }, 20000)

  it('can export snapshot, close, import and restore data intact', async () => {
    const sample = [
      { id: 'r1', user_id: 'u1', amount: 100, kind: 'fixed', date: Date.now() },
      { id: 'r2', user_id: 'u1', amount: -30, kind: 'unexpected', date: Date.now() }
    ]
    for(const s of sample) await add('transactions', s)
    const snap = await exportAllData()
    await closeDB()
    // import into a fresh DB
    await importAllData(snap)
    const all = await getAll('transactions')
    expect(all.length).toBeGreaterThanOrEqual(2)
    const ids = new Set(all.map(a=>a.id))
    for(const s of sample) expect(ids.has(s.id)).toBe(true)
  })
})
