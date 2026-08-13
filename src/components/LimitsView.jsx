import React, { useEffect, useState } from 'react'
import { getAll, add, remove } from '../idb'
import { sumForPeriod } from '../utils/limits'

function ProgressBar({value, max}){
  const pct = Math.min(100, Math.round((Math.abs(value)/Math.abs(max||1))*100))
  const warn = Math.abs(value) > Math.abs(max)
  return (
    <div style={{border:'1px solid #eee',borderRadius:6,overflow:'hidden',height:18,width:240}}>
      <div style={{width: pct+'%',height:'100%',background: warn? '#e53935' : '#2e7d32'}} />
    </div>
  )
}

export default function LimitsView({user}){
  const [limits, setLimits] = useState([])
  const [transactions, setTransactions] = useState([])
  const [form, setForm] = useState({ id:'', amount:100, period:'monthly', category:'', threshold_percent:5, mode: 'alert' })
  const [quick, setQuick] = useState({ daily:'', weekly:'', biweekly:'', monthly:'' })

  useEffect(()=>{ load() },[])
  async function load(){
    const l = await getAll('limits')
    const filtered = l.filter(x=> !x.user_id || x.user_id===user.id)
    setLimits(filtered)
    // populate quick fields from existing global limits (category empty)
    const byPeriod = {}
    for(const p of ['daily','weekly','biweekly','monthly']){
      const found = filtered.find(x=> x.period===p && (!x.category || x.category===''))
      byPeriod[p] = found ? String(Number(found.amount)) : ''
    }
    setQuick(byPeriod)

    const txs = await getAll('transactions')
    setTransactions(txs.filter(t=> t.user_id===user.id))
  }

  async function save(){
    const lim = { ...form }
    if(!lim.id) lim.id = 'lim-' + Math.random().toString(36).slice(2,9)
    lim.user_id = user.id
    await add('limits', lim)
    await load()
    setForm({ id:'', amount:100, period:'monthly', category:'', threshold_percent:5 })
  }

  async function del(id){
    if(!window.confirm('Eliminar límite? Esta acción no se puede deshacer.')) return
    await remove('limits', id)
    await load()
  }

  // save quick global limits for all periods at once
  async function saveQuick(){
    const pairs = Object.entries(quick)
    for(const [period, val] of pairs){
      const num = Number(val || 0)
      if(isNaN(num) || num <= 0) continue
      // find existing global limit for this period
      const existing = limits.find(x=> x.period === period && (!x.category || x.category==='') && x.user_id === user.id)
      const record = existing ? { ...existing, amount: num } : { id: 'lim-' + Math.random().toString(36).slice(2,9), period, amount: num, category: '', threshold_percent:5, user_id: user.id }
      await add('limits', record)
    }
    await load()
    alert('Límites guardados')
  }

  async function suggestFromCurrent(){
    const periods = ['daily','weekly','biweekly','monthly']
    const next = {}
    for(const p of periods){
      const { total } = sumForPeriod(transactions, p, { user_id: user.id })
      next[p] = total ? String(Number(total.toFixed(2))) : ''
    }
    setQuick(next)
    alert('Sugerencias cargadas desde gastos actuales')
  }

  return (
    <div>
      <h3>Límites</h3>
      <div style={{display:'flex',gap:16}}>
        <div style={{flex:'0 0 360px',border:'1px solid #eee',padding:12,borderRadius:8}}>
          <h4>Crear / editar límite</h4>
          <div>
            <label>Monto</label>
            <input value={form.amount} onChange={e=> setForm(f=> ({...f, amount: Number(e.target.value)}))} />
          </div>
          <div>
            <label>Periodo</label>
            <select value={form.period} onChange={e=> setForm(f=> ({...f, period: e.target.value}))}>
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
          <div>
            <label>Categoria (opcional)</label>
            <input value={form.category} onChange={e=> setForm(f=> ({...f, category: e.target.value}))} />
          </div>
          <div>
            <label>Modo</label>
            <select value={form.mode} onChange={e=> setForm(f=> ({...f, mode: e.target.value}))}>
              <option value="alert">Avisar</option>
              <option value="warn">Advertir (permitir con confirmación)</option>
              <option value="block">Bloquear</option>
            </select>
          </div>
          <div>
            <label>Umbral (% sobre límite para alertar)</label>
            <input type="number" value={form.threshold_percent} onChange={e=> setForm(f=> ({...f, threshold_percent: Number(e.target.value)}))} />
          </div>
          <div style={{marginTop:8}}>
            <button className="primary" onClick={save}>Guardar</button>
          </div>

          <div style={{marginTop:16,borderTop:'1px dashed #eee',paddingTop:12}}>
            <h4>Límites rápidos (globales)</h4>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div>
                <label>Diario</label>
                <input value={quick.daily} onChange={e=> setQuick(q=> ({...q, daily: e.target.value}))} placeholder="0" />
              </div>
              <div>
                <label>Semanal</label>
                <input value={quick.weekly} onChange={e=> setQuick(q=> ({...q, weekly: e.target.value}))} placeholder="0" />
              </div>
              <div>
                <label>Quincenal</label>
                <input value={quick.biweekly} onChange={e=> setQuick(q=> ({...q, biweekly: e.target.value}))} placeholder="0" />
              </div>
              <div>
                <label>Mensual</label>
                <input value={quick.monthly} onChange={e=> setQuick(q=> ({...q, monthly: e.target.value}))} placeholder="0" />
              </div>
            </div>
            <div style={{marginTop:8, display:'flex', gap:8}}>
              <button className="primary" onClick={saveQuick}>Guardar límites rápidos</button>
              <button className="nav-btn" onClick={suggestFromCurrent}>Sugerir desde gasto actual</button>
            </div>
          </div>
        </div>

        <div style={{flex:1,border:'1px solid #eee',padding:12,borderRadius:8}}>
          <h4>Límites existentes</h4>
          {limits.length===0 && <div>No hay límites configurados.</div>}
          {limits.map(l=>{
            const { total } = sumForPeriod(transactions, l.period, { category: l.category || null, user_id: user.id })
            return (
              <div key={l.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:8,borderBottom:'1px solid #f2f2f2'}}>
                <div>
                      <div><strong>{l.category || 'Todos'}</strong> • {l.period} • ${Number(l.amount).toFixed(2)} • <em style={{fontSize:12}}>{l.mode || 'alert'}</em></div>
                  <div style={{marginTop:6,display:'flex',alignItems:'center',gap:8}}>
                    <ProgressBar value={total} max={l.amount} />
                    <div style={{fontSize:12}}>${Number(total).toFixed(2)} / ${Number(l.amount).toFixed(2)}</div>
                  </div>
                </div>
                <div>
                  <button className="ghost" onClick={()=> del(l.id)}>Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
