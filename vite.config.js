import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Платформа Global Expo. Порт свой, чтобы не конфликтовать с соседними
// проектами (Setanta занимает 5178, Vite по умолчанию — 5173).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      // fileURLToPath корректно декодирует пробелы в пути проекта.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5188,
    open: false,
    // На бэкенде не настроен CORS, поэтому в разработке ходим к нему через
    // собственный origin: браузер видит запрос как same-origin, а Vite
    // переправляет его на стенд. Убрать, когда сервер начнёт отдавать
    // Access-Control-Allow-Origin.
    proxy: {
      '/api': {
        // Куда проксировать /api в разработке. На Vercel ту же роль играет
        // правило «API Proxy» в Routing rules проекта.
        // Своего бэкенда у Global Expo пока нет — по умолчанию тестовый
        // стенд с той же схемой API. Когда появится, поменять здесь
        // и в Routing rules проекта на Vercel.
        target:
          loadEnv(mode, process.cwd(), '').API_PROXY_TARGET ||
          'https://setantatest.pythonanywhere.com',
        changeOrigin: true,
      },
    },
  },
}))
