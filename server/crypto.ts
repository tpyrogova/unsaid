import { base64ToBytes, bytesToBase64, bytesToBase64Url, utf8 } from '../shared/encoding'

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length))
}

export async function sha256(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data))
}

/**
 * Server-side hash of the client's authKey.
 *
 * A single salted SHA-256 is enough here: authKey is not a password but the
 * output of 600k-iteration PBKDF2 + HKDF in the browser, so guessing it means
 * paying that cost per guess. (Workers' CPU limits also make a second slow KDF
 * on the server impractical.)
 */
export async function hashAuthKey(authKeyBase64: string, saltBase64: string): Promise<string> {
  const salt = base64ToBytes(saltBase64)
  const key = base64ToBytes(authKeyBase64)
  const input = new Uint8Array(salt.length + key.length)
  input.set(salt)
  input.set(key, salt.length)
  return bytesToBase64(await sha256(input))
}

/** Constant-time comparison of two base64 strings. */
export function timingSafeEqual(a: string, b: string): boolean {
  const x = utf8(a)
  const y = utf8(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  }
  return diff === 0
}

/**
 * Deterministic fake KDF salt for emails without an account, so /prelogin
 * does not reveal which emails are registered.
 */
export async function decoySalt(secret: string, email: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    utf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(`kdf-salt:${email}`)))
  return bytesToBase64(mac.subarray(0, 16))
}

export function randomToken(): string {
  return bytesToBase64Url(randomBytes(32))
}
