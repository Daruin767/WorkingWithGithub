import { getAll } from './idb'
import { getCurrentUser } from './auth'

function downloadBlob(filename, blob){
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function normalizeTx(t){
  // ensure consistent ordering and types
  return {
    id: t.id || '',
    date: t.date || t.created_at || '',
    amount: Number(t.amount || 0),
    kind: t.kind || '',
    category: t.category || '',
    goal_id: t.goal_id || '',
    item_id: t.item_id || '',
    created_at: t.created_at || ''
  }
}

export async function exportJSON(){
  const user = await getCurrentUser()
  const raw = await getAll('transactions')
  const filtered = user ? (raw || []).filter(t=> t.user_id === user.id) : (raw || [])
  const data = filtered.map(normalizeTx)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob('transactions.json', blob)
}

export async function exportCSV(){
  const user = await getCurrentUser()
  const raw = await getAll('transactions')
  const filtered = user ? (raw || []).filter(t=> t.user_id === user.id) : (raw || [])
  const data = filtered.map(normalizeTx)
  if(!data || data.length===0) return
  const keys = ['id','date','amount','kind','category','goal_id','item_id','created_at']
  const rows = [keys.join(',')]
  for(const row of data){
    rows.push(keys.map(k=> JSON.stringify(row[k] ?? '')).join(','))
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  downloadBlob('transactions.csv', blob)
}

export async function exportXLSX(){
  const user = await getCurrentUser()
  const raw = await getAll('transactions')
  const filtered = user ? (raw || []).filter(t=> t.user_id === user.id) : (raw || [])
  const data = filtered.map(normalizeTx)
  try{
    const mod = await import('xlsx')
    const XLSX = mod.default || mod
    // For XLSX, convert date strings to Date objects so excel types as date
    const xdata = data.map(d => ({ ...d, date: d.date ? new Date(d.date) : null, created_at: d.created_at ? new Date(d.created_at) : null }))
    const headers = ['id','date','amount','kind','category','goal_id','item_id','created_at']
    const ws = XLSX.utils.json_to_sheet(xdata, { header: headers })
    // set column widths for readability
    ws['!cols'] = [{wpx:120},{wpx:100},{wpx:80},{wpx:80},{wpx:120},{wpx:100},{wpx:100},{wpx:140}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    downloadBlob('transactions.xlsx', blob)
  }catch(e){
    console.warn('xlsx not installed; install xlsx or use CSV/JSON export', e)
    // fallback to CSV
    await exportCSV()
  }
}
