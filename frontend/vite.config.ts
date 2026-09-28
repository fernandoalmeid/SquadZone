import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // pedidos /api/... vão para o backend
      '/api': 'http://localhost:5000',
      // Socket.IO (tempo real) também, incluindo WebSockets
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
})
