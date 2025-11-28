// Import Vite's configuration function
import { defineConfig } from 'vite'
// Import the React SWC plugin for faster compilation
import react from '@vitejs/plugin-react-swc'
// Import path resolver for handling file paths
import { resolve } from 'path'

export default defineConfig({
  // Enable React support using SWC (faster than Babel)
  plugins: [react()],
  
  build: {
    // Specify the output directory for the built files
    outDir: 'dist',
    
    // Configure Rollup-specific options (Vite uses Rollup under the hood)
    rollupOptions: {
      // Define entry points for the extension
      input: {
        // Entry point for the side panel UI (React application)
        // This will build from sidepanel.html which includes our React components
        sidepanel: resolve(__dirname, 'sidepanel.html'),

        options: resolve(__dirname, 'options.html'),
        
        // Entry point for the extension's background script
        // This runs as a service worker in the background
        background: resolve(__dirname, 'src/background.ts'),
        // content script entry
        content: resolve(__dirname, 'src/content/content.tsx'),
      },
      
      // Configure how the output files are named
      output: {
        // Define how entry point files are named
        // Both background and sidepanel will keep their original names
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? '[name].js' : '[name].js',
        
        // Define how chunk files are named (for code splitting)
        chunkFileNames: '[name].js',
        
        // Define how asset files are named (images, css, etc)
        assetFileNames: '[name].[ext]',

        // Manual chunking strategy to optimize bundle sizes
        manualChunks(id) {
          // If the chunk belongs to the 'content' script (e.g., node_modules/react), 
          // we must return 'content' to force it into the content.js bundle.
          if (id.includes(resolve(__dirname, 'src/content'))) {
              return 'content';
          }

          // Separate vendor libraries into their own chunks
          if (id.includes("node_modules")) {
            if (id.includes("react")) return "vendor-react";
            if (id.includes("@langchain")) return "vendor-langchain";
            if (id.includes("@google")) return "vendor-google";
            return "vendor";
          }
        }
      },
    },
  },
})
