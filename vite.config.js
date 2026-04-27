import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    // Nunca gerar sourcemaps no bundle de produção
    sourcemap: false,
  },

  esbuild: {
    // Remove automaticamente console.* e debugger do bundle de produção
    drop: ['console', 'debugger'],
  },
})
