import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
const appVersion = pkg.version;

/**
 * Automatically propagates package.json version to HTML, Service Worker, and bundle constants
 */
function versionPropagationPlugin(version: string): Plugin {
  return {
    name: 'version-propagation-plugin',
    transformIndexHtml(html: string) {
      return html.replace(/__APP_VERSION__/g, version);
    },
    closeBundle() {
      const distSwPath = fileURLToPath(new URL('./dist/sw.js', import.meta.url));
      if (existsSync(distSwPath)) {
        let swContent = readFileSync(distSwPath, 'utf-8');
        swContent = swContent.replace(/__APP_VERSION__/g, version);
        writeFileSync(distSwPath, swContent, 'utf-8');
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/sw.js') {
          const swPath = fileURLToPath(new URL('./public/sw.js', import.meta.url));
          if (existsSync(swPath)) {
            const swContent = readFileSync(swPath, 'utf-8').replace(/__APP_VERSION__/g, version);
            res.setHeader('Content-Type', 'application/javascript');
            return res.end(swContent);
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  // Use relative base path so assets load properly under any GitHub Pages subpath
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  plugins: [
    versionPropagationPlugin(appVersion)
  ],
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
