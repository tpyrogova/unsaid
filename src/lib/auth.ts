/**
 * Account flows. The password is used only locally to derive keys;
 * the server receives `authKey` and the wrapped DEK.
 */
import { z } from 'zod'
import { accountSchema, clearJournalResponseSchema, preloginResponseSchema, type Account } from '../../shared/contract'
import { createAccountKeys, deriveCredentials, unlockVault, type VaultKeys } from './crypto'
import { ApiError, apiRequest } from './http'

export interface UnlockedSession {
  account: Account
  vault: VaultKeys
}

export const MIN_PASSWORD_LENGTH = 10

export async function signUp(email: string, password: string): Promise<UnlockedSession> {
  const { authKey, keys, vault } = await createAccountKeys(password)
  const account = await apiRequest('/api/auth/signup', {
    method: 'POST',
    body: { email, authKey, keys },
    schema: accountSchema,
  })
  return { account, vault }
}

export async function logIn(email: string, password: string): Promise<UnlockedSession> {
  const { kdfSalt } = await apiRequest('/api/auth/prelogin', {
    method: 'POST',
    body: { email },
    schema: preloginResponseSchema,
  })
  const { authKey, wrappingKey } = await deriveCredentials(password, kdfSalt)
  const account = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, authKey },
    schema: accountSchema,
  })
  return { account, vault: await unlockVault(wrappingKey, account.keys) }
}

/** Current account if the session cookie is valid, otherwise `null`. */
export async function fetchCurrentAccount(): Promise<Account | null> {
  try {
    return await apiRequest('/api/auth/me', { schema: accountSchema })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function logOut(): Promise<void> {
  await apiRequest('/api/auth/logout', { method: 'POST', body: {}, schema: z.unknown() })
}

/**
 * Irreversible actions re-check the password: authKey is re-derived locally
 * from the password and the account's KDF salt.
 */
async function reauth(account: Account, password: string): Promise<{ authKey: string }> {
  const { authKey } = await deriveCredentials(password, account.keys.kdfSalt)
  return { authKey }
}

/** Deletes every entry; the account stays. Returns how many entries were removed. */
export async function clearJournal(account: Account, password: string): Promise<number> {
  const result = await apiRequest('/api/journal', {
    method: 'DELETE',
    body: await reauth(account, password),
    schema: clearJournalResponseSchema,
  })
  return result.deleted
}

/** Deletes the account and all data tied to it. */
export async function deleteAccount(account: Account, password: string): Promise<void> {
  await apiRequest('/api/account', { method: 'DELETE', body: await reauth(account, password), schema: z.unknown() })
}
