const DB_NAME = 'waste-tokens-crypto'
const STORE_NAME = 'keys'
const KEY_ID = 'aes-gcm-key'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await openDB()

  const existing: CryptoKey | undefined = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(KEY_ID)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  if (existing) {
    db.close()
    return existing
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(key, KEY_ID)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  db.close()
  return key
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext) return ''
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  )
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return `enc:v1:${arrayBufferToBase64(combined.buffer)}`
}

export async function decryptApiKey(encrypted: string): Promise<string> {
  if (!encrypted) return ''
  if (!encrypted.startsWith('enc:v1:')) return encrypted
  try {
    const key = await getOrCreateKey()
    const data = base64ToArrayBuffer(encrypted.slice(7))
    const iv = data.slice(0, 12)
    const ciphertext = data.slice(12)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    return ''
  }
}

export function isEncrypted(value: string): boolean {
  return value.startsWith('enc:v1:')
}
