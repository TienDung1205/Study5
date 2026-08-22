import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react-datepicker/') || id.includes('/node_modules/date-fns/')) return 'date-picker';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
