// authService.ts
// Everything related to talking to the OAuth 2.0 Authorization Server
// (OpenIddict, hosted by the API) lives here, so the rest of the app never
// has to know how the Authorization Code + PKCE flow works under the hood.
//
// We use sessionStorage (not localStorage) for this course:
//  - It is automatically cleared when the browser tab is closed, which is a
//    safer default for a demo/tutorial than "remembering" the user forever.
//  - It still survives page refreshes within the same tab, so students can
//    see the token persist across a reload without adding cookie/CORS setup
//    on the server.
import type { AuthUser, IdTokenClaims, StoredTokens, TokenResponse } from '../types/auth'
import { generateCodeChallenge, generateCodeVerifier, generateState } from '../utils/pkce'

const ACCESS_TOKEN_KEY = 'cpt.oauth.accessToken'
const REFRESH_TOKEN_KEY = 'cpt.oauth.refreshToken'
const ID_TOKEN_KEY = 'cpt.oauth.idToken'
const EXPIRES_AT_KEY = 'cpt.oauth.expiresAt'
const CODE_VERIFIER_KEY = 'cpt.oauth.codeVerifier'
const STATE_KEY = 'cpt.oauth.state'

// The API now lives in its own separate project (see VITE_API_URL in .env).
// Since the UI and API run on different origins, the API's CORS policy
// (Cors:AllowedOrigins in appsettings.json) must allow this origin.
const API_BASE_URL = import.meta.env.VITE_API_URL
const CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_OAUTH_REDIRECT_URI

const AUTHORIZE_ENDPOINT = `${API_BASE_URL}/connect/authorize`
const TOKEN_ENDPOINT = `${API_BASE_URL}/connect/token`
const REVOKE_ENDPOINT = `${API_BASE_URL}/connect/revoke`

const SCOPES = 'openid profile roles offline_access'

/**
 * Builds the /connect/authorize URL and stashes the PKCE code_verifier and
 * anti-CSRF state value in sessionStorage so they can be checked once the
 * browser is redirected back to /callback.
 */
export async function buildAuthorizeUrl(): Promise<string> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateState()

  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier)
  sessionStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  })

  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`
}

/** Starts the login flow by redirecting the whole page to the Authorization Server. */
export async function redirectToAuthorize(): Promise<void> {
  window.location.href = await buildAuthorizeUrl()
}

/**
 * Completes the Authorization Code + PKCE flow: validates the returned
 * `state` matches what we generated, then exchanges the `code` for tokens
 * at /connect/token using the stored `code_verifier`.
 */
export async function exchangeCodeForTokens(code: string, state: string): Promise<AuthUser | null> {
  const expectedState = sessionStorage.getItem(STATE_KEY)
  const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY)

  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(CODE_VERIFIER_KEY)

  if (!expectedState || state !== expectedState) {
    throw new Error('The authorization response state does not match. Please try signing in again.')
  }

  if (!codeVerifier) {
    throw new Error('Missing PKCE code verifier. Please try signing in again.')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier,
  })

  const tokens = await requestToken(body)
  storeTokens(tokens)

  return tokens.id_token ? getUserFromIdToken(tokens.id_token) : null
}

/** Uses the stored refresh token to obtain a new access token without user interaction. */
export async function refreshAccessToken(): Promise<AuthUser | null> {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error('No refresh token available.')
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  })

  const tokens = await requestToken(body)
  storeTokens(tokens)

  return tokens.id_token ? getUserFromIdToken(tokens.id_token) : null
}

/** Posts to /connect/token and returns the parsed response, throwing a friendly error on failure. */
async function requestToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Sign-in failed with status ${response.status}.${detail ? ` ${detail}` : ''}`)
  }

  return (await response.json()) as TokenResponse
}

/**
 * Revokes the refresh token (and, transitively, the access tokens issued
 * from it) and clears everything stored locally. Uses `sendBeacon`-style
 * best-effort semantics - if the revoke call fails, we still clear local
 * state so the user is signed out of this browser regardless.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()

  clearTokens()

  if (!refreshToken) {
    return
  }

  try {
    await fetch(REVOKE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: refreshToken,
        client_id: CLIENT_ID,
      }),
    })
  } catch {
    // Best-effort: the user is already signed out locally even if the
    // network call to revoke the token on the server fails.
  }
}

/** Persists the token response in sessionStorage. */
function storeTokens(tokens: TokenResponse): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
  sessionStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + tokens.expires_in * 1000))

  if (tokens.refresh_token) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  }

  if (tokens.id_token) {
    sessionStorage.setItem(ID_TOKEN_KEY, tokens.id_token)
  }
}

/** Removes every stored token, effectively logging the user out locally. */
function clearTokens(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(ID_TOKEN_KEY)
  sessionStorage.removeItem(EXPIRES_AT_KEY)
}

/** Reads the current access token from sessionStorage, if any. */
export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

/** Reads the current refresh token from sessionStorage, if any. */
export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY)
}

/** Returns the stored tokens as a single object, or null if none are stored. */
export function getStoredTokens(): StoredTokens | null {
  const accessToken = getAccessToken()
  const expiresAt = Number(sessionStorage.getItem(EXPIRES_AT_KEY))

  if (!accessToken || !expiresAt) return null

  return {
    accessToken,
    refreshToken: getRefreshToken(),
    idToken: sessionStorage.getItem(ID_TOKEN_KEY),
    expiresAt,
  }
}

/** Returns true if a non-expired access token is currently stored. */
export function isAccessTokenValid(): boolean {
  const tokens = getStoredTokens()
  return tokens !== null && tokens.expiresAt > Date.now()
}

/**
 * Decodes the payload of a JWT without validating its signature. This is
 * only ever used for the id_token (signed but not encrypted), never the
 * access_token (which OpenIddict encrypts and the client can't decode) -
 * purely to read display claims like username/role.
 */
function decodeJwtPayload(token: string): IdTokenClaims | null {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )

    return JSON.parse(json) as IdTokenClaims
  } catch {
    return null
  }
}

/** Builds a simplified AuthUser from a raw id_token string. */
export function getUserFromIdToken(idToken: string): AuthUser | null {
  const decoded = decodeJwtPayload(idToken)
  if (!decoded) return null

  const username = decoded.name ?? decoded.sub
  if (!username) return null

  const role =
    decoded.role ??
    decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'] ??
    null

  return { username, role: (role as string) ?? null }
}

/** Returns the current user from the stored id_token, if any. */
export function getCurrentUser(): AuthUser | null {
  const idToken = sessionStorage.getItem(ID_TOKEN_KEY)
  return idToken ? getUserFromIdToken(idToken) : null
}

