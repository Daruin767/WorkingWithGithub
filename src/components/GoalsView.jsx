import React, { useEffect, useState } from 'react'
import { getAll, add } from '../idb'

export default function GoalsView({user}){
  const [goals,setGoals]=useState([])
  const [name,setName]=useState('')
  const [target,setTarget]=useState('')

  useEffect(()=>{ load() },[user])

  async function load(){
    const g = await getAll('goals')
    if(user) setGoals(g.filter(x=> x.user_id === user.id))
    else setGoals(g)
  }

  async function create(e){
    e.preventDefault()
    const goal = { id: crypto.randomUUID(), user_id: user?.id || 'local', name, target_amount: parseFloat(target), period: 'monthly', saved_amount:0, created_at: new Date().toISOString() }
    await add('goals', goal)
    setName(''); setTarget('')
    await load()
  }

  return (
    <div style={{padding:12,borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,0.03)'}}>
      <h4 style={{color:'var(--text)'}}>Crear meta de ahorro</h4>
      <form onSubmit={create} style={{display:'flex',gap:8,alignItems:'center'}}>
        <input placeholder="Nombre de la meta" value={name} onChange={e=>setName(e.target.value)} required />
        <input placeholder="Cantidad objetivo" value={target} onChange={e=>setTarget(e.target.value)} required />
        <button type="submit" className="primary">Crear</button>
      </form>

      <div style={{marginTop:12}}>
        <h4 style={{color:'var(--text)'}}>Metas existentes</h4>
        {goals.length===0 && <div style={{color:'var(--muted)'}}>No hay metas</div>}
        <ul>
          {goals.map(g=> (
            <li key={g.id}>{g.name} — Objetivo ${g.target_amount} — Guardado ${g.saved_amount || 0}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
