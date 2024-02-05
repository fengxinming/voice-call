import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'voice-call': fileURLToPath(new URL('../voice-call/src', import.meta.url))
    }
  },
  server: {
    open: true
  }
  // build: {
  //   minify: false
  // }
});
