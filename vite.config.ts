/**
 * @file vite.config.ts
 * @description Vite bundler configuration file. Sets up plugins for React and Tailwind CSS,
 * defines import path aliases, configures raw asset inclusion, and specifies dev server options.
 */

import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/**
 * Custom Vite plugin that intercepts Figma asset imports.
 * It maps import IDs prefixing with 'figma:asset/' to their absolute path in `src/assets/`.
 * 
 * @function figmaAssetResolver
 * @returns {import('vite').Plugin} The custom asset resolver plugin object.
 */
function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      // Check if import path matches the custom Figma asset pattern
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        // Resolve to local file in the src/assets/ folder
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// Export the Vite configuration
export default defineConfig({
  plugins: [
    // Resolve and map custom Figma assets to their actual file paths
    figmaAssetResolver(),
    // Standard React HMR and compiler plugin
    react(),
    // Tailwind CSS post-processing plugin
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias '@' mapping to the 'src' directory to enable absolute-like imports
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  
  // Dev server network settings
  server: {
    port: 4000,         // Run the dev server on port 4000
    strictPort: true,   // Error if port 4000 is already in use instead of choosing next available
  },
})

