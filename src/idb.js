import { openDB } from 'idb'

const DB_NAME = 'sdd-finanzas-db'
const DB_VERSION = 1
let dbPromise = null

// Open DB once and cache promise — handle failures by resetting cache so callers can retry
export const getDB = async ()=>{
  if(dbPromise) return dbPromise
  try{
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db){
        if(!db.objectStoreNames.contains('users')) db.createObjectStore('users',{keyPath:'id'})
        if(!db.objectStoreNames.contains('transactions')) db.createObjectStore('transactions',{keyPath:'id'})
        if(!db.objectStoreNames.contains('goals')) db.createObjectStore('goals',{keyPath:'id'})
        if(!db.objectStoreNames.contains('items')) db.createObjectStore('items',{keyPath:'id'})
        if(!db.objectStoreNames.contains('limits')) db.createObjectStore('limits',{keyPath:'id'})
        if(!db.objectStoreNames.contains('accounts')) db.createObjectStore('accounts',{keyPath:'id'})
        if(!db.objectStoreNames.contains('backups')) db.createObjectStore('backups',{keyPath:'id'})
        if(!db.objectStoreNames.contains('alerts')) db.createObjectStore('alerts',{keyPath:'id'})
        if(!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications',{keyPath:'id'})
        if(!db.objectStoreNames.contains('email_requests')) db.createObjectStore('email_requests',{keyPath:'id'})
      }
    })
    return dbPromise
  }catch(e){
    // reset cache so future calls may retry creating/opening DB
    dbPromise = null
    throw e
  }
}

// Simple exponential backoff retry helper
async function withRetry(fn, attempts = 3, baseDelay = 50){
  let lastErr
  for(let i=0;i<attempts;i++){
    try{
      return await fn()
    }catch(e){
      lastErr = e
      const delay = baseDelay * Math.pow(2, i)
      await new Promise(r=>setTimeout(r, delay))
    }
  }
  throw lastErr
}

let writeChain = Promise.resolve()
const LOCK_KEY = 'sdd_db_lock'

// simple cross-tab lock using localStorage with expiry to avoid stale locks
async function acquireLock(timeoutMs = 5000, poll = 100){
  const token = Math.random().toString(36).slice(2)
  const deadline = Date.now() + timeoutMs
  while(Date.now() < deadline){
    const raw = localStorage.getItem(LOCK_KEY)
    if(!raw){
      try{
        localStorage.setItem(LOCK_KEY, JSON.stringify({ token, expires: Date.now() + timeoutMs }))
        const check = JSON.parse(localStorage.getItem(LOCK_KEY) || '{}')
        if(check.token === token) return token
      }catch(e){ /* ignore */ }
    }else{
      try{
        const obj = JSON.parse(raw)
        if(obj.expires && Date.now() > obj.expires){
          // stale lock, attempt to take it
          localStorage.setItem(LOCK_KEY, JSON.stringify({ token, expires: Date.now() + timeoutMs }))
          const check = JSON.parse(localStorage.getItem(LOCK_KEY) || '{}')
          if(check.token === token) return token
        }
      }catch(e){ /* ignore malformed value */ }
    }
    await new Promise(r=>setTimeout(r, poll))
  }
  throw new Error('Could not acquire DB lock')
}

function releaseLock(token){
  try{
    const raw = localStorage.getItem(LOCK_KEY)
    if(!raw) return
    const obj = JSON.parse(raw)
    if(obj.token === token) localStorage.removeItem(LOCK_KEY)
  }catch(e){ /* ignore */ }
}

export const add = async (store, value) => {
  // serialize writes to avoid concurrent put/delete races in the same page
  writeChain = writeChain.then(async () => {
    return withRetry(async ()=>{
      const lock = await acquireLock()
      try{
        const db = await getDB()
        await db.put(store, value)
        return value
      }finally{
        releaseLock(lock)
      }
    })
  })
  return writeChain
}

export const getAll = async (store) => {
  const db = await getDB()
  return withRetry(()=>db.getAll(store))
}

export const getById = async (store, id) => {
  const db = await getDB()
  return withRetry(()=>db.get(store, id))
}

export const remove = async (store, id) => {
  writeChain = writeChain.then(async () => {
    return withRetry(async ()=>{
      const lock = await acquireLock()
      try{
        const db = await getDB()
        return db.delete(store, id)
      }finally{
        releaseLock(lock)
      }
    })
  })
  return writeChain
}

// Ensure the listed stores exist in the DB; if some are missing, close and reopen with an upgraded version that creates them
async function ensureStoresExist(storeNames){
  if(!storeNames || storeNames.length===0) return
  const db = await getDB()
  const missing = storeNames.filter(s => !db.objectStoreNames.contains(s))
  if(missing.length===0) return
  const newVersion = db.version + 1
  db.close()
  dbPromise = null
  // reopen with upgrade to create missing stores
  dbPromise = openDB(DB_NAME, newVersion, {
    upgrade(upDb){
      for(const s of missing){
        if(!upDb.objectStoreNames.contains(s)) upDb.createObjectStore(s,{keyPath:'id'})
      }
    }
  })
  await dbPromise
}

// Export all object stores to a plain object using a single readonly transaction for a consistent snapshot
export const exportAllData = async ()=>{
  const db = await getDB()
  const names = Array.from(db.objectStoreNames)
  const tx = db.transaction(names, 'readonly')
  const out = {}
  for(const name of names){
    out[name] = await tx.objectStore(name).getAll()
  }
  await tx.done
  return out
}

// Export data scoped to a single user. For stores that contain objects with a user_id
// property, only include items where item.user_id === userId. For items lacking
// a user_id property (global resources), include them as-is.
export const exportUserData = async (userId)=>{
  if(!userId) return {}
  const db = await getDB()
  const names = Array.from(db.objectStoreNames)
  const tx = db.transaction(names, 'readonly')
  const out = {}
  for(const name of names){
    const all = await tx.objectStore(name).getAll()
    if(!Array.isArray(all)){
      out[name] = all
      continue
    }
    // filter items: include if no user_id field, or user_id matches
    out[name] = all.filter(item => {
      if(item && Object.prototype.hasOwnProperty.call(item, 'user_id')){
        return item.user_id === userId
      }
      // include global items (no user_id)
      return true
    })
  }
  await tx.done
  return out
}

// Import data (overwrite) — used for restore from backup
export const importAllData = async (data)=>{
  const keys = Object.keys(data || {})
  if(keys.length===0) return
  // ensure stores exist before attempting transaction
  await ensureStoresExist(keys)
  const db = await getDB()
  // perform all writes in a transaction for atomicity
  const tx = db.transaction(keys, 'readwrite')
  for(const store of keys){
    const items = data[store] || []
    await tx.objectStore(store).clear()
    for(const it of items) await tx.objectStore(store).put(it)
  }
  await tx.done
}

// Import user-scoped data by merging entries for the given userId.
// For each store, remove existing items belonging to userId and insert provided items.
// For the 'users' store, only upsert the single user record if provided.
export const importUserData = async (data, userId)=>{
  if(!userId) throw new Error('userId required for importUserData')
  const keys = Object.keys(data || {})
  if(keys.length===0) return
  await ensureStoresExist(keys)
  const db = await getDB()

  // Use a transaction across all affected stores
  const tx = db.transaction(keys, 'readwrite')
  for(const store of keys){
    const items = data[store] || []
    if(store === 'users'){
      // upsert only the user record(s) that match userId
      for(const u of items){
        if(u && u.id === userId) await tx.objectStore(store).put(u)
      }
      continue
    }
    // for other stores, remove existing items that belong to userId, then add new ones
    const existing = await tx.objectStore(store).getAll()
    const toDelete = (existing || []).filter(it => it && Object.prototype.hasOwnProperty.call(it, 'user_id') && it.user_id === userId)
    for(const d of toDelete){
      try{ await tx.objectStore(store).delete(d.id) }catch(e){ /* ignore */ }
    }
    for(const it of items){
      // only import items that either have no user_id (global) or match the userId
      if(it && Object.prototype.hasOwnProperty.call(it, 'user_id')){
        if(it.user_id === userId) await tx.objectStore(store).put(it)
      }else{
        // global item without user_id: put as-is
        await tx.objectStore(store).put(it)
      }
    }
  }
  await tx.done
}

// Close DB (useful for tests / recovery)
export const closeDB = async ()=>{
  if(dbPromise){
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
}
