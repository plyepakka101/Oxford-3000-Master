
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // พยายามดึงจากหลายชื่อที่เป็นไปได้
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || process.env.VITE_API_KEY || process.env.VITE_GEMINI_KEY || "")
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
});
