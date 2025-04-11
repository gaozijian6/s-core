import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175
  },
  optimizeDeps: {
    exclude: [] // 你需要在这里添加有问题的依赖项
  }
})
