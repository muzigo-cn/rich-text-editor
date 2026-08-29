import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@fe-muzi\/rte-core$/, replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) },
      { find: /^@fe-muzi\/rte-react$/, replacement: fileURLToPath(new URL('../../packages/react/src/index.ts', import.meta.url)) },
    ],
  },
  server: { port: 5173, open: true },
})
