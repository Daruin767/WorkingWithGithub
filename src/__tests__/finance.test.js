import { describe, it, expect } from 'vitest'
import { totalSaved, totalSpent, totalsByKind } from '../utils/finance'

const sample = [
  { id: 'a', amount: 100, kind: 'income' },
  { id: 'b', amount: -20, kind: 'fixed' },
  { id: 'c', amount: -30, kind: 'unexpected' },
  { id: 'd', amount: 50, kind: 'income' }
]

describe('finance utils', ()=>{
  it('computes totalSaved correctly', ()=>{
    expect(totalSaved(sample)).toBe(150)
  })

  it('computes totalSpent correctly', ()=>{
    expect(totalSpent(sample)).toBe(50)
  })

  it('computes totals by kind', ()=>{
    const byKind = totalsByKind(sample)
    expect(byKind['income']).toBe(150)
    expect(byKind['fixed']).toBe(20)
    expect(byKind['unexpected']).toBe(30)
  })
})
