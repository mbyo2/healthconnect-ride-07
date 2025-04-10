
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

// Register the service worker for offline capabilities and push notifications
registerServiceWorker().then((registration) => {
  if (registration) {
    console.info('ServiceWorker registration successful');
    
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>,
);
