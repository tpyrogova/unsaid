/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Pages Functions run under `npm run dev:api` (wrangler) on :8788.
    proxy: { '/api': 'http://127.0.0.1:8788' },
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
})
