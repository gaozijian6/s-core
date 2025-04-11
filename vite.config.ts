import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
<<<<<<< HEAD
    port: 5175
  },
  optimizeDeps: {
    exclude: [] // 你需要在这里添加有问题的依赖项
=======
    port: 5176
>>>>>>> b57cc627a92060dc6ec3fa062e74e7570ba96505
  }
})
