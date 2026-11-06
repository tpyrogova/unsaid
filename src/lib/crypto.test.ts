import { describe, expect, it } from 'vitest'
import {
  createAccountKeys,
  decryptJson,
  deriveCredentials,
  encryptJson,
  entryIdForSource,
  unlockWithPassword,
  WrongPasswordError,
} from './crypto'

const PASSWORD = 'correct horse battery staple'

describe('account keys', () => {
  it('re-derives the same authKey from the same password and salt', async () => {
    const { authKey, keys } = await createAccountKeys(PASSWORD)
    const again = await deriveCredentials(PASSWORD, keys.kdfSalt)
    expect(again.authKey).toBe(authKey)
  })

  it('unlocks with the right password and rejects a wrong one', async () => {
    const { keys, vault } = await createAccountKeys(PASSWORD)
    const sealed = await encryptJson(vault, 'entry-id-0000001', { text: 'тайна' })

    const unlocked = await unlockWithPassword(PASSWORD, keys)
    expect(await decryptJson(unlocked, sealed)).toEqual({ text: 'тайна' })

    await expect(unlockWithPassword('wrong password!!', keys)).rejects.toBeInstanceOf(WrongPasswordError)
  })

  it('never puts the password or plaintext keys into what goes to the server', async () => {
    const { authKey, keys, vault } = await createAccountKeys(PASSWORD)
    const sent = JSON.stringify({ authKey, keys })
    expect(sent).not.toContain(PASSWORD)
    // The data key is non-extractable: there is no way to serialize it.
    await expect(crypto.subtle.exportKey('raw', vault.dataKey)).rejects.toThrow()
  })
})

describe('entry encryption', () => {
  it('round-trips JSON and uses a fresh IV every time', async () => {
    const { vault } = await createAccountKeys(PASSWORD)
    const a = await encryptJson(vault, 'entry-id-0000001', { text: 'одно и то же' })
    const b = await encryptJson(vault, 'entry-id-0000001', { text: 'одно и то же' })

    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(await decryptJson(vault, a)).toEqual({ text: 'одно и то же' })
  })

  it('fails if the server swaps a ciphertext onto another entry id', async () => {
    const { vault } = await createAccountKeys(PASSWORD)
    const sealed = await encryptJson(vault, 'entry-id-0000001', { text: 'a' })
    await expect(decryptJson(vault, { ...sealed, id: 'entry-id-0000002' })).rejects.toThrow()
  })

  it('derives deterministic, per-account entry ids for dedup', async () => {
    const one = await createAccountKeys(PASSWORD)
    const two = await createAccountKeys(PASSWORD)
    const key = 'apple-journal:2026-08-13'

    expect(await entryIdForSource(one.vault, key)).toBe(await entryIdForSource(one.vault, key))
    expect(await entryIdForSource(one.vault, key)).not.toBe(await entryIdForSource(two.vault, key))
    expect(await entryIdForSource(one.vault, key)).toMatch(/^[A-Za-z0-9_-]{32}$/)
  })
})
