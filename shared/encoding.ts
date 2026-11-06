/**
 * Base64 helpers that work the same in browsers, Workers and Node
 * (all three provide `btoa` / `atob`).
 */

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  // Chunked to avoid call-stack limits on large ciphertexts.
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** URL-safe base64 without padding, used for ids and tokens. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function utf8(text: string): Uint8Array<ArrayBuffer> {
  // Copy so the result is typed as ArrayBuffer-backed in every runtime's lib.
  return new Uint8Array(new TextEncoder().encode(text))
}
