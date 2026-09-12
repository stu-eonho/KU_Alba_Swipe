import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    // host: true exposes the dev server on the LAN so you can open it on a real phone.
    // Swipe gestures MUST be tested on a real device, not desktop touch emulation.
    host: true,
    port: 5173,
  },
});
