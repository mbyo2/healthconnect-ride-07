
import * as React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import './App.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from './hooks/use-theme';
import { LoadingScreen } from './components/LoadingScreen';
import { ErrorBoundary } from './components/ui/error-boundary';

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    appLoaded?: boolean;
  }
}

// Add a global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  if (import.meta.env.DEV) {
    console.error('Uncaught error:', event.error);
  }

  const rootElement = document.getElementById('root');
  // Only render fallback if nothing has been rendered yet
  if (rootElement && !rootElement.hasChildNodes() && !window.appLoaded) {
    renderErrorFallback(rootElement, event.error);
  }
});

// Helper to render error fallback
function renderErrorFallback(rootElement: HTMLElement, error?: Error) {
  // Clear root element first
  rootElement.innerHTML = '';

  const errorDiv = document.createElement('div');
  errorDiv.style.padding = '20px';
  errorDiv.style.maxWidth = '600px';
  errorDiv.style.margin = '100px auto';
  errorDiv.style.textAlign = 'center';
  errorDiv.style.fontFamily = 'system-ui, sans-serif';

  errorDiv.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
      <div style="width: 48px; height: 48px; background: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">D0C</div>
      <h2 style="margin: 0; color: #1E40AF;">Doc' O Clock</h2>
      <p style="margin: 0; color: #e11d48; font-weight: 600;">System Initialization Failed</p>
      <p style="margin: 0; color: #4b5563;">We encountered a problem while loading the application. This might be due to a temporary connection issue.</p>
      
      <div style="display: flex; gap: 12px; width: 100%; margin-top: 8px;">
        <button id="refresh-btn" style="flex: 1; background: #3B82F6; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
          Try Again
        </button>
        <button id="clear-btn" style="flex: 1; background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
          Clear Cache
        </button>
      </div>
      
      ${error ? `<details style="margin-top: 16px; text-align: left; width: 100%;"><summary style="font-size: 12px; color: #9ca3af; cursor: pointer;">Error details</summary><pre style="font-size: 10px; color: #ef4444; overflow: auto; margin-top: 8px; background: #f9fafb; padding: 8px; border-radius: 4px; max-height: 150px;">${error.message}\n${error.stack || ''}</pre></details>` : ''}
    </div>
  `;

  rootElement.appendChild(errorDiv);

  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('clear-btn')?.addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  });
}

// Create an instance of the query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

// Initialize service worker if available (compatible with Netlify)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        if (import.meta.env.DEV) {
          console.info('ServiceWorker registration successful with scope:', registration.scope);
        }
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.log('ServiceWorker registration failed:', error);
        }
      });
  });
}

// Add offline/online event listeners
window.addEventListener('online', () => {
  if (import.meta.env.DEV) {
    console.log('App is online');
  }
  document.dispatchEvent(new CustomEvent('app:online'));
});

window.addEventListener('offline', () => {
  if (import.meta.env.DEV) {
    console.log('App is offline');
  }
  document.dispatchEvent(new CustomEvent('app:offline'));
});

// Track render state globally to avoid re-rendering issues
let hasRendered = false;

// Simplified function to render the app
function renderApp() {
  try {
    if (hasRendered) return;

    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error("Root element not found!");
      return;
    }

    // Clear any existing content
    rootElement.innerHTML = '';

    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingScreen message="Loading Doc' O Clock..." />}>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider defaultTheme="light" storageKey="doc-oclock-theme">
                <App />
                <Toaster position="top-right" richColors closeButton />
              </ThemeProvider>
            </QueryClientProvider>
          </React.Suspense>
        </ErrorBoundary>
      </React.StrictMode>
    );

    hasRendered = true;
    if (import.meta.env.DEV) {
      console.log("Doc' O Clock rendered successfully");
    }
    window.appLoaded = true;
  } catch (error) {
    console.error("Failed to render app:", error);
    const rootElement = document.getElementById('root');
    if (rootElement) renderErrorFallback(rootElement);
  }
}

// Simplified loading - let React handle the loading screen

// Render immediately if the DOM is ready, otherwise wait for it
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}

// Safeguard against potential failures to render
// Only attempt ONE re-render after a longer delay
setTimeout(() => {
  if (!window.appLoaded && !hasRendered) {
    if (import.meta.env.DEV) {
      console.warn('App may not have loaded properly, attempting one-time re-render');
    }
    renderApp();
  }
}, 5000);
