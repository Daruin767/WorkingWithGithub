import React, { useState } from 'react'
import TransactionList from './TransactionList'
import TransactionForm from './TransactionForm'
import ImportPanel from './ImportPanel'

export default function ExpensesView({transactions, onRefresh, onAdd, onDelete, user}){
  const [showImport,setShowImport]=useState(false)

  const [filter,setFilter]=useState('all') // all | fixed | unexpected
  const [showForm,setShowForm]=useState(false)

  const filtered = transactions.filter(t=> {
    if(filter==='all') return true
    if(filter==='fixed') return t.kind==='fixed'
    if(filter==='unexpected') return t.kind==='unexpected'
    return true
  }).slice().sort((a,b)=> new Date(b.date)-new Date(a.date))

  const fixed = transactions.filter(t=>t.kind==='fixed')
  const unexpected = transactions.filter(t=>t.kind==='unexpected')

  const [editingTx, setEditingTx] = useState(null)

    const handleAdd = async (tx)=>{
      if(onAdd) await onAdd(tx)
      setShowForm(false)
      setEditingTx(null)
      if(onRefresh) onRefresh()
    }

    const handleEdit = (t)=>{
      setEditingTx(t)
      setShowForm(true)
    }

    const handleDelete = async (id)=>{
      if(onDelete) await onDelete(id)
      if(onRefresh) onRefresh()
    }

  return (
    <div>
      <h3>Gastos</h3>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <label>Mostrar:</label>
        <select value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">Todos</option>
          <option value="fixed">Fijos</option>
          <option value="unexpected">Imprevistos</option>
        </select>
        <div style={{marginLeft:12}}><strong>Totales:</strong> Fijos ${fixed.reduce((s,t)=> s + (t.amount<0? Math.abs(t.amount): t.amount),0).toFixed(2)} — Imprevistos ${unexpected.reduce((s,t)=> s + (t.amount<0? Math.abs(t.amount): t.amount),0).toFixed(2)}</div>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button className="primary" onClick={()=>setShowForm(s=>!s)}>{showForm? 'Cerrar' : 'Añadir transacción'}</button>
          <button className="nav-btn" onClick={()=>setShowImport(s=>!s)}>{showImport? 'Cerrar import' : 'Importar'}</button>
        </div>
      </div>

      {showForm && (
        <div style={{marginTop:12}}>
          <TransactionForm user={user} onAdd={handleAdd} tx={editingTx} />
        </div>
      )}

      {showImport && (
        <div style={{marginTop:12}}>
          <ImportPanel user={user} onDone={()=> setShowImport(false)} onImported={()=> { if(onRefresh) onRefresh() }} />
        </div>
      )}

      <div style={{marginTop:12}}>
        <TransactionList transactions={filtered} onEdit={handleEdit} onDelete={handleDelete} />
      </div>
    </div>
  )
}
