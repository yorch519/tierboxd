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
          target: 'https://api.themoviedb.org',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const incoming = new URL(req.url ?? '/', 'http://localhost')
              const tmdbPath = (incoming.searchParams.get('path') ?? '').replace(/^\/+/, '')
              const header = req.headers['x-tmdb-key']
              const ownKey = Array.isArray(header) ? header[0] : header
              const key = ownKey || env.TMDB_API_KEY

              const upstream = new URL(`/3/${tmdbPath}`, 'https://api.themoviedb.org')
              for (const [param, value] of incoming.searchParams) {
                if (param === 'path' || param === 'api_key') continue
                upstream.searchParams.append(param, value)
              }
              if (key) upstream.searchParams.set('api_key', key)
              proxyReq.path = `${upstream.pathname}${upstream.search}`
            })
          },
        },
        '/api/image': {
          target: 'https://image.tmdb.org',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const incoming = new URL(req.url ?? '/', 'http://localhost')
              const imagePath = (incoming.searchParams.get('path') ?? '').replace(/^\/+/, '')
              proxyReq.path = `/${imagePath}`
            })
          },
        },
      },
    },
  }
})
