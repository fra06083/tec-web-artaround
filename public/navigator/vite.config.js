import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/navigator/',
  build: {
    rollupOptions: {
      input: 'index_src.html'
    }
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
        proxy: {
            '/api': 'http://localhost:8000'
        }
    }
})
