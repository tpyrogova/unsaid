/**
 * Client-side encryption. Nothing in this module talks to the network.
 *
 * Key hierarchy:
 *
 *   password ──PBKDF2(600k, kdfSalt)──► master
 *   master ──HKDF("auth")──► authKey      sent to the server to prove the password
 *   master ──HKDF("wrap")──► wrappingKey  never leaves the browser
 *   wrappingKey ──AES-GCM──► wrapped DEK  stored on the server
 *   DEK (random) ──AES-GCM──► entries     stored on the server
 *
 * The server can verify a login but holds nothing that decrypts entries.
 * A random DEK (instead of encrypting directly with a password-derived key)
 * means a future password change only has to re-wrap one key.
 */
import type { EncryptedEntry, KeyBundle } from '../../shared/contract'
import { base64ToBytes, bytesToBase64, bytesToBase64Url, utf8 } from '../../shared/encoding'
import { dict } from '../i18n'

/** OWASP 2023 recommendation for PBKDF2-HMAC-SHA256. */
export const PBKDF2_ITERATIONS = 600_000
const VERSION = 'unsaid/v1'

/** Keys held in memory while the journal is unlocked. Non-extractable. */
export interface VaultKeys {
  /** AES-GCM key that encrypts entries. */
  dataKey: CryptoKey
  /** HMAC key for deterministic, opaque entry ids (dedup on re-import). */
  entryIdKey: CryptoKey
}

export interface Credentials {
  /** Proves knowledge of the password to the server. */
  authKey: string
  /** Unwraps the DEK. Stays in the browser. */
  wrappingKey: CryptoKey
}

export class WrongPasswordError extends Error {
  constructor() {
    super(dict().api.wrongPassword)
  }
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length))
}

function hkdfParams(info: string): HkdfParams {
  return { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info: utf8(`${VERSION}/${info}`) }
}

/** Derives the login and wrapping keys from the password. Slow on purpose (~0.5–1 s). */
export async function deriveCredentials(password: string, kdfSalt: string): Promise<Credentials> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    utf8(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const masterBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: base64ToBytes(kdfSalt), iterations: PBKDF2_ITERATIONS },
    passwordKey,
    256,
  )
  const master = await crypto.subtle.importKey('raw', masterBits, 'HKDF', false, [
    'deriveBits',
    'deriveKey',
  ])

  const authKey = new Uint8Array(await crypto.subtle.deriveBits(hkdfParams('auth'), master, 256))
  const wrappingKey = await crypto.subtle.deriveKey(
    hkdfParams('wrap'),
    master,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  return { authKey: bytesToBase64(authKey), wrappingKey }
}

async function importVaultKeys(dek: Uint8Array<ArrayBuffer>): Promise<VaultKeys> {
  const dataKey = await crypto.subtle.importKey('raw', dek, 'AES-GCM', false, ['encrypt', 'decrypt'])
  const dekForHkdf = await crypto.subtle.importKey('raw', dek, 'HKDF', false, ['deriveKey'])
  const entryIdKey = await crypto.subtle.deriveKey(
    hkdfParams('entry-id'),
    dekForHkdf,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign'],
  )
  return { dataKey, entryIdKey }
}

/** Everything a new account needs: what to send to the server and the unlocked vault. */
export async function createAccountKeys(password: string): Promise<{
  authKey: string
  keys: KeyBundle
  vault: VaultKeys
}> {
  const kdfSalt = bytesToBase64(randomBytes(16))
  const { authKey, wrappingKey } = await deriveCredentials(password, kdfSalt)

  const dek = randomBytes(32)
  const iv = randomBytes(12)
  const wrappedDek = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: utf8(`${VERSION}/dek`) },
    wrappingKey,
    dek,
  )
  const vault = await importVaultKeys(dek)
  dek.fill(0)

  return {
    authKey,
    keys: {
      kdfSalt,
      wrappedDek: bytesToBase64(new Uint8Array(wrappedDek)),
      wrappedDekIv: bytesToBase64(iv),
    },
    vault,
  }
}

/** Unwraps the DEK. AES-GCM authentication fails on a wrong password. */
export async function unlockVault(wrappingKey: CryptoKey, keys: KeyBundle): Promise<VaultKeys> {
  let dek: Uint8Array<ArrayBuffer>
  try {
    dek = new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: base64ToBytes(keys.wrappedDekIv),
          additionalData: utf8(`${VERSION}/dek`),
        },
        wrappingKey,
        base64ToBytes(keys.wrappedDek),
      ),
    )
  } catch {
    throw new WrongPasswordError()
  }
  const vault = await importVaultKeys(dek)
  dek.fill(0)
  return vault
}

/** Convenience for the "unlock after reload" flow. */
export async function unlockWithPassword(password: string, keys: KeyBundle): Promise<VaultKeys> {
  const { wrappingKey } = await deriveCredentials(password, keys.kdfSalt)
  return unlockVault(wrappingKey, keys)
}

/**
 * Deterministic id for an imported entry: the same source file always maps
 * to the same id, so re-importing an export does not create duplicates.
 * The id reveals nothing about the source without the key.
 */
export async function entryIdForSource(vault: VaultKeys, sourceKey: string): Promise<string> {
  const mac = await crypto.subtle.sign('HMAC', vault.entryIdKey, utf8(sourceKey))
  return bytesToBase64Url(new Uint8Array(mac).subarray(0, 24))
}

/**
 * The entry id is bound as AAD, so the server cannot swap ciphertexts between
 * entries without decryption failing.
 */
function entryAad(id: string): Uint8Array<ArrayBuffer> {
  return utf8(`${VERSION}/entry/${id}`)
}

export async function encryptJson(vault: VaultKeys, id: string, value: unknown): Promise<EncryptedEntry> {
  const iv = randomBytes(12)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: entryAad(id) },
    vault.dataKey,
    utf8(JSON.stringify(value)),
  )
  return { id, ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv) }
}

export async function decryptJson(vault: VaultKeys, entry: EncryptedEntry): Promise<unknown> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(entry.iv), additionalData: entryAad(entry.id) },
    vault.dataKey,
    base64ToBytes(entry.ciphertext),
  )
  return JSON.parse(new TextDecoder().decode(plaintext))
}
