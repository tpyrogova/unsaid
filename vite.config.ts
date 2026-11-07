import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// The Cloudflare plugin runs the Worker (server/worker.ts) inside workerd
// next to the Vite dev server: one `npm run dev`, real D1/AI bindings, HMR.
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
})
