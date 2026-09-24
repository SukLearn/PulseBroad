import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', ['BACKEND_PORT', 'FRONTEND_PORT']);
  const apiTarget = `http://127.0.0.1:${env.BACKEND_PORT || '4001'}`;
  return {
    plugins: [react()],
    server: {
      port: Number(env.FRONTEND_PORT || 3001),
      strictPort: true,
      proxy: { '/api': apiTarget, '/uploads': apiTarget }
    }
  };
});
