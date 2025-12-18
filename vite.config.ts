
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // We remove the static stringification of API_KEY here.
    // In this specific environment, process.env.API_KEY is handled at the platform level.
    // Defining it as a reference allows the runtime value to be used.
    'process.env.API_KEY': 'process.env.API_KEY'
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
