import { add, getById } from './idb'

export async function sendEmailPlaceholder(userId, subject, body){
  // store email request in idb for manual delivery or server-side pickup
  try{
    const req = { id: 'emr-' + Math.random().toString(36).slice(2,9), user_id: userId, subject, body, created_at: new Date().toISOString(), status: 'queued' }
    await add('email_requests', req)
    console.info('Email queued (placeholder)', req)
    return req
  }catch(e){ console.error('email queue failed', e); throw e }
}

export function templatedLimitAlert(user, alert){
  const subject = `Alerta: Límite excedido (${alert.severity})`
  const body = `Hola,

Se ha detectado que has excedido el límite: ${alert.limit}.
Detalle: ${alert.message}

Puedes abrir la app para revisar las transacciones relacionadas.

Saludos.`
  return { subject, body }
}
