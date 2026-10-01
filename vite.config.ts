import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative base path so assets load properly under any GitHub Pages subpath
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild'
  },
  server: {
    host: true,
    port: 5500,
    open: true
  },
  preview: {
    host: true,
    port: 5500
  }
});
