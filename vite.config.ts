
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Optimize HMR
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase target for better optimization
    target: 'es2020',
    // Enable source maps for production debugging (optional)
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        // Advanced chunk splitting strategy
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-core';
          }
          
          // Radix UI components
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }
          
          // Supabase libraries
          if (id.includes('@supabase') || id.includes('supabase')) {
            return 'supabase';
          }
          
          // Chart and visualization libraries
          if (id.includes('recharts') || id.includes('leaflet') || id.includes('embla-carousel')) {
            return 'charts-viz';
          }
          
          // Form and validation libraries
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
            return 'forms';
          }
          
          // Utility libraries
          if (id.includes('date-fns') || id.includes('lodash') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'utils';
          }
          
          // Lucide icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // Node modules (other vendor libraries)
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Advanced minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    // Optimize chunk sizes
    chunkSizeWarningLimit: 800,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining
    assetsInlineLimit: 4096,
  },
  // Enhanced dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@supabase/auth-helpers-react',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'date-fns',
    ],
    exclude: [
      // Exclude large libraries that should be loaded on demand
      'leaflet',
      'recharts',
    ],
  },
  // Enable experimental features for better performance
  esbuild: {
    // Remove unused imports
    treeShaking: true,
    // Optimize for modern browsers
    target: 'es2020',
    // Enable JSX optimization
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  // CSS optimization
  css: {
    devSourcemap: mode === 'development',
    preprocessorOptions: {
      // Optimize CSS processing
    },
  },
}));
