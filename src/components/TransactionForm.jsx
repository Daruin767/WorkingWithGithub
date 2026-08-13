import React, { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getAll, getById } from '../idb'
import { sumForPeriod } from '../utils/limits'

export default function TransactionForm({user,onAdd, tx}){
  const [amount,setAmount]=useState('')
  const [kind,setKind]=useState('fixed')
  const [category,setCategory]=useState('')

  useEffect(()=>{
    if(tx){
      setAmount(String(tx.amount))
      setKind(tx.kind || 'fixed')
      setCategory(tx.category || '')
    }
  },[tx])

  const submit = async (e)=>{
    e.preventDefault()
    const id = tx?.id || uuidv4()
    const newAmount = parseFloat(amount)
    const transaction = {
      id,
      user_id: user.id,
      amount: newAmount,
      kind,
      category,
      date: tx?.date || new Date().toISOString(),
      created_at: tx?.created_at || new Date().toISOString()
    }

    // enforcement: only for spending (negative amounts)
    try{
      if(newAmount < 0){
        const limits = await getAll('limits')
        const userRec = await getById('users', user.id)
        const userMode = (userRec && userRec.settings && userRec.settings.limit_mode) || 'alert'
        const applicable = (limits || []).filter(l=> (!l.user_id || l.user_id === user.id) && (!l.category || l.category === '' || l.category === category))
        for(const l of applicable){
          const { total } = sumForPeriod(await getAll('transactions'), l.period, { category: l.category || null, user_id: user.id })
          const currentTotal = Number(total || 0)
          const newTotalAbs = Math.abs(currentTotal + newAmount)
          const limitAmount = Number(l.amount || 0)
          const effectiveMode = l.mode || userMode || 'alert'
          if(limitAmount > 0 && newTotalAbs > limitAmount){
            if(effectiveMode === 'block'){
              alert(`Transacción bloqueada: excede límite ${l.period} (${l.category||'Todos'}) de ${limitAmount}`)
              return
            }
            if(effectiveMode === 'warn'){
              const ok = window.confirm(`Advertencia: esta transacción hará que supere el límite ${l.period} (${l.category||'Todos'}) de ${limitAmount}. Continuar?`)
              if(!ok) return
            }
            // if 'alert', allow but checkLimits will create alert
          }
        }
      }
    }catch(e){ console.error('limit check failed', e) }

    await onAdd(transaction)
    setAmount(''); setCategory('')
  }

  return (
    <form onSubmit={submit} style={{display:'grid',gridTemplateColumns:'1fr 120px 120px 120px',gap:12,alignItems:'center'}}>
      <input placeholder="Monto" value={amount} onChange={e=>setAmount(e.target.value)} required />
      <select value={kind} onChange={e=>setKind(e.target.value)}>
        <option value="fixed">Fijo</option>
        <option value="unexpected">Imprevisto</option>
      </select>
      <input placeholder="Categoría" value={category} onChange={e=>setCategory(e.target.value)} />
      <button type="submit" className="primary">{tx ? 'Guardar' : 'Añadir'}</button>
    </form>
  )
}
