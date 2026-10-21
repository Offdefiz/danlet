// Vanilla TanStack Start + Vite + Nitro: no Lovable build wrapper required.
// Render builds a Node.js service; the bundle starts via npm start.
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({ server: { entry: 'server' } }),
    viteReact(),
    nitro({ preset: 'node-server' }),
  ],
});
