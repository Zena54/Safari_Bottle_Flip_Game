import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Safari_Bottle_Flip_Game/' : '/',
  plugins: [react()],
  server: { port: 5173, host: true },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          query: ['@tanstack/react-query'],
          sentry: ['@sentry/react'],
        },
      },
    },
  },
}));