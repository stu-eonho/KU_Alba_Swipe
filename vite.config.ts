import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // import.meta.dirname: Vite 8의 native config loader에서 __dirname을 대체한다
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // host: true exposes the dev server on the LAN so you can open it on a real phone.
    // Swipe gestures MUST be tested on a real device, not desktop touch emulation.
    host: true,
    port: 5173,
  },
});
