import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/tmdb': {
          target: 'https://api.themoviedb.org/3',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tmdb/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const header = req.headers['x-tmdb-key']
              const ownKey = Array.isArray(header) ? header[0] : header
              const key = ownKey || env.TMDB_API_KEY
              if (!key) return

              const target = new URL(proxyReq.path || '/', 'https://api.themoviedb.org/3')
              target.searchParams.set('api_key', key)
              proxyReq.path = `${target.pathname}${target.search}`
            })
          },
        },
        '/api/image': {
          target: 'https://image.tmdb.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/image/, ''),
        },
      },
    },
  }
})
