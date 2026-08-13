// Backup utilities: exportAllData/importAllData are in idb.js
// Encryption: derive key via PBKDF2 from password, AES-GCM for content

import { exportAllData, importAllData, exportUserData } from './idb'

const enc = new TextEncoder()
const dec = new TextDecoder()

function toBase64(buffer){
  return Buffer.from(buffer).toString('base64')
}
function fromBase64(s){
  return Buffer.from(s, 'base64')
}

async function sha256Hex(data){
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(data))
  return Buffer.from(buf).toString('hex')
}

async function deriveKey(password, salt, iterations = 100000){
  const pwKey = await crypto.subtle.importKey('raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations, hash: 'SHA-256' },
    pwKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  )
}

export async function createEncryptedBackup(password, userId){
  // if userId is provided, export only that user's data to avoid leaking other users' records
  const data = userId ? await exportUserData(userId) : await exportAllData()
  const plaintext = JSON.stringify(data)
  const checksum = await sha256Hex(plaintext)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  const payload = {
    version: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    iterations: 100000,
    checksum,
    cipher: toBase64(cipherBuf)
  }
  return JSON.stringify(payload)
}

export async function restoreEncryptedBackup(payloadJson, password, userId){
  const payload = JSON.parse(payloadJson)
  if(payload.version !== 1) throw new Error('Unsupported backup version')
  const salt = fromBase64(payload.salt)
  const iv = fromBase64(payload.iv)
  const cipher = fromBase64(payload.cipher)
  const key = await deriveKey(password, salt)
  let plainBuf
  try{
    plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  }catch(e){
    throw new Error('Decryption failed: incorrect password or corrupted backup')
  }
  const plaintext = dec.decode(plainBuf)
  const checksum = await sha256Hex(plaintext)
  if(checksum !== payload.checksum) throw new Error('Checksum mismatch')
  const data = JSON.parse(plaintext)
  if(userId){
    // merge/import only items for this user to avoid overwriting other users
    await importUserData(data, userId)
  }else{
    await importAllData(data)
  }
  return true
}
