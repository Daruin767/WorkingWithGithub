import React, { useEffect, useState } from 'react'
import { getAll, add, remove, getById } from '../idb'

export default function AhorrosView({user}){
  const [goals,setGoals]=useState([])
  const [items,setItems]=useState([])
  const [saved, setSaved] = useState(0)
  const [spent, setSpent] = useState(0)

  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')

  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')

  const [contribGoals, setContribGoals] = useState({})
  const [contribItems, setContribItems] = useState({})

  useEffect(()=>{ load() },[user])

  async function load(){
    const g = await getAll('goals')
    const it = await getAll('items')
    const txs = await getAll('transactions')
    const userGoals = user ? g.filter(x=> x.user_id === user.id) : g
    const userItems = user ? it.filter(x=> x.user_id === user.id) : it
    const userTxs = user ? txs.filter(x=> x.user_id === user.id) : txs
    setGoals(userGoals)
    setItems(userItems)
    const totalSaved = userTxs.reduce((s,t)=> s + (t.amount>0? t.amount : 0),0)
    const totalSpent = userTxs.reduce((s,t)=> s + (t.amount<0? Math.abs(t.amount) : 0),0)
    setSaved(totalSaved)
    setSpent(totalSpent)
  }

  async function createGoal(e){
    e && e.preventDefault()
    if(!goalName || !goalTarget) return
    const goal = { id: crypto.randomUUID(), user_id: user?.id || 'local', name: goalName, target_amount: parseFloat(goalTarget), saved_amount:0, created_at: new Date().toISOString() }
    await add('goals', goal)
    setGoalName(''); setGoalTarget('')
    await load()
  }

  async function deleteGoal(id){
    if(!window.confirm('Eliminar meta y sus aportes? Esta acción no se puede deshacer.')) return
    // remove goal
    await remove('goals', id)
    await load()
  }

  async function createItem(e){
    e && e.preventDefault()
    if(!itemName || !itemPrice) return
    const item = { id: crypto.randomUUID(), user_id: user?.id || 'local', name: itemName, price: parseFloat(itemPrice), saved_amount:0, contributions: [], created_at: new Date().toISOString() }
    await add('items', item)
    setItemName(''); setItemPrice('')
    await load()
  }

  async function deleteItem(id){
    if(!window.confirm('Eliminar artículo y sus aportes? Esta acción no se puede deshacer.')) return
    await remove('items', id)
    await load()
  }

  async function contributeToGoal(e, goal){
    e && e.preventDefault()
    const amount = parseFloat(contribGoals[goal.id])
    if(!amount || amount<=0) return
    const tx = { id: crypto.randomUUID(), user_id: user?.id || goal.user_id || 'local', amount: amount, kind: 'fixed', category: 'contribution', date: new Date().toISOString(), goal_id: goal.id }
    // add transaction
    await add('transactions', tx)
    // update goal
    const existing = await getById('goals', goal.id)
    existing.saved_amount = (existing.saved_amount || 0) + amount
    existing.contributions = existing.contributions || []
    existing.contributions.push({ tx_id: tx.id, amount, date: tx.date })
    await add('goals', existing)
    setContribGoals(prev=>({ ...prev, [goal.id]: '' }))
    await load()
  }

  async function contributeToItem(e, item){
    e && e.preventDefault()
    const amount = parseFloat(contribItems[item.id])
    if(!amount || amount<=0) return
    const tx = { id: crypto.randomUUID(), user_id: user?.id || item.user_id || 'local', amount: amount, kind: 'fixed', category: 'contribution', date: new Date().toISOString(), item_id: item.id }
    await add('transactions', tx)
    const existing = await getById('items', item.id)
    existing.saved_amount = (existing.saved_amount || 0) + amount
    existing.contributions = existing.contributions || []
    existing.contributions.push({ tx_id: tx.id, amount, date: tx.date })
    await add('items', existing)
    setContribItems(prev=>({ ...prev, [item.id]: '' }))
    await load()
  }

  return (
    <div>
      <h3>Ahorros</h3>
      <div style={{display:'flex',gap:12}}>
        <div style={{border:'1px solid #eee',padding:12,borderRadius:8}}>
          <div style={{fontSize:18,fontWeight:700}}>${saved.toFixed(2)}</div>
          <div style={{color:'#666'}}>Total ahorrado</div>
        </div>
        <div style={{border:'1px solid #eee',padding:12,borderRadius:8}}>
          <div style={{fontSize:18,fontWeight:700}}>${spent.toFixed(2)}</div>
          <div style={{color:'#666'}}>Total gastado</div>
        </div>
      </div>

      <section style={{marginTop:16}}>
        <h4>Metas</h4>
        <form onSubmit={createGoal} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
          <input placeholder="Nombre de meta" value={goalName} onChange={e=> setGoalName(e.target.value)} />
          <input placeholder="Objetivo" value={goalTarget} onChange={e=> setGoalTarget(e.target.value)} />
          <button type="submit" className="primary">Crear meta</button>
        </form>
        {goals.length===0 && <div>No hay metas</div>}
        <ul>
          {goals.map(g=> (
            <li key={g.id} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>{g.name} — ${g.saved_amount || 0} / ${g.target_amount}</div>
                <div><button className="ghost" onClick={()=> deleteGoal(g.id)}>Eliminar</button></div>
              </div>
              <form onSubmit={(e)=> contributeToGoal(e,g)} style={{display:'flex',gap:8,marginTop:6,alignItems:'center'}}>
                <input placeholder="Aportar" value={contribGoals[g.id] || ''} onChange={e=> setContribGoals(prev=>({...prev,[g.id]: e.target.value}))} />
                <button type="submit" className="primary">Aportar a meta</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section style={{marginTop:16}}>
        <h4>Artículos</h4>
        <form onSubmit={createItem} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
          <input placeholder="Nombre artículo" value={itemName} onChange={e=> setItemName(e.target.value)} />
          <input placeholder="Precio" value={itemPrice} onChange={e=> setItemPrice(e.target.value)} />
          <button type="submit" className="primary">Crear artículo</button>
        </form>
        {items.length===0 && <div>No hay artículos</div>}
        <ul>
          {items.map(it=> (
            <li key={it.id} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>{it.name} — ${it.saved_amount || 0} / ${it.price}</div>
                <div><button className="ghost" onClick={()=> deleteItem(it.id)}>Eliminar</button></div>
              </div>
              <form onSubmit={(e)=> contributeToItem(e,it)} style={{display:'flex',gap:8,marginTop:6,alignItems:'center'}}>
                <input placeholder="Aportar" value={contribItems[it.id] || ''} onChange={e=> setContribItems(prev=>({...prev,[it.id]: e.target.value}))} />
                <button type="submit" className="primary">Aportar a artículo</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
