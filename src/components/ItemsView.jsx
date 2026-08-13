import React, { useEffect, useState } from 'react'
import { getAll, add, getById } from '../idb'

export default function ItemsView({onContribute, user}){
  const [items,setItems]=useState([])
  const [name,setName]=useState('')
  const [price,setPrice]=useState('')
  const [contrib,setContrib]=useState({})

  useEffect(()=>{ load() },[])

  async function load(){
    const it = await getAll('items')
    if(user) setItems(it.filter(x=> x.user_id === user.id))
    else setItems(it)
  }

  async function create(e){
    e.preventDefault()
    const item = { id: crypto.randomUUID(), user_id: user?.id || 'local', name, price: parseFloat(price), saved_amount:0, contributions: [], created_at: new Date().toISOString() }
    await add('items', item)
    setName(''); setPrice('')
    await load()
  }

  async function contribute(e, item){
    e.preventDefault()
    const amount = parseFloat(contrib[item.id])
    if(!amount || amount<=0) return
    // create a transaction representing the contribution (as positive saved amount)
    const tx = { id: crypto.randomUUID(), user_id: user?.id || item.user_id || 'local', amount: amount, kind: 'fixed', category: 'contribution', date: new Date().toISOString(), item_id: item.id }
    if(onContribute) await onContribute(tx)
    // update item saved_amount and contributions
    const existing = await getById('items', item.id)
    existing.saved_amount = (existing.saved_amount || 0) + amount
    existing.contributions = existing.contributions || []
    existing.contributions.push({ tx_id: tx.id, amount, date: tx.date })
    await add('items', existing)
    setContrib(prev=>({ ...prev, [item.id]: '' }))
    await load()
  }

  return (
    <div style={{padding:12,borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,0.03)'}}>
      <h4 style={{color:'var(--text)'}}>Crear artículo deseado</h4>
      <form onSubmit={create} style={{display:'flex',gap:8,alignItems:'center'}}>
        <input placeholder="Nombre del artículo" value={name} onChange={e=>setName(e.target.value)} required />
        <input placeholder="Precio" value={price} onChange={e=>setPrice(e.target.value)} required />
        <button type="submit" className="primary">Crear</button>
      </form>

      <div style={{marginTop:12}}>
        <h4 style={{color:'var(--text)'}}>Artículos</h4>
        {items.length===0 && <div style={{color:'var(--muted)'}}>No hay artículos</div>}
        <ul>
          {items.map(item=> (
            <li key={item.id} style={{marginBottom:8}}>
              <div><strong>{item.name}</strong> — Precio ${item.price} — Guardado ${item.saved_amount || 0}</div>
              <form onSubmit={(e)=>contribute(e,item)} style={{display:'flex',gap:8,marginTop:6,alignItems:'center'}}>
                <input placeholder="Aportar" value={contrib[item.id] || ''} onChange={e=>setContrib(prev=>({...prev,[item.id]:e.target.value}))} />
                <button type="submit" className="primary">Aportar</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
