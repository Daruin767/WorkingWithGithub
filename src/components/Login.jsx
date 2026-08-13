import React, { useState } from 'react'
import { login, register } from '../auth'

export default function Login({onLogin}){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [mode,setMode]=useState('login')
  const [error,setError]=useState('')

  const submit = async (e)=>{
    e.preventDefault()
    try{
      const user = mode==='login' ? await login(email,password) : await register(email,password)
      onLogin(user)
    }catch(err){ setError(err.message) }
  }

  return (
    <div style={{maxWidth:420,margin:'2rem auto'}}>
      <h2>{mode==='login'? 'Iniciar sesión' : 'Registro'}</h2>
      <form onSubmit={submit}>
        <div><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <div><input type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
        <div><button type="submit" className="primary">{mode==='login' ? 'Entrar' : 'Crear cuenta'}</button></div>
      </form>
      <div style={{color:'red'}}>{error}</div>
      <hr />
      <button className="nav-btn" onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login'?'Crear cuenta':'Volver a iniciar sesión'}</button>
    </div>
  )
}
