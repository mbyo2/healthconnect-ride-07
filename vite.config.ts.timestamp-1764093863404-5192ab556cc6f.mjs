// vite.config.ts
import { defineConfig } from "file:///C:/Users/Administrator/Desktop/Health/healthconnect-ride-07/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Administrator/Desktop/Health/healthconnect-ride-07/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/Administrator/Desktop/Health/healthconnect-ride-07/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Administrator\\Desktop\\Health\\healthconnect-ride-07";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // In production, CORS is handled by Netlify
    cors: mode === "production" ? false : {
      origin: [
        "http://localhost:8080",
        "https://dokota.netlify.app",
        "https://*.netlify.app",
        "https://tthzcijscedgxjfnfnky.supabase.co"
      ],
      credentials: true
    },
    // Only use proxy in development
    proxy: mode === "production" ? void 0 : {
      "/auth/v1": {
        target: "https://tthzcijscedgxjfnfnky.supabase.co",
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/auth\/v1/, "/auth/v1"),
        secure: false
      },
      "/rest/v1": {
        target: "https://tthzcijscedgxjfnfnky.supabase.co",
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/rest\/v1/, "/rest/v1"),
        secure: false
      }
    },
    // Optimize HMR
    hmr: {
      overlay: false
    },
    // Add security headers
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true"
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    // Increase target for better optimization and Netlify compatibility
    target: "es2020",
    // Enable source maps for production debugging (optional)
    sourcemap: mode === "development",
    // Ensure compatibility with Netlify
    outDir: "dist",
    rollupOptions: {
      output: {
        // Simplified chunk splitting for Netlify compatibility
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["@radix-ui/react-slot", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
          "supabase-vendor": ["@supabase/supabase-js", "@supabase/auth-helpers-react"],
          "utils-vendor": ["clsx", "tailwind-merge", "date-fns", "lucide-react"]
        },
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js"
      }
    },
    // Optimized minification for Netlify
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: mode === "production",
        drop_debugger: mode === "production",
        pure_funcs: mode === "production" ? ["console.log", "console.info"] : [],
        passes: 1
        // Reduced passes for faster Netlify builds
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    // Optimize chunk sizes
    chunkSizeWarningLimit: 800,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining
    assetsInlineLimit: 4096
  },
  // Enhanced dependency optimization for Netlify
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
      "@supabase/auth-helpers-react",
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "date-fns",
      "sonner"
    ],
    exclude: [
      // Exclude large libraries that should be loaded on demand
      "leaflet",
      "recharts"
    ],
    force: true,
    // Force re-optimization to fix potential issues
    esbuildOptions: {
      target: "es2020"
    }
  },
  // Enable experimental features for better performance
  esbuild: {
    // Remove unused imports
    treeShaking: true,
    // Optimize for modern browsers
    target: "es2020",
    // Enable JSX optimization
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment"
  },
  // CSS optimization
  css: {
    devSourcemap: mode === "development",
    preprocessorOptions: {
      // Optimize CSS processing
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pbmlzdHJhdG9yXFxcXERlc2t0b3BcXFxcSGVhbHRoXFxcXGhlYWx0aGNvbm5lY3QtcmlkZS0wN1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQWRtaW5pc3RyYXRvclxcXFxEZXNrdG9wXFxcXEhlYWx0aFxcXFxoZWFsdGhjb25uZWN0LXJpZGUtMDdcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0FkbWluaXN0cmF0b3IvRGVza3RvcC9IZWFsdGgvaGVhbHRoY29ubmVjdC1yaWRlLTA3L3ZpdGUuY29uZmlnLnRzXCI7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlL2NsaWVudFwiIC8+XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICAgIC8vIEluIHByb2R1Y3Rpb24sIENPUlMgaXMgaGFuZGxlZCBieSBOZXRsaWZ5XHJcbiAgICBjb3JzOiBtb2RlID09PSAncHJvZHVjdGlvbicgPyBmYWxzZSA6IHtcclxuICAgICAgb3JpZ2luOiBbXHJcbiAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcsXHJcbiAgICAgICAgJ2h0dHBzOi8vZG9rb3RhLm5ldGxpZnkuYXBwJyxcclxuICAgICAgICAnaHR0cHM6Ly8qLm5ldGxpZnkuYXBwJyxcclxuICAgICAgICAnaHR0cHM6Ly90dGh6Y2lqc2NlZGd4amZuZm5reS5zdXBhYmFzZS5jbydcclxuICAgICAgXSxcclxuICAgICAgY3JlZGVudGlhbHM6IHRydWVcclxuICAgIH0sXHJcbiAgICAvLyBPbmx5IHVzZSBwcm94eSBpbiBkZXZlbG9wbWVudFxyXG4gICAgcHJveHk6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/IHVuZGVmaW5lZCA6IHtcclxuICAgICAgJy9hdXRoL3YxJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vdHRoemNpanNjZWRneGpmbmZua3kuc3VwYWJhc2UuY28nLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICByZXdyaXRlOiAocGF0aDogc3RyaW5nKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hdXRoXFwvdjEvLCAnL2F1dGgvdjEnKSxcclxuICAgICAgICBzZWN1cmU6IGZhbHNlXHJcbiAgICAgIH0sXHJcbiAgICAgICcvcmVzdC92MSc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwczovL3R0aHpjaWpzY2VkZ3hqZm5mbmt5LnN1cGFiYXNlLmNvJyxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgcmV3cml0ZTogKHBhdGg6IHN0cmluZykgPT4gcGF0aC5yZXBsYWNlKC9eXFwvcmVzdFxcL3YxLywgJy9yZXN0L3YxJyksXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgLy8gT3B0aW1pemUgSE1SXHJcbiAgICBobXI6IHtcclxuICAgICAgb3ZlcmxheTogZmFsc2UsXHJcbiAgICB9LFxyXG4gICAgLy8gQWRkIHNlY3VyaXR5IGhlYWRlcnNcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnR0VULCBQT1NULCBQVVQsIERFTEVURSwgUEFUQ0gsIE9QVElPTlMnLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdYLVJlcXVlc3RlZC1XaXRoLCBDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiAndHJ1ZSdcclxuICAgIH1cclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmXHJcbiAgICBjb21wb25lbnRUYWdnZXIoKSxcclxuICBdLmZpbHRlcihCb29sZWFuKSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgLy8gSW5jcmVhc2UgdGFyZ2V0IGZvciBiZXR0ZXIgb3B0aW1pemF0aW9uIGFuZCBOZXRsaWZ5IGNvbXBhdGliaWxpdHlcclxuICAgIHRhcmdldDogJ2VzMjAyMCcsXHJcbiAgICAvLyBFbmFibGUgc291cmNlIG1hcHMgZm9yIHByb2R1Y3Rpb24gZGVidWdnaW5nIChvcHRpb25hbClcclxuICAgIHNvdXJjZW1hcDogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyxcclxuICAgIC8vIEVuc3VyZSBjb21wYXRpYmlsaXR5IHdpdGggTmV0bGlmeVxyXG4gICAgb3V0RGlyOiAnZGlzdCcsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIC8vIFNpbXBsaWZpZWQgY2h1bmsgc3BsaXR0aW5nIGZvciBOZXRsaWZ5IGNvbXBhdGliaWxpdHlcclxuICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgICdyZWFjdC12ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXHJcbiAgICAgICAgICAndWktdmVuZG9yJzogWydAcmFkaXgtdWkvcmVhY3Qtc2xvdCcsICdAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJywgJ0ByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51J10sXHJcbiAgICAgICAgICAnc3VwYWJhc2UtdmVuZG9yJzogWydAc3VwYWJhc2Uvc3VwYWJhc2UtanMnLCAnQHN1cGFiYXNlL2F1dGgtaGVscGVycy1yZWFjdCddLFxyXG4gICAgICAgICAgJ3V0aWxzLXZlbmRvcic6IFsnY2xzeCcsICd0YWlsd2luZC1tZXJnZScsICdkYXRlLWZucycsICdsdWNpZGUtcmVhY3QnXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gT3B0aW1pemUgYXNzZXQgbmFtaW5nXHJcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcclxuICAgICAgICAgIGlmICghYXNzZXRJbmZvLm5hbWUpIHJldHVybiBgYXNzZXRzL1tuYW1lXS1baGFzaF1bZXh0bmFtZV1gO1xyXG4gICAgICAgICAgY29uc3QgaW5mbyA9IGFzc2V0SW5mby5uYW1lLnNwbGl0KCcuJyk7XHJcbiAgICAgICAgICBjb25zdCBleHQgPSBpbmZvW2luZm8ubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICBpZiAoL3BuZ3xqcGU/Z3xzdmd8Z2lmfHRpZmZ8Ym1wfGljby9pLnRlc3QoZXh0KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9pbWFnZXMvW25hbWVdLVtoYXNoXVtleHRuYW1lXWA7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoL3dvZmYyP3xlb3R8dHRmfG90Zi9pLnRlc3QoZXh0KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9mb250cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdYDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBgYXNzZXRzL1tuYW1lXS1baGFzaF1bZXh0bmFtZV1gO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvanMvW25hbWVdLVtoYXNoXS5qcycsXHJcbiAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdhc3NldHMvanMvW25hbWVdLVtoYXNoXS5qcycsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgLy8gT3B0aW1pemVkIG1pbmlmaWNhdGlvbiBmb3IgTmV0bGlmeVxyXG4gICAgbWluaWZ5OiAndGVyc2VyJyxcclxuICAgIHRlcnNlck9wdGlvbnM6IHtcclxuICAgICAgY29tcHJlc3M6IHtcclxuICAgICAgICBkcm9wX2NvbnNvbGU6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyxcclxuICAgICAgICBkcm9wX2RlYnVnZ2VyOiBtb2RlID09PSAncHJvZHVjdGlvbicsXHJcbiAgICAgICAgcHVyZV9mdW5jczogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nID8gWydjb25zb2xlLmxvZycsICdjb25zb2xlLmluZm8nXSA6IFtdLFxyXG4gICAgICAgIHBhc3NlczogMSwgLy8gUmVkdWNlZCBwYXNzZXMgZm9yIGZhc3RlciBOZXRsaWZ5IGJ1aWxkc1xyXG4gICAgICB9LFxyXG4gICAgICBtYW5nbGU6IHtcclxuICAgICAgICBzYWZhcmkxMDogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgY29tbWVudHM6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIC8vIE9wdGltaXplIGNodW5rIHNpemVzXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDgwMCxcclxuICAgIC8vIEVuYWJsZSBDU1MgY29kZSBzcGxpdHRpbmdcclxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcclxuICAgIC8vIE9wdGltaXplIGFzc2V0IGlubGluaW5nXHJcbiAgICBhc3NldHNJbmxpbmVMaW1pdDogNDA5NixcclxuICB9LFxyXG4gIC8vIEVuaGFuY2VkIGRlcGVuZGVuY3kgb3B0aW1pemF0aW9uIGZvciBOZXRsaWZ5XHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBpbmNsdWRlOiBbXHJcbiAgICAgICdyZWFjdCcsXHJcbiAgICAgICdyZWFjdC1kb20nLFxyXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbScsXHJcbiAgICAgICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnLFxyXG4gICAgICAnQHN1cGFiYXNlL2F1dGgtaGVscGVycy1yZWFjdCcsXHJcbiAgICAgICdsdWNpZGUtcmVhY3QnLFxyXG4gICAgICAnY2xzeCcsXHJcbiAgICAgICd0YWlsd2luZC1tZXJnZScsXHJcbiAgICAgICdkYXRlLWZucycsXHJcbiAgICAgICdzb25uZXInLFxyXG4gICAgXSxcclxuICAgIGV4Y2x1ZGU6IFtcclxuICAgICAgLy8gRXhjbHVkZSBsYXJnZSBsaWJyYXJpZXMgdGhhdCBzaG91bGQgYmUgbG9hZGVkIG9uIGRlbWFuZFxyXG4gICAgICAnbGVhZmxldCcsXHJcbiAgICAgICdyZWNoYXJ0cycsXHJcbiAgICBdLFxyXG4gICAgZm9yY2U6IHRydWUsIC8vIEZvcmNlIHJlLW9wdGltaXphdGlvbiB0byBmaXggcG90ZW50aWFsIGlzc3Vlc1xyXG4gICAgZXNidWlsZE9wdGlvbnM6IHtcclxuICAgICAgdGFyZ2V0OiAnZXMyMDIwJyxcclxuICAgIH0sXHJcbiAgfSxcclxuICAvLyBFbmFibGUgZXhwZXJpbWVudGFsIGZlYXR1cmVzIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcclxuICBlc2J1aWxkOiB7XHJcbiAgICAvLyBSZW1vdmUgdW51c2VkIGltcG9ydHNcclxuICAgIHRyZWVTaGFraW5nOiB0cnVlLFxyXG4gICAgLy8gT3B0aW1pemUgZm9yIG1vZGVybiBicm93c2Vyc1xyXG4gICAgdGFyZ2V0OiAnZXMyMDIwJyxcclxuICAgIC8vIEVuYWJsZSBKU1ggb3B0aW1pemF0aW9uXHJcbiAgICBqc3hGYWN0b3J5OiAnUmVhY3QuY3JlYXRlRWxlbWVudCcsXHJcbiAgICBqc3hGcmFnbWVudDogJ1JlYWN0LkZyYWdtZW50JyxcclxuICB9LFxyXG4gIC8vIENTUyBvcHRpbWl6YXRpb25cclxuICBjc3M6IHtcclxuICAgIGRldlNvdXJjZW1hcDogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyxcclxuICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcclxuICAgICAgLy8gT3B0aW1pemUgQ1NTIHByb2Nlc3NpbmdcclxuICAgIH0sXHJcbiAgfSxcclxufSkpO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQ0EsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUpoQyxJQUFNLG1DQUFtQztBQVN6QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQTtBQUFBLElBRU4sTUFBTSxTQUFTLGVBQWUsUUFBUTtBQUFBLE1BQ3BDLFFBQVE7QUFBQSxRQUNOO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLE1BQ0EsYUFBYTtBQUFBLElBQ2Y7QUFBQTtBQUFBLElBRUEsT0FBTyxTQUFTLGVBQWUsU0FBWTtBQUFBLE1BQ3pDLFlBQVk7QUFBQSxRQUNWLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQ0EsVUFBaUJBLE1BQUssUUFBUSxlQUFlLFVBQVU7QUFBQSxRQUNqRSxRQUFRO0FBQUEsTUFDVjtBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1YsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDQSxVQUFpQkEsTUFBSyxRQUFRLGVBQWUsVUFBVTtBQUFBLFFBQ2pF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
