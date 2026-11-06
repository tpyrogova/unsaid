/**
 * The subset of the Workers AI binding the app uses. Declared locally (instead
 * of the generated `Ai` type) so new model ids type-check and tests can pass a fake.
 */
export interface AiBinding {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>
}

export interface Env {
  DB: D1Database
  AI: AiBinding
  /** Secret used to derive decoy KDF salts for unknown emails. */
  SALT_SECRET: string
}
