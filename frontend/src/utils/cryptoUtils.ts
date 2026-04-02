/**
 * Client-side cryptographic utilities using the Web Crypto API.
 * Used for: SHA-256 hashing, AES-256-GCM encryption (demo/display purposes).
 */

/** SHA-256 hash of a string — returns hex string */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Generate a random AES-256-GCM key */
export async function generateAESKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

/** AES-256-GCM encrypt — returns base64(iv):base64(ciphertext) */
export async function encryptAES(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return `${ivB64}:${ctB64}`
}

/** AES-256-GCM decrypt */
export async function decryptAES(encrypted: string, key: CryptoKey): Promise<string> {
  const [ivB64, ctB64] = encrypted.split(':')
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
  const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0))
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(plaintext)
}

/** Compute device fingerprint (SHA-256 of userAgent + language) */
export async function deviceFingerprint(): Promise<string> {
  const raw = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`
  return sha256(raw)
}
