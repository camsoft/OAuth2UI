// Shared TypeScript types for authentication.
// Keeping these in one place makes it easy to see the "shape" of data that
// flows between the frontend and the WebAPICourse.Auth API.

// The JSON body we send to POST /api/auth/login.
// This must match WebAPICourse.Models.LoginRequest on the server.
export interface LoginRequest {
  username: string;
  password: string;
}

// The JSON body the server sends back after a successful login.
export interface LoginResponse {
  token: string;
}

// The claims we expect to find inside the decoded JWT payload.
// The token is created by WebAPICourse.Services.TokenService.
export interface DecodedToken {
  // "sub" (subject) or the ASP.NET Core "name" claim - the username.
  sub?: string;
  unique_name?: string;
  name?: string;
  // ASP.NET Core role claim, e.g. "Admin" or "Member".
  role?: string;
  ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role']?: string;
  // Standard JWT "expires at" claim, in seconds since the Unix epoch.
  exp?: number;
  [key: string]: unknown;
}

// A simplified, easy-to-use representation of the logged in user that we
// derive from the decoded token and expose through AuthContext.
export interface AuthUser {
  username: string;
  role: string | null;
}
