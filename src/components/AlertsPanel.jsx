import React, { useEffect, useState } from 'react'
import { getAlertsForUser, dismissAlert, getAlertHistory } from '../alerts'

export default function AlertsPanel({ user, onChange }){
  const [alerts, setAlerts] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(()=>{ load() },[])
  async function load(){
    const a = await getAlertsForUser(user)
    setAlerts(a)
    if(onChange) onChange(a)
    if(showHistory){
      const h = await getAlertHistory(user)
      setHistory(h)
    }
  }

  async function handleDismiss(id){
    await dismissAlert(id)
    await load()
  }

  async function toggleHistory(){
    setShowHistory(s=>!s)
    if(!showHistory){
      const h = await getAlertHistory(user)
      setHistory(h)
    }
  }

  if((!alerts || alerts.length===0) && !showHistory) return null

  return (
    <div style={{padding:12,borderRadius:6,marginTop:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <strong>Alertas:</strong>
        <button className="nav-btn" onClick={toggleHistory}>{showHistory? 'Ocultar historial' : 'Ver historial'}</button>
      </div>

      {!showHistory && (
        <ul style={{listStyle:'none',padding:0,marginTop:8}}>
          {alerts.map(a=> (
            <li key={a.id} style={{marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center',padding:12,borderRadius:8,background:'transparent',border: '1px solid rgba(255,255,255,0.03)', alignItems:'center'}}>
              <div style={{flex:1, paddingRight:12}}>
                <div style={{fontSize:14, color:'var(--text)'}}>{a.message}</div>
                <div style={{fontSize:12,color:'var(--muted)'}}>Registrado: {new Date(a.created_at).toLocaleString()}</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{width:10,height:38,borderRadius:6,background: a.severity==='critical'? 'rgba(251,113,133,0.18)' : a.severity==='warning'? 'rgba(255,193,7,0.12)' : 'rgba(79,179,255,0.07)'}} />
                <button className="ghost" onClick={()=> handleDismiss(a.id)}>Descartar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showHistory && (
        <div style={{marginTop:8}}>
          <h4 style={{margin:'4px 0'}}>Historial</h4>
          {history.length===0 && <div style={{fontSize:12,color:'#666'}}>No hay alertas en el historial</div>}
          <ul style={{listStyle:'none',padding:0}}>
            {history.map(h=> (
              <li key={h.id} style={{marginTop:8,padding:8,borderRadius:6,background:'#fafafa',border:'1px solid #eee'}}>
                <div style={{fontSize:13}}>{h.message}</div>
                <div style={{fontSize:11,color:'#666'}}>Registrado: {new Date(h.created_at).toLocaleString()} — Descartado: {new Date(h.dismissed_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
