import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the build works from any GitHub Pages sub-path
export default defineConfig({
  plugins: [react()],
  base: './',
  // fixed port: Google sign-in only works from origins listed on the OAuth client
  server: { port: 5173, strictPort: true },
});
