import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// #region Same-origin API connection
// The browser requests /api from Vite. Vite forwards it unchanged to Spring,
// including bearer headers. Production needs the equivalent reverse proxy.
// Only VITE_ prefixed values are exposed to browser code; no server secrets belong there.
// #endregion
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = {
  '/api/auth': {
    target: env.AUTH_API_PROXY_TARGET || 'http://127.0.0.1:8080',
    changeOrigin: true,
  },

  '/api/tasks': {
    target: env.TASK_API_PROXY_TARGET || 'http://127.0.0.1:8081',
    changeOrigin: true,
  },
};
  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
  };
});
