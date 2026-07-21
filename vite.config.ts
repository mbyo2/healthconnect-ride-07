
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import legacy from '@vitejs/plugin-legacy';

// https://vitejs.dev/config/
/// <reference types="vite/client" />

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    cors: mode === 'production' ? false : {
      origin: [
        'http://localhost:8080',
        'https://dokota.netlify.app',
        'https://*.netlify.app',
        'https://tthzcijscedgxjfnfnky.supabase.co'
      ],
      credentials: true
    },
    proxy: mode === 'production' ? undefined : {
      '/auth/v1': {
        target: 'https://tthzcijscedgxjfnfnky.supabase.co',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/auth\/v1/, '/auth/v1'),
        secure: false
      },
      '/rest/v1': {
        target: 'https://tthzcijscedgxjfnfnky.supabase.co',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rest\/v1/, '/rest/v1'),
        secure: false
      }
    },
    hmr: {
      overlay: false,
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    legacy({
      targets: ['defaults', 'not IE 11', 'Android >= 5'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2015', // Lowered from es2020 for better baseline compatibility
    sourcemap: mode === 'development',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Rolldown (used by Vite 8) accepts a function here, unlike the
          // Rollup object shorthand used by older Vite releases.
          if (!id.includes('node_modules')) return;
          if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/') || id.includes('node_modules/react/')) return 'vendor-react';
          if (id.includes('@supabase/')) return 'vendor-supabase';
          if (id.includes('@radix-ui/')) return 'vendor-ui';
          if (id.includes('node_modules/recharts/')) return 'vendor-charts';
          if (id.includes('node_modules/leaflet/') || id.includes('node_modules/react-leaflet/')) return 'vendor-maps';
          if (id.includes('node_modules/date-fns/') || id.includes('node_modules/lucide-react/') || id.includes('node_modules/clsx/') || id.includes('node_modules/tailwind-merge/')) return 'vendor-utils';
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        passes: 1,
        sequences: false, // Reduce compression complexity
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    assetsInlineLimit: 8192,
    reportCompressedSize: false,
  },
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
      'leaflet',
      'react-leaflet',
      'recharts',
      'lodash',
    ],
    force: true,
    esbuildOptions: {
      target: 'es2015',
    },
  },
  esbuild: {
    treeShaking: true,
    target: 'es2015',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  css: {
    devSourcemap: mode === 'development',
  },
}));
