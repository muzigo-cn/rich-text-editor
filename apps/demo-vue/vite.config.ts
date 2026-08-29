import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: /^@rte\/core$/, replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) },
      { find: /^@rte\/vue$/, replacement: fileURLToPath(new URL('../../packages/vue/src/index.ts', import.meta.url)) },
    ],
  },
  server: { port: 5174, open: false },
})
