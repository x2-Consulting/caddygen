import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  preview: {
    host: '0.0.0.0',
  },
  test: {
    environment: 'node',
  },
})
