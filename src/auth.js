import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { add, getAll, getById } from './idb'

const USERS_STORE = 'users'

export async function register(email, password){
  const id = uuidv4()
  const salt = bcrypt.genSaltSync(10)
  const hash = bcrypt.hashSync(password, salt)
  const user = { id, email, password_hash: hash, created_at: new Date().toISOString(), currency:'USD', settings:{} }
  await add(USERS_STORE, user)
  // store current user in localStorage for session simulation
  localStorage.setItem('sdd_current_user', JSON.stringify({id,email}))
  return { id, email }
}

export async function login(email, password){
  const users = await getAll(USERS_STORE)
  const user = users.find(u=>u.email===email)
  if(!user) throw new Error('Usuario no encontrado')
  const ok = bcrypt.compareSync(password, user.password_hash)
  if(!ok) throw new Error('Contraseña inválida')
  localStorage.setItem('sdd_current_user', JSON.stringify({id:user.id,email:user.email}))
  return { id:user.id, email:user.email }
}

export async function getCurrentUser(){
  const raw = localStorage.getItem('sdd_current_user')
  if(!raw) return null
  try{ return JSON.parse(raw) }catch(e){return null}
}

export function logout(){
  localStorage.removeItem('sdd_current_user')
}
