import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 5102,
      host: true
    },
    define: {
      // Make env variables available globally in client code
      // This is what fixes "process is not defined" error
      '__APP_ENV__': JSON.stringify(env.NODE_ENV),
      'process.env': {
        VITE_GEMINI_API_KEY: JSON.stringify(env.VITE_GEMINI_API_KEY),
        // Add any other environment variables you might need here
        NODE_ENV: JSON.stringify(env.NODE_ENV)
      }
    }
  }
})
