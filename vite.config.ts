import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Expose the API_KEY to the client-side code as process.env.API_KEY
      // Checks both process.env (system env vars on Vercel) and loaded .env files
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || process.env.VITE_API_KEY || env.VITE_API_KEY || ''),
    },
  };
});