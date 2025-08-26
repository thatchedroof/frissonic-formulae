import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasmPackWatchPlugin from 'vite-plugin-wasm-pack-watcher'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    watch: {
      include: ['src/**/*.ts', 'src/**/*.rs'],
    },
  },
  plugins: [
    svgr({
      svgrOptions: {
        exportType: 'default',
      },
    }),
    react(),
    tailwindcss(),
    wasmPackWatchPlugin(),
    wasm(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
})
