import React, { useState } from 'react'
import { getById, add } from '../idb'

export default function OnboardingView({ user, onComplete }){
  const [step, setStep] = useState(1)
  const [currency, setCurrency] = useState(user?.currency || 'USD')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [dailyLimit, setDailyLimit] = useState('')
  const [weeklyLimit, setWeeklyLimit] = useState('')
  const [monthlyLimit, setMonthlyLimit] = useState('')
  const [status, setStatus] = useState('')

  async function saveSettings(){
    setStatus('Guardando...')
    try{
      const urec = await getById('users', user.id)
      const updated = { ...urec, currency, settings: { ...(urec.settings||{}), onboarded: true } }
      await add('users', updated)
      // create initial goal if provided
      if(goalName && goalTarget){
        const g = { id: 'g-' + Math.random().toString(36).slice(2,9), user_id: user.id, name: goalName, target_amount: Number(goalTarget), saved_amount: 0, created_at: new Date().toISOString() }
        await add('goals', g)
      }
      // create quick limits
      const limits = []
      if(dailyLimit) limits.push({ id: 'lim-' + Math.random().toString(36).slice(2,9), user_id: user.id, period: 'daily', amount: Number(dailyLimit), category:'', threshold_percent:5, mode:'alert' })
      if(weeklyLimit) limits.push({ id: 'lim-' + Math.random().toString(36).slice(2,9), user_id: user.id, period: 'weekly', amount: Number(weeklyLimit), category:'', threshold_percent:5, mode:'alert' })
      if(monthlyLimit) limits.push({ id: 'lim-' + Math.random().toString(36).slice(2,9), user_id: user.id, period: 'monthly', amount: Number(monthlyLimit), category:'', threshold_percent:5, mode:'alert' })
      for(const L of limits) await add('limits', L)

      // optional: store an initial income transaction as positive amount
      if(monthlyIncome){
        const tx = { id: 'tx-' + Math.random().toString(36).slice(2,9), user_id: user.id, amount: Number(monthlyIncome), kind: 'fixed', category: 'income', date: new Date().toISOString(), created_at: new Date().toISOString() }
        await add('transactions', tx)
      }

      setStatus('Listo — configuración guardada')
      if(onComplete) onComplete()
    }catch(e){
      console.error('onboard save failed', e)
      setStatus('Error guardando: ' + String(e))
    }
  }

  return (
    <div style={{border:'1px solid #eee',padding:12,borderRadius:8}}>
      <h3>Onboarding — configuración inicial</h3>
      <div style={{marginBottom:12}}>Paso {step} de 3</div>

      {step === 1 && (
        <div>
          <div>
            <label>Moneda</label>
            <select value={currency} onChange={e=> setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MXN">MXN</option>
              <option value="PEN">PEN</option>
            </select>
          </div>
          <div style={{marginTop:8}}>
            <label>Ingreso mensual aproximado</label>
            <input value={monthlyIncome} onChange={e=> setMonthlyIncome(e.target.value)} placeholder="0" />
          </div>
          <div style={{marginTop:12}}>
            <button onClick={()=> setStep(2)}>Siguiente</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div>
            <label>Crear una meta inicial (opcional)</label>
            <input placeholder="Nombre de la meta" value={goalName} onChange={e=> setGoalName(e.target.value)} />
            <input placeholder="Objetivo" value={goalTarget} onChange={e=> setGoalTarget(e.target.value)} />
          </div>
          <div style={{marginTop:12}}>
            <button onClick={()=> setStep(1)}>Atrás</button>
            <button onClick={()=> setStep(3)} style={{marginLeft:8}}>Siguiente</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div>
            <label>Límites rápidos (opcional)</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <input placeholder="Diario" value={dailyLimit} onChange={e=> setDailyLimit(e.target.value)} />
              <input placeholder="Semanal" value={weeklyLimit} onChange={e=> setWeeklyLimit(e.target.value)} />
              <input placeholder="Mensual" value={monthlyLimit} onChange={e=> setMonthlyLimit(e.target.value)} />
            </div>
          </div>
          <div style={{marginTop:12}}>
            <button onClick={()=> setStep(2)}>Atrás</button>
            <button onClick={saveSettings} style={{marginLeft:8}}>Finalizar y guardar</button>
          </div>
        </div>
      )}

      <div style={{marginTop:12,color:'#666'}}>{status}</div>
    </div>
  )
}
