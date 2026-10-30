import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
const appVersion = pkg.version;

/**
 * Automatically synchronizes package-lock.json with package.json version if they diverge
 */
function syncPackageLockVersion(version: string): void {
  const lockPath = fileURLToPath(new URL('./package-lock.json', import.meta.url));
  if (existsSync(lockPath)) {
    try {
      const lock = JSON.parse(readFileSync(lockPath, 'utf-8'));
      let modified = false;
      if (lock.version !== version) {
        lock.version = version;
        modified = true;
      }
      if (lock.packages && lock.packages[''] && lock.packages[''].version !== version) {
        lock.packages[''].version = version;
        modified = true;
      }
      if (modified) {
        writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
      }
    } catch {
      // Ignored
    }
  }
}
syncPackageLockVersion(appVersion);

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
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          if (id.includes('src/components/modals/analytics/')) {
            return 'analytics-modals';
          }
          if (id.includes('src/analytics/')) {
            return 'analytics-core';
          }
          if (id.includes('src/export/')) {
            return 'export-suite';
          }
        }
      }
    }
  },
  server: {
    host: true,
    port: 5500,
    strictPort: false,
    open: true
  },
  preview: {
    host: true,
    port: 5500,
    strictPort: false
  }
});
