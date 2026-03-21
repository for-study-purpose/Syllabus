import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function validateClientEnv(mode) {
  const env = loadEnv(mode, process.cwd(), '')
  const forbiddenPattern = /(CLIENT_SECRET|PRIVATE_KEY|SERVICE_ACCOUNT|REFRESH_TOKEN|ADMIN_SETUP_TOKEN|FIREBASE_SERVICE_ACCOUNT|GDRIVE_CLIENT_SECRET)/i

  const leaked = Object.keys(env)
    .filter(key => key.startsWith('VITE_'))
    .filter(key => forbiddenPattern.test(key))

  if (leaked.length) {
    throw new Error(
      `Refusing to build: secret-like client env vars detected: ${leaked.join(', ')}. ` +
      'Move these to backend/.env and expose only non-sensitive public config via VITE_ variables.'
    )
  }
}

export default defineConfig(({ mode }) => {
  validateClientEnv(mode)

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
