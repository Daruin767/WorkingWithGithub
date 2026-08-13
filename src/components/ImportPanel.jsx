import React, { useState, useMemo } from 'react'
import { parseFile, normalizeRowToTx, validateRow } from '../importer'
import { add, importAllData } from '../idb'

const PRESETS_KEY = 'sdd:import_presets'

export default function ImportPanel({ user, onDone, onImported }){
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState([])
  const [editedRows, setEditedRows] = useState(null)
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({ id:'', amount:'', kind:'', description:'', date:'' })
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState('merge') // merge | overwrite
  const [importing, setImporting] = useState(false)
  const [selectedRows, setSelectedRows] = useState({})
  const [presets, setPresets] = useState(() => {
    try{ return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]') }catch(e){ return [] }
  })
  const [presetName, setPresetName] = useState('')
  const [editingIndex, setEditingIndex] = useState(-1)

  async function handleFile(f){
    setFile(f)
    setStatus('Parsing...')
    const parsed = await parseFile(f)
    setRows(parsed || [])
    setEditedRows(null)
    const h = parsed && parsed.length>0 ? Object.keys(parsed[0]) : []
    setHeaders(h)
    // auto-suggest mapping by common names
    const suggest = {}
    for(const key of Object.keys(mapping)){
      const candidates = {
        id: ['id','ID','Id','identifier'],
        amount: ['amount','Amount','AMOUNT','monto','Monto','value','Value'],
        kind: ['kind','Kind','type','Type','categoria','category'],
        description: ['description','Description','desc','Desc','detalle','note'],
        date: ['date','Date','fecha','Fecha','created_at']
      }[key]
      const found = h.find(col => candidates.includes(col) || candidates.includes(col.toLowerCase()))
      suggest[key] = found || ''
    }
    setMapping(suggest)
    setStatus('Parsed ' + (parsed? parsed.length : 0) + ' rows')
  }

  function getPreviewRows(){
    const src = editedRows || rows
    if(!src) return []
    return src.slice(0,20)
  }

  function toggleSelectAll(){
    const src = editedRows || rows || []
    const next = {}
    if(Object.keys(selectedRows).length === src.length){
      // all selected -> deselect all
      setSelectedRows({})
      return
    }
    for(let i=0;i<src.length;i++) next[i]=true
    setSelectedRows(next)
  }

  function toggleRowSelect(idx){
    const cur = { ...(selectedRows || {}) }
    if(cur[idx]) delete cur[idx]
    else cur[idx] = true
    setSelectedRows(cur)
  }

  function deleteSelectedRows(){
    const src = editedRows ? [...editedRows] : rows ? rows.map(r=> ({...r})) : []
    const keep = src.filter((r,i)=> !selectedRows[i])
    setEditedRows(keep)
    setRows(keep)
    setSelectedRows({})
    setStatus('Filas seleccionadas eliminadas')
  }

  function deleteRow(idx){
    const src = editedRows ? [...editedRows] : rows ? rows.map(r=> ({...r})) : []
    src.splice(idx,1)
    setEditedRows(src)
    setRows(src)
    const cur = { ...(selectedRows||{}) }
    if(cur[idx]) delete cur[idx]
    setSelectedRows(cur)
    setStatus(`Fila ${idx+1} eliminada`)
  }

  function deleteInvalidRows(){
    const src = editedRows ? [...editedRows] : rows ? rows.map(r=> ({...r})) : []
    const kept = []
    for(let i=0;i<src.length;i++){
      const r = src[i]
      const { errors } = validateRow(r, mapping)
      if(!errors || errors.length===0) kept.push(r)
    }
    setEditedRows(kept)
    setRows(kept)
    setSelectedRows({})
    setStatus('Filas inválidas eliminadas')
  }

  function startEditRow(idx){
    const copy = editedRows ? [...editedRows] : rows.map(r=> ({...r}))
    setEditedRows(copy)
    setEditingIndex(idx)
  }
  function cancelEditRow(){ setEditingIndex(-1) }
  function saveRowEdits(idx){ setEditingIndex(-1) }
  function updateEditedCell(idx, col, val){
    const copy = [...(editedRows || rows.map(r=> ({...r})))]
    copy[idx] = { ...copy[idx], [col]: val }
    setEditedRows(copy)
  }

  const analyzed = useMemo(()=>{
    const src = editedRows || rows
    if(!src || src.length===0) return { total:0, valid:0, invalid:0, preview:[], invalidRows:[] }
    const preview = []
    let valid = 0, invalid = 0
    const invalidRows = []
    for(let i=0;i<src.length;i++){
      const r = src[i]
      const { tx, errors } = validateRow(r, mapping)
      const entry = { index:i, raw:r, tx, errors }
      preview.push(entry)
      if(errors.length===0) valid++
      else { invalid++; invalidRows.push(entry) }
      if(preview.length>=20 && i>1000) break
    }
    return { total: src.length, valid, invalid, preview: preview.slice(0,20), invalidRows: invalidRows.slice(0,10) }
  }, [rows, editedRows, mapping])

  async function doImport(){
    const src = editedRows || rows
    if(!src || src.length===0) return
    if(importing) return
    if(mode==='overwrite'){
      const ok = window.confirm('Modo Overwrite: se reemplazará completamente la tabla de transacciones. Continuar?')
      if(!ok) return
    }
    setImporting(true)
    setStatus('Importing...')

    const normalized = src.map(r => normalizeRowToTx(r, mapping, { user_id: user.id }))
    try{
      if(mode === 'overwrite'){
        // overwrite: importAllData with transactions only
        await importAllData({ transactions: normalized })
        setStatus(`Overwrite import: ${normalized.length} rows`) 
      }else{
        // merge: put each valid tx
        let imported = 0
        for(const tx of normalized){
          if(!isFinite(tx.amount)) continue
          try{ await add('transactions', tx); imported++ }catch(e){ console.error('import row failed', e) }
        }
        setStatus(`Imported ${imported}/${normalized.length}`)
      }
      if(onImported) onImported()
      if(onDone) onDone()
    }catch(e){
      console.error('import failed', e)
      setStatus('Import failed: ' + String(e))
    }finally{
      setImporting(false)
    }
  }

  function savePreset(name){
    if(!name) return
    const p = { name, mapping }
    const existing = presets.filter(x=> x.name !== name)
    const next = [...existing, p]
    setPresets(next)
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next))
    setPresetName('')
    setStatus('Preset saved')
  }
  function loadPreset(name){
    const p = presets.find(x=> x.name === name)
    if(p) setMapping(p.mapping)
  }
  function deletePreset(name){
    const next = presets.filter(x=> x.name !== name)
    setPresets(next)
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next))
  }

  return (
    <div style={{border:'1px solid #ddd',padding:12,borderRadius:8,marginTop:12}}>
      <h4>Importar transacciones</h4>
      <div>
        <input type="file" accept=".csv,.json,.xlsx,.xls" onChange={e=> handleFile(e.target.files[0])} />
      </div>
      <div style={{marginTop:8}}>
        <div><strong>Estado:</strong> {status}</div>

        <div style={{marginTop:8}}>
          <label style={{marginRight:8}}>Modo:</label>
          <label><input type="radio" name="mode" value="merge" checked={mode==='merge'} onChange={e=> setMode('merge')} /> Merge (insert/put)</label>
          <label style={{marginLeft:12}}><input type="radio" name="mode" value="overwrite" checked={mode==='overwrite'} onChange={e=> setMode('overwrite')} /> Overwrite (replace table)</label>
        </div>

        {headers.length>0 && (
          <div style={{marginTop:8}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div>Mapear columnas:</div>
              <div>
                <select onChange={e=> loadPreset(e.target.value)}>
                  <option value="">-- cargar preset --</option>
                  {presets.map(p=> <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <input placeholder="Nombre preset" value={presetName} onChange={e=> setPresetName(e.target.value)} />
                <button className="nav-btn" onClick={()=> savePreset(presetName)}>Guardar preset</button>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
              {Object.keys(mapping).map(k=> (
                <div key={k}>
                  <label style={{display:'block',fontSize:12}}>{k}</label>
                  <select value={mapping[k]||''} onChange={e=> setMapping(m=> ({...m,[k]: e.target.value}))}>
                    <option value="">-- no asignado --</option>
                    {headers.map(h=> <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {rows && rows.length>0 && (
          <div style={{marginTop:12}}>
            <div>Resumen: {analyzed.total} filas — válidas: {analyzed.valid} — inválidas: {analyzed.invalid}</div>

            {analyzed.invalid>0 && (
              <div style={{marginTop:8,color:'#a33'}}>
                <strong>Primeras filas con errores (máx 10):</strong>
                <ul>
                  {analyzed.invalidRows.map(r=> (
                    <li key={r.index}>Fila {r.index+1}: {r.errors.join(', ')}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>Vista previa (primeras {analyzed.preview.length} filas):</div>
              <div style={{display:'flex',gap:8}}>
                <button className="nav-btn" onClick={toggleSelectAll}> {Object.keys(selectedRows).length === ( (editedRows||rows||[]).length) ? 'Deseleccionar todo' : 'Seleccionar todo'}</button>
                <button className="ghost" onClick={deleteSelectedRows}>Eliminar seleccionadas</button>
                <button className="ghost" onClick={deleteInvalidRows}>Eliminar inválidas</button>
              </div>
            </div>

            <table style={{width:'100%',borderCollapse:'collapse',marginTop:8}}>
              <thead>
                <tr>
                  <th style={{border:'1px solid #eee',padding:6,fontSize:12}}>Sel</th>
                  {headers.map(h=> <th key={h} style={{border:'1px solid #eee',padding:6,fontSize:12}}>{h}</th>)}
                  <th style={{border:'1px solid #eee',padding:6,fontSize:12}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(editedRows || rows).slice(0,20).map((r,idx)=> (
                  <tr key={idx}>
                    <td style={{border:'1px solid #eee',padding:6,fontSize:12,textAlign:'center'}}>
                      <input type="checkbox" checked={!!selectedRows[idx]} onChange={()=> toggleRowSelect(idx)} />
                    </td>
                    {headers.map(h=> <td key={h} style={{border:'1px solid #eee',padding:6,fontSize:12}}>{String(r[h] ?? '')}</td>)}
                    <td style={{border:'1px solid rgba(255,255,255,0.03)',padding:6,fontSize:12}}>
                    <button className="nav-btn" onClick={()=> startEditRow(idx)}>Editar</button>
                    <button className="ghost" onClick={()=> deleteRow(idx)} style={{marginLeft:8}}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{marginTop:8,display:'flex',gap:8}}>
              <button className="primary" onClick={doImport} disabled={importing || analyzed.valid===0}>{importing? 'Importando...' : 'Importar'}</button>
              <button className="nav-btn" onClick={()=>{ setFile(null); setRows([]); setHeaders([]); setMapping({ id:'', amount:'', kind:'', description:'', date:'' }); setStatus('') }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
