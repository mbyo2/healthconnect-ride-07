
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './App.css';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './hooks/use-theme';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { registerServiceWorker } from './utils/service-worker';

// Register the service worker for offline capabilities and push notifications
registerServiceWorker().then((registration) => {
  if (registration) {
    console.info('ServiceWorker registration successful');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="dokotela-theme">
      <AccessibilityProvider>
        <BrowserRouter>
          <App />
          <Toaster />
        </BrowserRouter>
      </AccessibilityProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
