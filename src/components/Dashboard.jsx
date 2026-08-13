import React, { useEffect, useState } from 'react'
import { getAll, add, remove } from '../idb'
import { logout } from '../auth'
import TransactionForm from './TransactionForm'
import TransactionList from './TransactionList'
import Summary from './Summary'
import AhorrosView from './AhorrosView'
import ExpensesView from './ExpensesView'
import LimitsView from './LimitsView'
import AlertsPanel from './AlertsPanel'
import Charts from './Charts'
import { checkLimitsAndCreateAlerts, getAlertsForUser, requestNotificationPermission } from '../alerts'
import BackupPanel from './BackupPanel'
import SettingsView from './SettingsView'
import { getById, add as idbAdd, exportAllData, getAll as idbGetAll } from '../idb'
import NotificationCenter from './NotificationCenter'
import OnboardingView from './OnboardingView'

export default function Dashboard({user, onLogout}){
  const [transactions,setTransactions]=useState([])
  const [view,setView]=useState('home') // home | expenses | goals | items | add
  const [alerts,setAlerts]=useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(()=>{ load() },[])

  useEffect(()=>{
    let timer = null
    let running = false
    async function runBackupNow(){
      if(running) return
      running = true
      try{
        const urec = await getById('users', user.id)
        const settings = urec && urec.settings ? urec.settings : {}
        if(!settings || !settings.auto_backup) return
        if(settings.encryption_enabled){
          console.warn('Auto backup skipped: encryption enabled (requires manual password)')
          return
        }
        // export only current user's data for auto-backups to avoid leaking other users' data
        const data = await import('../idb').then(m=> m.exportUserData(user.id))
        const payload = JSON.stringify({ created_at: new Date().toISOString(), data })
        const rec = { id: 'bk-' + Math.random().toString(36).slice(2,9), user_id: user.id, created_at: new Date().toISOString(), payload }
        await idbAdd('backups', rec)
        console.info('Auto backup saved')
      }catch(e){ console.error('Auto backup failed', e) }
      finally{ running = false }
    }

    async function setup(){
      try{
        const urec = await getById('users', user.id)
        const settings = urec && urec.settings ? urec.settings : {}
        if(settings && settings.auto_backup){
          const interval = settings.auto_backup_interval || 'daily'
          const ms = interval === 'daily' ? 24*60*60*1000 : interval === 'weekly' ? 7*24*60*60*1000 : 30*24*60*60*1000
          // run immediately then schedule
          runBackupNow()
          timer = setInterval(runBackupNow, ms)
        }
      }catch(e){ console.error('setup auto backup failed', e) }
    }
    setup()
    return ()=>{ if(timer) clearInterval(timer) }
  },[user])

  async function load(){
    const txs = await getAll('transactions')
    const userTx = txs.filter(t=>t.user_id===user.id)
    setTransactions(userTx)
    // load limits and check alerts
    const limits = (await getAll('limits')).filter(x=> !x.user_id || x.user_id===user.id)
    // create alerts for exceeded limits
    try{ await checkLimitsAndCreateAlerts(user, userTx, limits) }catch(e){ console.error('check limits failed', e) }
    const alerts = await getAlertsForUser(user)
    setAlerts(alerts)
    // load notification count
    try{
      const allNotes = await idbGetAll('notifications')
      const unread = (allNotes || []).filter(n=> n.user_id === user.id && !n.read_at)
      setNotifCount(unread.length)
    }catch(e){ console.error('notif load failed', e) }
  }

  async function onAdd(tx){
    await add('transactions', tx)
    await load()
    setView('expenses')
  }

  async function onDelete(id){
    await remove('transactions', id)
    await load()
  }

  async function onEdit(tx){
    await add('transactions', tx) // put acts as update
    await load()
    setView('expenses')
  }

  const totalSaved = transactions.reduce((s,t)=> s + (t.amount>0? t.amount : 0), 0)
  const totalSpent = transactions.reduce((s,t)=> s + (t.amount<0? Math.abs(t.amount) : 0), 0)

  return (
    <div style={{padding:20}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1 style={{margin:0}}>Hola, {user.email}</h1>
          <div style={{color:'#666'}}>Resumen mensual rápido</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',position:'relative'}}>
          <div style={{position:'relative'}}>
            <button className="nav-btn" onClick={()=> setShowNotifications(s=>!s)}>Notificaciones {notifCount>0 && (<span className="badge" style={{marginLeft:8}}>{notifCount}</span>)}</button>
            {showNotifications && (<NotificationCenter user={user} onClose={()=> { setShowNotifications(false); load() }} />)}
          </div>
          {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
            <button className="nav-btn" onClick={async ()=>{ const p = await requestNotificationPermission(); /* no-op: permission prompt handled by browser */ }}>Activar notificaciones</button>
          )}
          <button className="nav-btn" onClick={()=>{logout(); onLogout();}}>Cerrar sesión</button>
        </div>
      </header>

      <nav style={{marginTop:16,display:'flex',gap:8}}>
        <button className={view==='home'? 'nav-btn active' : 'nav-btn'} onClick={()=>setView('home')}>Inicio</button>
        <button className={view==='savings'? 'nav-btn active' : 'nav-btn'} onClick={()=>setView('savings')}>Ahorros</button>
        <button className={view==='expenses'? 'nav-btn active' : 'nav-btn'} onClick={()=>setView('expenses')}>Gastos</button>
        <button className={view==='limits'? 'nav-btn active' : 'nav-btn'} onClick={()=>setView('limits')}>Límites</button>
        <button className={view==='backup'? 'nav-btn active' : 'nav-btn'} onClick={()=>setView('backup')}>Backup</button>
        <button className={view==='settings'? 'nav-btn active' : 'nav-btn'} onClick={()=>setView('settings')}>Ajustes</button>
        <button className={view==='onboarding'? 'nav-btn active' : 'nav-btn'} onClick={()=>setView('onboarding')}>Onboarding</button>
      </nav>

      <main style={{marginTop:20}}>
        {view==='home' && (
          <div>
            <AlertsPanel user={user} onChange={(a)=> setAlerts(a)} />
            <Summary transactions={transactions} totalSaved={totalSaved} totalSpent={totalSpent} />
            <div style={{marginTop:16}}>
              <Charts transactions={transactions} />
            </div>
            <section style={{marginTop:20}}>
              <h3>Últimas transacciones</h3>
              <TransactionList transactions={transactions.slice().sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,6)} onEdit={onEdit} onDelete={onDelete} />
            </section>
            <div style={{marginTop:16}}>
              <button className="nav-btn" onClick={()=> setView('limits')}>Configurar límites</button>
            </div>
          </div>
        )}

        {view==='savings' && (
          <AhorrosView user={user} />
        )}

        {view==='expenses' && (
          <ExpensesView transactions={transactions} user={user} onRefresh={load} onAdd={onAdd} onDelete={onDelete} />
        )}


        {view==='limits' && (
          <div>
            <LimitsView user={user} />
          </div>
        )}

        {view==='settings' && (
          <div>
            <SettingsView user={user} onSaved={(u)=> { /* reload header if needed */ }} />
          </div>
        )}

        {view==='backup' && (
          <div>
            <h3>Backup</h3>
            <BackupPanel user={user} />
          </div>
        )}

        {view==='onboarding' && (
          <div>
            <OnboardingView user={user} onComplete={()=>{ load(); setView('home') }} />
          </div>
        )}

        {view==='add' && (
          <div>
            <h3>Añadir transacción</h3>
            <TransactionForm user={user} onAdd={onAdd} />
          </div>
        )}
      </main>
    </div>
  )
}
