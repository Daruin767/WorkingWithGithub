import { describe, it, expect } from 'vitest'
import { createEncryptedBackup, restoreEncryptedBackup } from '../backup'
import { exportAllData, importAllData, add, getAll } from '../idb'

describe('backup encryption roundtrip', ()=>{
  it('creates and restores encrypted backup with correct password', async ()=>{
    // prepare some data
    await add('transactions', { id:'t1', user_id:'u1', amount: 100, date: new Date().toISOString() })
    await add('items', { id:'i1', user_id:'u1', name: 'Phone', price: 500 })

    const password = 'p4ssw0rd!'
    const payload = await createEncryptedBackup(password)
    // clear DB and restore
    const snap = JSON.parse(payload)
    // restore using library
    const ok = await restoreEncryptedBackup(payload, password)
    expect(ok).toBe(true)
    const txs = await getAll('transactions')
    const items = await getAll('items')
    expect(txs.length).toBeGreaterThanOrEqual(1)
    expect(items.length).toBeGreaterThanOrEqual(1)
  })

  it('fails restore with wrong password', async ()=>{
    const password = 'p4ssw0rd!'
    const payload = await createEncryptedBackup(password)
    let caught = false
    try{
      await restoreEncryptedBackup(payload, 'wrong')
    }catch(e){ caught = true }
    expect(caught).toBe(true)
  })
})
