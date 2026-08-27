// authService.ts
// Everything related to talking to the /api/auth endpoints and to storing
// the JWT lives here, so the rest of the app never has to know how or where
// the token is kept.
//
// We use sessionStorage (not localStorage) for this course:
//  - It is automatically cleared when the browser tab is closed, which is a
//    safer default for a demo/tutorial than "remembering" the user forever.
//  - It still survives page refreshes within the same tab, so students can
//    see the token persist across a reload without adding cookie/CORS setup
//    on the server.
import type { AuthUser, DecodedToken, LoginRequest, LoginResponse } from '../types/auth'

const TOKEN_STORAGE_KEY = 'cpt.jwt.token'

// The API now lives in its own separate project (see VITE_API_URL in .env).
// Since the UI and API run on different origins, the API's CORS policy
// (Cors:AllowedOrigins in appsettings.json) must allow this origin.
const API_BASE_URL = import.meta.env.VITE_API_URL
const LOGIN_ENDPOINT = `${API_BASE_URL}/api/auth/login`

/**
 * Sends the username/password to the API and returns the raw JWT string.
 * Throws an Error with a friendly message if the credentials are invalid
 * or the server returns something unexpected.
 */
export async function login(credentials: LoginRequest): Promise<string> {
  const response = await fetch(LOGIN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid username or password.')
    }

    // Surface whatever the server sent back (e.g. a dev exception page or
    // ProblemDetails body) so the real cause of a 500 shows up in the UI.
    const detail = await response.text().catch(() => '')
    throw new Error(`Login failed with status ${response.status}.${detail ? ` ${detail}` : ''}`)
  }

  const data = (await response.json()) as LoginResponse
  setToken(data.token)

  return data.token
}

/** Removes the stored token, effectively logging the user out. */
export function logout(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY)
}

/** Persists the token in sessionStorage. */
export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
}

/** Reads the current token from sessionStorage, if any. */
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY)
}

/**
 * Decodes the payload of a JWT without validating its signature.
 * This is safe to do on the client purely for *reading* claims (e.g. to show
 * "Welcome, admin" in the UI) - the server is always responsible for
 * validating the token's signature and expiry on every request.
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )

    return JSON.parse(json) as DecodedToken
  } catch {
    return null
  }
}

/** Returns true if a token exists and its "exp" claim is in the future. */
export function isTokenValid(token: string | null): token is string {
  if (!token) return false

  const decoded = decodeToken(token)
  if (!decoded?.exp) return false

  const nowInSeconds = Date.now() / 1000
  return decoded.exp > nowInSeconds
}

/** Builds a simplified AuthUser from a raw JWT string. */
export function getUserFromToken(token: string): AuthUser | null {
  const decoded = decodeToken(token)
  if (!decoded) return null

  const username = decoded.name ?? decoded.unique_name ?? decoded.sub

  if (!username) return null

  const role =
    decoded.role ??
    decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'] ??
    null

  return { username, role: (role as string) ?? null }
}
