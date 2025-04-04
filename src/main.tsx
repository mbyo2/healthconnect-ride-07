
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import './App.css';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './hooks/use-theme';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { registerServiceWorker } from './utils/service-worker';

// Create a client
const queryClient = new QueryClient();

// Register the service worker for offline capabilities and push notifications
registerServiceWorker().then((registration) => {
  if (registration) {
    console.info('ServiceWorker registration successful');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="doc-oclock-theme">
        <AccessibilityProvider>
          <BrowserRouter>
            <App />
            <Toaster />
          </BrowserRouter>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
