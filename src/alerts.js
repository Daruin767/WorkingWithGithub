import { add, getAll, remove } from './idb'
import { sumForPeriod } from './utils/limits'

function isBrowser(){ return typeof window !== 'undefined' && typeof Notification !== 'undefined' }

export async function requestNotificationPermission(){
  if(!isBrowser()) return 'unsupported'
  try{
    const p = await Notification.requestPermission()
    return p
  }catch(e){
    return 'denied'
  }
}

function showBrowserNotification(alert){
  if(!isBrowser()) return
  try{
    if(Notification.permission === 'granted'){
      const title = 'Finanzas: Límite excedido'
      const opts = { body: alert.message, tag: alert.limit_id }
      new Notification(title, opts)
    }
  }catch(e){ console.error('notification failed', e) }
}

// severity: warning if > threshold, critical if > (threshold * 2)
function computeSeverity(total, limit, thresholdPercent=5){
  const over = Math.abs(total) - Math.abs(limit)
  const pct = (over / (Math.abs(limit) || 1)) * 100
  if(pct >= (thresholdPercent * 2)) return 'critical'
  if(pct >= thresholdPercent) return 'warning'
  return null
}

export async function checkLimitsAndCreateAlerts(user, transactions, limits){
  if(!user) return []
  const alerts = []
  const existing = await getAll('alerts')
  for(const l of limits){
    if(l.user_id && l.user_id !== user.id) continue
    const threshold = Number(l.threshold_percent || 5)
    const { total } = sumForPeriod(transactions, l.period, { category: l.category || null, user_id: user.id })
    const severity = computeSeverity(total, Number(l.amount || 0), threshold)
    // if no severity and there is an existing alert for this limit+user, clear it (auto-resolve)
    const dup = (existing || []).find(a => a.limit_id === l.id && a.user_id === user.id)
    if(!severity){
      if(dup){
        try{ await remove('alerts', dup.id) }catch(e){ console.error('failed to remove resolved alert', e) }
      }
      continue
    }
    // if severity exists but duplicate exists, update severity message if different
    if(dup){
      // update message if needed
      if(dup.severity !== severity || dup.total !== total){
        const updated = { ...dup, severity, total, updated_at: new Date().toISOString(), message: `Límite excedido: ${l.category || 'Todos'} ${l.period} — ${total} / ${l.amount} (${severity})` }
        try{ await add('alerts', updated) }catch(e){ console.error('update alert failed', e) }
      }
      continue
    }
    // create new alert
    const msg = `Límite excedido: ${l.category || 'Todos'} ${l.period} — ${total} / ${l.amount} (${severity})`
    const alert = { id: 'al-' + Math.random().toString(36).slice(2,9), user_id: user.id, limit_id: l.id, message: msg, total, limit: Number(l.amount || 0), severity, created_at: new Date().toISOString() }
    try{ 
      await add('alerts', alert); 
      alerts.push(alert); 
      showBrowserNotification(alert)
      // also add an in-app notification
      try{ await add('notifications', { id: 'nt-' + Math.random().toString(36).slice(2,9), user_id: user.id, type:'limit', alert_id: alert.id, message: alert.message, read_at: null, created_at: new Date().toISOString() }) }catch(e){ console.error('add notification failed', e) }
    // queue email placeholder
    try{ const { templatedLimitAlert, sendEmailPlaceholder } = await import('./email'); const tpl = templatedLimitAlert(user, alert); await sendEmailPlaceholder(user.id, tpl.subject, tpl.body) }catch(e){ console.error('email hook failed', e) }
    }catch(e){ console.error('alert save failed', e) }
  }
  return alerts
}

export async function getAlertsForUser(user){
  if(!user) return []
  const all = await getAll('alerts')
  // only active alerts (not dismissed)
  return (all || []).filter(a => a.user_id === user.id && !a.dismissed_at).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at))
}

export async function getAlertHistory(user){
  if(!user) return []
  const all = await getAll('alerts')
  return (all || []).filter(a => a.user_id === user.id && a.dismissed_at).sort((a,b)=> new Date(b.dismissed_at) - new Date(a.dismissed_at))
}

export async function dismissAlert(id){
  const all = await getAll('alerts')
  const found = (all || []).find(a=> a.id === id)
  if(!found) return false
  const updated = { ...found, dismissed_at: new Date().toISOString() }
  // save updated record (put)
  try{ await add('alerts', updated); return true }catch(e){ console.error('dismiss failed', e); return false }
}
