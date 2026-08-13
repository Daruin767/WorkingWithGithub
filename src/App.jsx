import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import { getCurrentUser } from './auth'
import './styles/dark-theme.css'

export default function App(){
  const [user, setUser] = useState(null)

  useEffect(()=>{
    getCurrentUser().then(u=>setUser(u))
  },[])

  // root wrapper for theme
  if(!user) return <div className="app-root"><Login onLogin={u=>setUser(u)} /></div>
  return <div className="app-root"><Dashboard user={user} onLogout={()=>setUser(null)} /></div>
}
