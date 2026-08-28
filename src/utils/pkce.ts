// pkce.ts
// Implements PKCE (Proof Key for Code Exchange, RFC 7636) for the Authorization
// Code flow. PKCE lets a public client (like this SPA, which can't keep a
// client secret) prove to the Authorization Server that the app exchanging
// the code is the same one that started the flow, without needing a secret.

/** Base64url-encodes a byte array (no padding, URL-safe alphabet). */
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Generates a cryptographically random code_verifier, per RFC 7636 (43-128
 * characters from the unreserved URL character set). 32 random bytes,
 * base64url-encoded, comfortably satisfies this.
 */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

/**
 * Derives the code_challenge from a code_verifier using the S256 method:
 * base64url(SHA-256(verifier)). The Authorization Server later hashes the
 * code_verifier sent to /connect/token and compares it against this value.
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

/** Generates a random opaque "state" value used to protect against CSRF on the redirect. */
export function generateState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}
