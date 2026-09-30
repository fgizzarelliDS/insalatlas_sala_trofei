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
    port: 5500,
    open: true
  },
  preview: {
    port: 5500
  }
});
