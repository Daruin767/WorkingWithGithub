// Lazy-load XLSX only when needed. Provide simple CSV fallback parser to avoid bundler errors when xlsx is not installed.

function parseCSV(text){
  const rows = []
  let cur = ''
  let row = []
  let inQuotes = false
  for(let i=0;i<text.length;i++){
    const ch = text[i]
    if(ch === '"'){
      if(inQuotes && text[i+1] === '"'){
        cur += '"'
        i++
      }else{
        inQuotes = !inQuotes
      }
      continue
    }
    if(ch === ',' && !inQuotes){
      row.push(cur)
      cur = ''
      continue
    }
    if((ch === '\n' || ch === '\r') && !inQuotes){
      if(cur !== '' || row.length>0){
        row.push(cur)
        rows.push(row)
        row = []
        cur = ''
      }
      // skip consecutive newlines
      while(text[i+1] === '\n' || text[i+1] === '\r') i++
      continue
    }
    cur += ch
  }
  if(cur !== '' || row.length>0){ row.push(cur); rows.push(row) }
  // convert to array of objects using header row
  if(rows.length === 0) return []
  const headers = rows[0].map(h=> String(h).trim())
  const out = []
  for(let r=1;r<rows.length;r++){
    const obj = {}
    const cols = rows[r]
    for(let c=0;c<headers.length;c++) obj[headers[c]] = cols[c] !== undefined ? cols[c] : ''
    out.push(obj)
  }
  return out
}

export async function parseFile(file){
  const name = (file && file.name) ? file.name.toLowerCase() : ''
  if(name.endsWith('.json')){
    const txt = await file.text()
    try{
      const parsed = JSON.parse(txt)
      if(Array.isArray(parsed)) return parsed
      if(parsed.transactions && Array.isArray(parsed.transactions)) return parsed.transactions
      return []
    }catch(e){
      return []
    }
  }

  if(name.endsWith('.csv')){
    const txt = await file.text()
    return parseCSV(txt)
  }

  // try xlsx for .xls/.xlsx files.
  if(name.endsWith('.xls') || name.endsWith('.xlsx')){
    try{
      const mod = await import('xlsx')
      const XLSX = mod.default || mod
      const ab = await file.arrayBuffer()
      const wb = XLSX.read(ab, { type: 'array' })
      const sheetName = wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
      return json
    }catch(e){
      console.warn('xlsx parse failed or xlsx not installed; please install xlsx or provide CSV/JSON file', e)
      return []
    }
  }

  // default: try to parse as CSV text
  try{
    const txt = await file.text()
    return parseCSV(txt)
  }catch(e){
    return []
  }
}

// Normalize a parsed row into the transaction shape and validate
export function normalizeRowToTx(row, mapping, defaults={user_id:'u1'}){
  const tx = {}
  for(const key of Object.keys(mapping)){
    const col = mapping[key]
    if(!col) continue
    tx[key] = row[col]
  }
  if(!tx.id) tx.id = 'imp-' + Math.random().toString(36).slice(2,9)
  // coerce amount
  if(tx.amount !== undefined && tx.amount !== null && tx.amount !== ''){
    const n = Number(String(tx.amount).replace(/[^0-9.-]/g, ''))
    tx.amount = isFinite(n) ? n : NaN
  }else{
    tx.amount = NaN
  }
  // kind normalization
  if(!tx.kind) tx.kind = 'unexpected'
  else {
    const k = String(tx.kind).toLowerCase()
    if(['fixed','fijo','fijos'].includes(k)) tx.kind = 'fixed'
    else if(['unexpected','imprevisto','imprevistos','variante','variable'].includes(k)) tx.kind = 'unexpected'
    else tx.kind = k
  }
  // date normalization
  if(!tx.date) tx.date = new Date().toISOString()
  else {
    const d = new Date(tx.date)
    tx.date = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
  }
  if(!tx.user_id) tx.user_id = defaults.user_id
  return tx
}

export function validateRow(row, mapping){
  const tx = normalizeRowToTx(row, mapping)
  const errors = []
  if(!tx.id) errors.push('missing id')
  if(!isFinite(tx.amount)) errors.push('amount not numeric')
  try{ new Date(tx.date); }catch(e){ errors.push('invalid date') }
  return { tx, errors }
}

export function bulkNormalize(rows, mapping, defaults){
  return rows.map(r => normalizeRowToTx(r, mapping, defaults))
}
