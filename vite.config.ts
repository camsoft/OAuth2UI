import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin(), mkcert()],
    // No custom port: use Vite's default (5173) so students get the standard
    // dev server experience. No dev proxy either - the API is a fully separate
    // project/origin. Requests go straight to VITE_API_URL (see .env) and the
    // API's CORS policy (Cors:AllowedOrigins in appsettings.json) allows this origin.
})

