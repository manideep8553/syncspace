import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND = 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/socket.io': { target: BACKEND, ws: true },
      '/yjs': { target: BACKEND, ws: true },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('monaco-editor')) return 'monaco-editor';
          if (id.includes('konva') || id.includes('react-konva')) return 'konva';
          if (id.includes('yjs') || id.includes('y-websocket') || id.includes('y-monaco')) return 'yjs';
          return undefined;
        },
      },
    },
  },
});