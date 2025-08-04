
import * as React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import './App.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from './hooks/use-theme';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { registerServiceWorker } from './utils/service-worker';
import { AuthProvider } from './context/AuthContext';
import { initializeMobileFeatures, isNativeMobile } from './utils/mobile/mobile-config';
import { initAnalytics } from './utils/analytics-service';
import { initErrorLogging } from './utils/error-logging-service';
import { ErrorBoundary } from './components/ui/error-boundary';
import { LoadingScreen } from './components/LoadingScreen';
import { GlobalErrorHandler } from './components/ui/global-error-handler';

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    appLoaded?: boolean;
  }
}

// Add a global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  
  const rootElement = document.getElementById('root');
  if (rootElement && !rootElement.hasChildNodes()) {
    renderErrorFallback(rootElement);
  }
});

// Helper to render error fallback
function renderErrorFallback(rootElement: HTMLElement) {
  const errorDiv = document.createElement('div');
  errorDiv.style.padding = '20px';
  errorDiv.style.maxWidth = '600px';
  errorDiv.style.margin = '100px auto';
  errorDiv.style.textAlign = 'center';
  errorDiv.style.fontFamily = 'system-ui, sans-serif';
  
  errorDiv.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
      <div style="width: 48px; height: 48px; background: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">D0C</div>
      <h2 style="margin: 0; color: #1E40AF;">Doc' O Clock</h2>
      <p style="margin: 0; color: #e11d48;">Unable to load emergency system</p>
      <p style="margin: 0;">We encountered a problem while loading Doc' O Clock. Please try refreshing the page.</p>
      <button id="refresh-btn" style="background: #3B82F6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
        Refresh System
      </button>
    </div>
  `;
  
  rootElement.appendChild(errorDiv);
  
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
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

// Initialize analytics and error logging
initAnalytics({ debug: import.meta.env.DEV });
initErrorLogging({ debug: import.meta.env.DEV });

// Initialize mobile features if running in a native container
if (isNativeMobile()) {
  initializeMobileFeatures().catch(console.error);
}

// Register the service worker for offline capabilities and push notifications
registerServiceWorker().then((registration) => {
  if (registration) {
    console.info('ServiceWorker registration successful with scope:', registration.scope);
    
    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 1000 * 60 * 60); // Check for updates every hour
  }
});

// Add offline/online event listeners
window.addEventListener('online', () => {
  console.log('App is online');
  document.dispatchEvent(new CustomEvent('app:online'));
});

window.addEventListener('offline', () => {
  console.log('App is offline');
  document.dispatchEvent(new CustomEvent('app:offline'));
});

// Track render state globally to avoid re-rendering issues
let hasRendered = false;

// Function to ensure the app actually renders with enhanced loading for emergency systems
function renderApp() {
  try {
    if (hasRendered) return;
    
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error("Root element not found!");
      return;
    }
    
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <GlobalErrorHandler>
          <ErrorBoundary>
            <React.Suspense fallback={<LoadingScreen message="Initializing emergency healthcare system..." />}>
              <QueryClientProvider client={queryClient}>
                <ThemeProvider defaultTheme="light" storageKey="doc-oclock-theme">
                  <AccessibilityProvider>
                    <App />
                    <Toaster position="top-right" richColors closeButton />
                  </AccessibilityProvider>
                </ThemeProvider>
              </QueryClientProvider>
            </React.Suspense>
          </ErrorBoundary>
        </GlobalErrorHandler>
      </React.StrictMode>
    );
    
    hasRendered = true;
    console.log("Doc' O Clock emergency system rendered successfully");
    window.appLoaded = true;
  } catch (error) {
    console.error("Failed to render emergency system:", error);
    const rootElement = document.getElementById('root');
    if (rootElement) renderErrorFallback(rootElement);
  }
}

// Show loading screen immediately for emergency preparedness
const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.innerHTML = `
    <div style="position: fixed; inset: 0; background: linear-gradient(135deg, #EBF4FF 0%, #DBEAFE 100%); display: flex; align-items: center; justify-content: center; z-index: 9999;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 32px; border-radius: 12px; background: rgba(255,255,255,0.8); backdrop-filter: blur(8px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); text-align: center;">
        <div style="width: 64px; height: 64px; background: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; box-shadow: 0 4px 12px rgba(59,130,246,0.3);">D0C</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #1E40AF;">Doc' O Clock</h1>
        <div style="width: 32px; height: 32px; border: 3px solid #DBEAFE; border-top: 3px solid #3B82F6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin: 0; color: #3730A3; font-weight: 500;">Initializing emergency healthcare system...</p>
        <p style="margin: 0; color: #64748B; font-size: 14px;">Preparing for emergency care situations</p>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
      </div>
    </div>
  `;
}

// Render immediately if the DOM is ready, otherwise wait for it with a longer delay for emergency systems
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderApp, 2000); // 2 second delay for emergency preparedness
  });
} else {
  setTimeout(renderApp, 2000); // 2 second delay for emergency preparedness
}

// Safeguard against potential failures to render with longer timeout for emergency systems
setTimeout(() => {
  if (!window.appLoaded) {
    console.warn('Emergency system may not have loaded properly, attempting re-render');
    hasRendered = false;
    renderApp();
  }
}, 8000); // Extended timeout for emergency systems
