import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/v1': { target: 'http://localhost:3000', ws: true },
      '/health': 'http://localhost:3000',
    },
  },
});
