// Shared TypeScript types for authentication.
// Keeping these in one place makes it easy to see the "shape" of data that
// flows between the frontend and the WebAPICourse OAuth 2.0 Authorization
// Server (OpenIddict), reached via /connect/authorize, /connect/token, etc.

// The JSON body returned by POST /connect/token (RFC 6749 section 5.1),
// whether the grant used was "authorization_code" or "refresh_token".
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  // Only present when the "openid" scope was requested.
  id_token?: string;
  // Only present when the "offline_access" scope was requested/granted.
  refresh_token?: string;
  scope?: string;
}

// The claims we expect to find inside the decoded id_token payload.
// Unlike the access_token (which OpenIddict encrypts by default and the
// client should treat as opaque), the id_token is a signed-only JWT meant
// to be read by the client, so it's safe to decode here purely to display
// "Welcome, admin" etc. The API still independently validates the
// access_token on every request - the SPA never uses id_token claims for
// authorization decisions.
export interface IdTokenClaims {
  sub?: string;
  name?: string;
  // ASP.NET Core role claim, e.g. "Admin" or "Member".
  role?: string;
  ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role']?: string;
  // Standard JWT "expires at" claim, in seconds since the Unix epoch.
  exp?: number;
  [key: string]: unknown;
}

// A simplified, easy-to-use representation of the logged in user that we
// derive from the decoded id_token and expose through AuthContext.
export interface AuthUser {
  username: string;
  role: string | null;
}

// Everything persisted in sessionStorage after a successful token exchange.
export interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresAt: number; // epoch milliseconds
}
