import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend talks only to our Node backend; /api is proxied to it in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
