import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 'base' ensures assets are loaded correctly on GitHub Pages (or any subdirectory)
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
  },
  // Ensure publicDir is set to 'public' (default). 
  // Any file in the 'public' folder will be copied to the root of 'dist'.
  publicDir: 'public' 
});