import { describe, it, expect } from 'vitest'
import { parseFile, normalizeRowToTx, validateRow, bulkNormalize } from '../importer'
import { describe, it, expect } from 'vitest'

// Tests for importer functions

describe('importer', () => {
  it('parses CSV text correctly via parseFile', async () => {
    const csv = 'id,amount,kind,date\n1,10,fixed,2026-08-01T00:00:00Z\n2,-5,unexpected,2026-08-02T00:00:00Z\n'
    const file = new File([csv], 'test.csv', { type: 'text/csv' })
    const rows = await parseFile(file)
    expect(rows.length).toBe(2)
    expect(rows[0].id).toBe('1')
    expect(rows[1].amount).toBe('-5' || '-5')
  })

  it('normalizes row to transaction and validates', () => {
    const row = { id: 'x1', amount: '$1,234.56', kind: 'Fijo', date: '2026-08-01' }
    const mapping = { id: 'id', amount: 'amount', kind: 'kind', date: 'date' }
    const tx = normalizeRowToTx(row, mapping, { user_id: 'u1' })
    expect(tx.id).toMatch(/imp-|x1/)
    expect(typeof tx.amount).toBe('number')
    expect(tx.kind).toBe('fixed')
    expect(tx.user_id).toBe('u1')
    const res = validateRow(row, mapping)
    expect(res.errors.length).toBe(0)
  })

  it('bulkNormalize returns normalized array', () => {
    const rows = [ { amount: '10' }, { amount: '-5' } ]
    const mapping = { amount: 'amount' }
    const out = bulkNormalize(rows, mapping, { user_id: 'u1' })
    expect(out.length).toBe(2)
    expect(out[0].amount).toBe(10)
    expect(out[1].amount).toBe(-5)
  })
})
