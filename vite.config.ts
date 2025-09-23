
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
    // Increase target for better optimization and Netlify compatibility
    target: 'es2020',
    // Enable source maps for production debugging (optional)
    sourcemap: mode === 'development',
    // Ensure compatibility with Netlify
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Simplified chunk splitting for Netlify compatibility
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-slot', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'supabase-vendor': ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
          'utils-vendor': ['clsx', 'tailwind-merge', 'date-fns', 'lucide-react']
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
    // Optimized minification for Netlify
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        passes: 1, // Reduced passes for faster Netlify builds
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
  // Enhanced dependency optimization for Netlify
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
      'sonner',
    ],
    exclude: [
      // Exclude large libraries that should be loaded on demand
      'leaflet',
      'recharts',
    ],
    force: true, // Force re-optimization to fix potential issues
    esbuildOptions: {
      target: 'es2020',
    },
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
