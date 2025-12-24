import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Check if we're building the service worker
  const isServiceWorker = process.env.BUILD_TARGET === 'service-worker';

  if (isServiceWorker) {
    // Separate config for service worker
    return {
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/background/service-worker.js'),
          name: 'ServiceWorker',
          fileName: 'service-worker',
          formats: ['es']
        },
        rollupOptions: {
          output: {
            entryFileNames: 'service-worker.js',
            inlineDynamicImports: true,
          }
        },
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: false,
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src')
        }
      }
    };
  }

  // Default config for UI components
  return {
    plugins: [react()],
    base: './',
    build: {
      rollupOptions: {
        input: {
          popup: path.resolve(__dirname, 'popup.html'),
          options: path.resolve(__dirname, 'options.html'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      },
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  };
});