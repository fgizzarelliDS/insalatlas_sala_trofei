import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // Use relative base path so assets load properly under any GitHub Pages subpath
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2022',
    sourcemap: false,
    minify: 'esbuild',
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 5500,
    strictPort: true,
    open: true
  },
  preview: {
    host: true,
    port: 5500,
    strictPort: true
  }
});
