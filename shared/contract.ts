/**
 * API contract shared by the browser client and Pages Functions.
 *
 * Note what is NOT here: no plaintext journal fields. The server only ever
 * sees opaque base64 blobs (`ciphertext`, `wrappedDek`) and a derived
 * `authKey`, never the password and never the data key.
 */
import { z } from 'zod'

const base64 = (maxLength: number) =>
  z
    .string()
    .min(1)
    .max(maxLength)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Ожидается base64')

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254))

/** Opaque entry id: an HMAC of the source (imports) or a random UUID. */
export const entryIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/)

/** Upper bound for one encrypted entry (~384 KB of base64). */
export const MAX_CIPHERTEXT_LENGTH = 512_000
export const MAX_ENTRIES_PER_UPLOAD = 50

/** Everything needed to re-derive the user's keys in the browser. */
export const keyBundleSchema = z.object({
  /** Public salt for the client-side PBKDF2. */
  kdfSalt: base64(64),
  /** The random data key (DEK), encrypted with a key derived from the password. */
  wrappedDek: base64(256),
  wrappedDekIv: base64(32),
})
export type KeyBundle = z.infer<typeof keyBundleSchema>

export const preloginRequestSchema = z.object({ email: emailSchema })
export const preloginResponseSchema = z.object({ kdfSalt: base64(64) })

export const signupRequestSchema = z.object({
  email: emailSchema,
  /** Derived from the password in the browser; the password itself never leaves it. */
  authKey: base64(64),
  keys: keyBundleSchema,
})
export type SignupRequest = z.infer<typeof signupRequestSchema>

export const loginRequestSchema = z.object({
  email: emailSchema,
  authKey: base64(64),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const accountSchema = z.object({
  email: z.string(),
  keys: keyBundleSchema,
})
export type Account = z.infer<typeof accountSchema>

export const encryptedEntrySchema = z.object({
  id: entryIdSchema,
  ciphertext: base64(MAX_CIPHERTEXT_LENGTH),
  iv: base64(32),
})
export type EncryptedEntry = z.infer<typeof encryptedEntrySchema>

export const storedEntrySchema = encryptedEntrySchema.extend({
  /** Upload time (ms). The entry's own date lives inside the ciphertext. */
  createdAt: z.number(),
})
export type StoredEntry = z.infer<typeof storedEntrySchema>

export const listEntriesResponseSchema = z.object({ entries: z.array(storedEntrySchema) })

export const uploadEntriesRequestSchema = z.object({
  entries: z.array(encryptedEntrySchema).min(1).max(MAX_ENTRIES_PER_UPLOAD),
})
export const uploadEntriesResponseSchema = z.object({
  /** Number of new entries; already-imported ids are skipped. */
  inserted: z.number(),
})

export const errorResponseSchema = z.object({ error: z.string() })

/** Re-encrypted versions of existing entries (e.g. after categorization). */
export const updateEntriesRequestSchema = z.object({
  entries: z.array(encryptedEntrySchema).min(1).max(MAX_ENTRIES_PER_UPLOAD),
})
export const updateEntriesResponseSchema = z.object({ updated: z.number() })

export const MAX_ENTRIES_PER_DELETE = 200

export const deleteEntriesRequestSchema = z.object({
  ids: z.array(entryIdSchema).min(1).max(MAX_ENTRIES_PER_DELETE),
})
export const deleteEntriesResponseSchema = z.object({ deleted: z.number() })

/**
 * Re-authentication for irreversible actions (clear journal, delete account):
 * the browser re-derives authKey from the password; the password never leaves it.
 */
export const reauthRequestSchema = z.object({ authKey: base64(64) })
export const clearJournalResponseSchema = z.object({ deleted: z.number() })
