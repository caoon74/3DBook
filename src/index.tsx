
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for offline support
try {
  registerSW({ immediate: true });
} catch (e) {
  console.warn('PWA registration failed:', e);
}

// Global error handler for easier debugging on GitHub Pages
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global Error:', message, error);
  const root = document.getElementById('root');
  if (root && root.innerHTML.includes('Initializing')) {
    root.innerHTML = `<div style="padding: 20px; color: #ef4444; font-family: sans-serif; text-align: center;">
      <h2 style="margin-bottom: 10px;">Startup Error</h2>
      <p style="font-size: 14px; opacity: 0.8;">${message}</p>
      <button onclick="location.reload()" style="margin-top: 20px; padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer;">Retry</button>
    </div>`;
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
