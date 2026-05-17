import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Mermaid's parser is loaded only on docs pages that render diagrams.
    // Keep the warning budget above that lazy chunk while preserving normal warnings.
    chunkSizeWarningLimit: 700,
    // Copy markdown files to dist
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.md')) {
            return 'docs/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  publicDir: 'public',
  assetsInclude: ['**/*.md'],
});
