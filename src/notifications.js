import { add, getAll } from './idb'

export async function addNotification(user, payload){
  if(!user) return null
  const n = { id: 'nt-' + Math.random().toString(36).slice(2,9), user_id: user.id, ...payload, read_at: null, created_at: new Date().toISOString() }
  await add('notifications', n)
  return n
}

export async function getNotificationsForUser(user){
  if(!user) return []
  const all = await getAll('notifications')
  return (all || []).filter(n => n.user_id === user.id).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at))
}

export async function dismissNotification(id){
  const all = await getAll('notifications')
  const found = (all || []).find(n=> n.id === id)
  if(!found) return false
  const updated = { ...found, read_at: new Date().toISOString() }
  try{ await add('notifications', updated); return true }catch(e){ console.error('dismiss notif failed', e); return false }
}
