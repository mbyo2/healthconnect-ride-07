
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

// Add a global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  
  // Display user-friendly error message if the app hasn't loaded yet
  const rootElement = document.getElementById('root');
  if (rootElement && !rootElement.hasChildNodes()) {
    renderErrorFallback(rootElement);
  }
});

// Helper to render error fallback
function renderErrorFallback(rootElement) {
  const errorDiv = document.createElement('div');
  errorDiv.style.padding = '20px';
  errorDiv.style.maxWidth = '600px';
  errorDiv.style.margin = '100px auto';
  errorDiv.style.textAlign = 'center';
  errorDiv.style.fontFamily = 'system-ui, sans-serif';
  
  errorDiv.innerHTML = `
    <h2 style="margin-bottom: 16px; color: #e11d48;">Unable to load application</h2>
    <p style="margin-bottom: 16px;">We encountered a problem while loading Doc' O Clock. Please try refreshing the page.</p>
    <button id="refresh-btn" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
      Refresh Page
    </button>
  `;
  
  rootElement.appendChild(errorDiv);
  
  document.getElementById('refresh-btn').addEventListener('click', () => {
    window.location.reload();
  });
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
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

// Function to ensure the app actually renders
function renderApp() {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error("Root element not found!");
      return;
    }
    
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingScreen />}>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider defaultTheme="light" storageKey="doc-oclock-theme">
                <AccessibilityProvider>
                  <AuthProvider>
                    <BrowserRouter>
                      <App />
                      <Toaster position="top-right" richColors closeButton />
                    </BrowserRouter>
                  </AuthProvider>
                </AccessibilityProvider>
              </ThemeProvider>
            </QueryClientProvider>
          </React.Suspense>
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log("App rendered successfully");
  } catch (error) {
    console.error("Failed to render app:", error);
    const rootElement = document.getElementById('root');
    if (rootElement) renderErrorFallback(rootElement);
  }
}

// Give a small delay to ensure DOM is fully ready
setTimeout(renderApp, 0);
