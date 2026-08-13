import React, { useEffect, useState } from 'react'
import { getById, add } from '../idb'

export default function SettingsView({ user, onSaved }){
  const [loading, setLoading] = useState(true)
  const [userRec, setUserRec] = useState(null)
  const [form, setForm] = useState({ currency: 'USD', auto_backup: false, auto_backup_interval: 'daily', encryption_enabled: false, limit_mode: 'alert' })
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [privacyText, setPrivacyText] = useState('')

  async function loadPrivacy(){
    if(privacyText){ setPrivacyOpen(true); return }
    try{
      const res = await fetch('/PRIVACY.md')
      if(!res.ok) throw new Error('not found')
      const txt = await res.text()
      setPrivacyText(txt)
      setPrivacyOpen(true)
    }catch(e){
      setPrivacyText('No se pudo cargar la política de privacidad')
      setPrivacyOpen(true)
    }
  }

  useEffect(()=>{ load() },[])
  async function load(){
    setLoading(true)
    try{
      const u = await getById('users', user.id)
      setUserRec(u)
      const s = (u && u.settings) ? u.settings : {}
      setForm({ currency: u?.currency || 'USD', auto_backup: s.auto_backup || false, encryption_enabled: s.encryption_enabled || false, limit_mode: s.limit_mode || 'alert' })
    }finally{ setLoading(false) }
  }

  async function save(){
    if(!userRec) return
    const updated = { ...userRec, currency: form.currency, settings: { ...(userRec.settings||{}), auto_backup: !!form.auto_backup, encryption_enabled: !!form.encryption_enabled, limit_mode: form.limit_mode || 'alert' } }
    await add('users', updated)
    // update local display copy (localStorage holds only id/email but keep user object fresh)
    try{ const raw = localStorage.getItem('sdd_current_user'); if(raw){ const cu = JSON.parse(raw); if(cu.id === user.id) localStorage.setItem('sdd_current_user', JSON.stringify({...cu, currency: form.currency})) } }catch(e){}
    if(onSaved) onSaved(updated)
    alert('Ajustes guardados')
  }

  if(loading) return <div>Cargando ajustes...</div>

  return (
    <div style={{border:'1px solid #eee',padding:12,borderRadius:8}}>
      <h3>Ajustes</h3>
      <div style={{display:'grid',gap:8}}>
        <div>
          <label>Moneda</label>
          <select value={form.currency} onChange={e=> setForm(f=> ({...f, currency: e.target.value}))}>
            <option value="USD">USD (US Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
            <option value="MXN">MXN (Peso mexicano)</option>
            <option value="PEN">PEN (Soles)</option>
          </select>
        </div>

        <div>
          <label style={{display:'flex',gap:8,alignItems:'center'}}>
            <input type="checkbox" checked={form.auto_backup} onChange={e=> setForm(f=> ({...f, auto_backup: e.target.checked}))} />
            <span>Activar backups automáticos</span>
          </label>
          <div style={{fontSize:12,color:'#666'}}>Si está activo, el sistema sugerirá crear backups periódicos.</div>
        </div>

        <div>
          <label style={{display:'flex',gap:8,alignItems:'center'}}>
            <input type="checkbox" checked={form.encryption_enabled} onChange={e=> setForm(f=> ({...f, encryption_enabled: e.target.checked}))} />
            <span>Habilitar cifrado para backups</span>
          </label>
          <div style={{fontSize:12,color:'#666'}}>El cifrado requiere establecer una contraseña cuando cree un backup. La contraseña no se almacena aquí.</div>
        </div>

        <div>
          <label>Comportamiento al exceder límites</label>
          <select value={form.limit_mode} onChange={e=> setForm(f=> ({...f, limit_mode: e.target.value}))}>
            <option value="alert">Avisar</option>
            <option value="warn">Advertir (permitir con confirmación)</option>
            <option value="block">Bloquear</option>
          </select>
          <div style={{fontSize:12,color:'#666'}}>Esta opción sirve como comportamiento por defecto; los límites individuales pueden anularla.</div>
        </div>

        <div>
          <label>Backups automáticos</label>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input type="checkbox" checked={form.auto_backup} onChange={e=> setForm(f=> ({...f, auto_backup: e.target.checked}))} />
            <span>Habilitar backups automáticos</span>
          </div>
          <div style={{marginTop:8}}>
            <label>Intervalo</label>
            <select value={form.auto_backup_interval} onChange={e=> setForm(f=> ({...f, auto_backup_interval: e.target.value}))}>
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
          <div style={{fontSize:12,color:'#666'}}>Si está activo, la app guardará backups locales automáticamente (no cifrados). Para backups cifrados active "Habilitar cifrado" y use el botón manual.</div>
        </div>

        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={save}>Guardar ajustes</button>
          <button onClick={loadPrivacy}>Ver política de privacidad</button>
        </div>

        {privacyOpen && (
          <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:'80%',maxHeight:'80%',overflow:'auto',background:'#fff',padding:16,borderRadius:8}}>
              <h3>Política de privacidad</h3>
              <pre style={{whiteSpace:'pre-wrap',fontSize:13}}>{privacyText}</pre>
              <div style={{textAlign:'right',marginTop:8}}><button onClick={()=> setPrivacyOpen(false)}>Cerrar</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
