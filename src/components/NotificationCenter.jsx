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
    <div style={{position:'absolute',right:12,top:60,width:360,border:'1px solid #ddd',background:'#fff',padding:12,borderRadius:6}}> 
      <div style={{fontSize:14,fontWeight:700}}>Notificaciones</div>
      <div style={{marginTop:8,color:'#666'}}>No hay notificaciones</div>
      <div style={{marginTop:8,textAlign:'right'}}><button onClick={onClose}>Cerrar</button></div>
    </div>
  )

  return (
    <div style={{position:'absolute',right:12,top:60,width:360,border:'1px solid #ddd',background:'#fff',padding:12,borderRadius:6,maxHeight:400,overflow:'auto'}}> 
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:14,fontWeight:700}}>Notificaciones</div>
        <div><button onClick={onClose}>Cerrar</button></div>
      </div>
      <ul style={{listStyle:'none',padding:0,marginTop:8}}>
        {notes.map(n=> (
          <li key={n.id} style={{padding:8,borderBottom:'1px solid #f2f2f2',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:13}}>{n.message}</div>
              <div style={{fontSize:11,color:'#666'}}>Registrado: {new Date(n.created_at).toLocaleString()}</div>
            </div>
            <div>
              <button onClick={()=> handleDismiss(n.id)}>Marcar leída</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
