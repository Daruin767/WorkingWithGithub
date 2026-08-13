import React, { useState, useEffect } from 'react'
import { createEncryptedBackup, restoreEncryptedBackup } from '../backup'
import { add, getAll, remove } from '../idb'

export default function BackupPanel({ user }){
  const [status, setStatus] = useState('')
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [backups, setBackups] = useState([])

  useEffect(()=>{ loadBackups() },[])
  async function loadBackups(){
    const all = await getAll('backups')
    const mine = (all || []).filter(b=> !b.user_id || b.user_id === user.id).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at))
    setBackups(mine)
  }

  function downloadBlob(filename, data){
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function handleCreate(){
    setStatus('Creating backup...')
    try{
      const payload = await createEncryptedBackup(password || '', user.id);
      const name = `sdd-backup-${new Date().toISOString().slice(0,10)}.json`
      downloadBlob(name, payload)
      setStatus('Backup created and downloaded')
    }catch(e){
      setStatus('Failed: ' + String(e))
    }
  }

  async function handleSaveToApp(){
    setStatus('Saving backup to app...')
    try{
      const payload = await createEncryptedBackup(password || '', user.id)
      const rec = { id: 'bk-' + Math.random().toString(36).slice(2,9), user_id: user.id, created_at: new Date().toISOString(), payload }
      await add('backups', rec)
      await loadBackups()
      setStatus('Backup saved in app')
    }catch(e){ setStatus('Save failed: ' + String(e)) }
  }

  async function handleDeleteBackup(id){
    if(!window.confirm('Eliminar backup guardado? Esta acción no se puede deshacer.')) return
    await remove('backups', id)
    await loadBackups()
  }

  async function handleUpload(){
    if(!url) return setStatus('Provide upload URL')
    setStatus('Uploading...')
    try{
      const payload = await createEncryptedBackup(password || '', user.id)
      const headers = { 'Content-Type': 'application/json' }
      if(token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(url, { method: 'PUT', headers, body: payload })
      if(!res.ok) throw new Error('Upload failed: ' + res.status)
      setStatus('Uploaded successfully')
    }catch(e){ setStatus('Upload failed: ' + String(e)) }
  }

  async function handleDownloadAndRestore(){
    if(!url) return setStatus('Provide download URL')
    setStatus('Downloading...')
    try{
      const headers = {}
      if(token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(url, { method: 'GET', headers })
      if(!res.ok) throw new Error('Download failed: ' + res.status)
      const payload = await res.text()
      setStatus('Restoring...')
      await restoreEncryptedBackup(payload, password || '', user.id)
      setStatus('Restore completed')
    }catch(e){ setStatus('Restore failed: ' + String(e)) }
  }

  async function handleFileRestore(file){
    setStatus('Reading file...')
    try{
      const txt = await file.text()
      setStatus('Restoring...')
      await restoreEncryptedBackup(txt, password || '', user.id)
      setStatus('Restore completed')
    }catch(e){ setStatus('Restore failed: ' + String(e)) }
  }

  return (
    <div style={{border:'1px solid #eee',padding:12,borderRadius:8}}>
      <h3>Backup y restauración</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>
          <label>Contraseña (usada para cifrar/descifrar)</label>
          <input value={password} onChange={e=> setPassword(e.target.value)} />
          <div style={{marginTop:8,display:'flex',gap:8}}>
            <button className="primary" onClick={handleCreate}>Crear y descargar backup cifrado</button>
            <button className="primary" onClick={handleSaveToApp}>Guardar backup en la app</button>
          </div>
          <div style={{marginTop:8}}>
            <input type="file" accept=".json" onChange={e=> handleFileRestore(e.target.files[0])} />
          </div>
        </div>
        <div>
          <label>URL pública o endpoint para subir/descargar backup</label>
          <input placeholder="https://.../backup/sdd.json" value={url} onChange={e=> setUrl(e.target.value)} />
          <label style={{marginTop:8}}>Token (opcional)</label>
          <input value={token} onChange={e=> setToken(e.target.value)} />
          <div style={{marginTop:8,display:'flex',gap:8}}>
            <button className="nav-btn" onClick={handleUpload}>Subir backup</button>
            <button className="ghost" onClick={handleDownloadAndRestore}>Descargar y restaurar</button>
          </div>
        </div>
      </div>

      <div style={{marginTop:12}}>
        <h4>Backups guardados</h4>
        {backups.length===0 && <div>No hay backups guardados</div>}
        <ul>
          {backups.map(b=> (
            <li key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:6,borderBottom:'1px solid #f2f2f2'}}>
              <div style={{fontSize:13}}>{b.created_at}</div>
              <div style={{display:'flex',gap:8}}>
                <button className="nav-btn" onClick={()=> downloadBlob(`backup-${b.created_at}.json`, b.payload)}>Descargar</button>
                <button className="ghost" onClick={()=> { setStatus('Restoring...'); restoreEncryptedBackup(b.payload, password || '', user.id).then(()=> setStatus('Restore completed')).catch(e=> setStatus('Restore failed: '+String(e))) }}>Restaurar</button>
                <button className="danger" onClick={()=> handleDeleteBackup(b.id)}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={{marginTop:12,color:'#666'}}>{status}</div>
    </div>
  )
}
