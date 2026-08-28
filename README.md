# OAuth2UI

A React + TypeScript single-page app that demonstrates how to sign a user in
with **OAuth 2.0 Authorization Code + PKCE** and call a protected Web API
with the resulting access token. It's the client half of the Code Pro
Training "secure a Web API" course — the Authorization Server / Web API
(OpenIddict-based) lives in a separate project.

This project is meant to be *read*, not just run. The code is heavily
commented to explain **why** things are done a certain way, not just what
they do — start with [src/services/authService.ts](src/services/authService.ts)
and [src/utils/pkce.ts](src/utils/pkce.ts).

## What you'll learn

- How the **Authorization Code flow with PKCE** works end-to-end for a
  public client (a browser app that can't keep a secret).
- How to generate a `code_verifier` / `code_challenge` pair and a CSRF-proof
  `state` value.
- How to redirect to `/connect/authorize`, handle the `/callback` redirect,
  and exchange the `code` for tokens at `/connect/token`.
- How to store tokens for the session, attach the access token as a
  `Bearer` token, refresh it with a `refresh_token`, and revoke it on logout.
- How to protect client-side routes based on auth state (`ProtectedRoute`).

## Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS or newer (includes npm).
- The companion **Authorization Server / Web API** project running locally
  (this UI talks to it — it does not have its own backend).
- A modern browser. The PKCE code in this project uses `crypto.subtle`,
  which requires a **secure context** (`https://` or `localhost`) — see below.

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy the example file and adjust it if your API runs on a different
   URL/port:

   ```bash
   cp .env.example .env
   ```

   | Variable | Purpose |
   | --- | --- |
   | `VITE_API_URL` | Base URL of the Authorization Server / Web API (e.g. `https://localhost:7257`). |
   | `VITE_OAUTH_CLIENT_ID` | The client id registered for this SPA on the Authorization Server. |
   | `VITE_OAUTH_REDIRECT_URI` | Must exactly match a redirect URI registered for that client (e.g. `https://localhost:5173/callback`). |

   > These values must match what's configured for the SPA client on the
   > API side (`OAuthClients:Spa` in the API's `appsettings.json`), and the
   > API's CORS policy (`Cors:AllowedOrigins`) must allow this app's origin.

3. **Run the API project first**, then start this app:

   ```bash
   npm run dev
   ```

   Vite prints a local URL (default `https://localhost:5173`, via
   [vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert),
   which generates a locally-trusted HTTPS certificate — needed for
   `crypto.subtle` and to match the redirect URI's scheme).

4. Open the printed URL, click sign in, and you should be redirected to the
   Authorization Server's login page and back to `/dashboard` once
   authenticated.

## Project structure

```
src/
  components/     Reusable UI (LoginForm, Logo, ProtectedRoute)
  context/        AuthContext - exposes user/isAuthenticated/login/logout to the app
  pages/          Route-level pages: HomePage, CallbackPage, DashboardPage
  services/       authService.ts - all OAuth/token wire-up with the Authorization Server
  types/          Shared TypeScript types for tokens/claims/user
  utils/          pkce.ts - PKCE code_verifier/code_challenge/state helpers
```

**Suggested reading order:** `utils/pkce.ts` → `services/authService.ts` →
`context/AuthContext.tsx` → `pages/HomePage.tsx` → `pages/CallbackPage.tsx` →
`components/ProtectedRoute.tsx` → `pages/DashboardPage.tsx`.

## How the sign-in flow works

1. **`HomePage`** renders `LoginForm`, which calls `login()` from
   `AuthContext`.
2. **`authService.redirectToAuthorize()`** generates a PKCE `code_verifier`
   + `code_challenge` and a random `state`, stashes them in
   `sessionStorage`, and redirects the whole page to the Authorization
   Server's `/connect/authorize` endpoint.
3. After the user logs in, the Authorization Server redirects back to
   `/callback` with a `code` and `state` in the query string.
4. **`CallbackPage`** reads those params and calls
   `completeLogin(code, state)`.
5. **`authService.exchangeCodeForTokens()`** verifies `state` matches, then
   POSTs to `/connect/token` with the `code` and the stored
   `code_verifier` to receive an access token (and refresh/id tokens).
6. Tokens are stored in `sessionStorage` (cleared when the tab closes) and
   the decoded `id_token` claims become the signed-in `user` in
   `AuthContext`.
7. **`ProtectedRoute`** guards `/dashboard`, redirecting to `/` if there's
   no valid token. Logging out calls `/connect/revoke` and clears local
   storage.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HTTPS. |
| `npm run build` | Type-check (`tsc -b`) and build for production. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run [oxlint](https://oxc.rs/docs/guide/usage/linter.html). |

## Troubleshooting

- **Blocked by CORS** — make sure the API's `Cors:AllowedOrigins` includes
  this app's origin (e.g. `https://localhost:5173`).
- **`redirect_uri` mismatch error from the Authorization Server** — the
  `VITE_OAUTH_REDIRECT_URI` value must exactly match a redirect URI
  registered for the client on the API.
- **Certificate warnings in the browser** — trust the local dev
  certificate created by `vite-plugin-mkcert`, or accept the browser's
  warning for `localhost`.
- **Stuck on "Signing you in…"** — open devtools and check the network
  call to `/connect/token`; the error message from the API is shown on
  the callback page if the exchange fails.
- **Signed out unexpectedly** — tokens live in `sessionStorage`, so they
  don't survive closing the tab; this is intentional for the course (see
  the comment at the top of [src/services/authService.ts](src/services/authService.ts)).

## Further reading

- [RFC 6749 – The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749)
- [RFC 7636 – Proof Key for Code Exchange (PKCE)](https://www.rfc-editor.org/rfc/rfc7636)
- [OpenIddict documentation](https://documentation.openiddict.com/)
