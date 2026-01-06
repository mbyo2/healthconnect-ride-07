
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
        // manualChunks: {
        //   'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        //   'ui-vendor': ['@radix-ui/react-slot', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        //   'supabase-vendor': ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
        //   'utils-vendor': ['clsx', 'tailwind-merge', 'date-fns', 'lucide-react']
        // },
        // assetFileNames: (assetInfo) => {
        //   if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
        //   const info = assetInfo.name.split('.');
        //   const ext = info[info.length - 1];
        //   if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
        //     return `assets/images/[name]-[hash][extname]`;
        //   }
        //   if (/woff2?|eot|ttf|otf/i.test(ext)) {
        //     return `assets/fonts/[name]-[hash][extname]`;
        //   }
        //   return `assets/[name]-[hash][extname]`;
        // },
        // chunkFileNames: 'assets/js/[name]-[hash].js',
        // entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        passes: 1,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    chunkSizeWarningLimit: 800,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
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
    ],
    exclude: ['recharts'],
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
