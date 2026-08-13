import React, { useEffect, useState } from 'react'
import { getNotificationsForUser, dismissNotification } from '../notifications'

export default function NotificationCenter({ user, onClose }){
  const [notes, setNotes] = useState([])

  useEffect(()=>{ load() },[])
  async function load(){
    const all = await getNotificationsForUser(user)
    setNotes(all)
  }

  async function handleDismiss(id){
    await dismissNotification(id)
    await load()
  }

  if(!notes || notes.length===0) return (
    <div className="card" style={{position:'absolute',right:12,top:60,width:360,padding:12,borderRadius:6,color:'var(--text)'}}> 
      <div style={{fontSize:14,fontWeight:700}}>Notificaciones</div>
      <div style={{marginTop:8}} className="meta">No hay notificaciones</div>
      <div style={{marginTop:8,textAlign:'right'}}><button className="nav-btn" onClick={onClose}>Cerrar</button></div>
    </div>
  )

  return (
    <div className="card" style={{position:'absolute',right:12,top:60,width:360,padding:12,borderRadius:6,maxHeight:400,overflow:'auto',color:'var(--text)'}}> 
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:14,fontWeight:700}}>Notificaciones</div>
        <div><button className="nav-btn" onClick={onClose}>Cerrar</button></div>
      </div>
      <ul style={{listStyle:'none',padding:0,marginTop:8}}>
        {notes.map(n=> (
          <li key={n.id} style={{padding:8,borderBottom:'1px solid rgba(255,255,255,0.03)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:13}}>{n.message}</div>
              <div style={{fontSize:11}} className="meta">Registrado: {new Date(n.created_at).toLocaleString()}</div>
            </div>
            <div>
              <button className="ghost" onClick={()=> handleDismiss(n.id)}>Marcar leída</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
