
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('LuminaBook: index.tsx loaded');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('LuminaBook: Could not find root element');
  throw new Error("Could not find root element to mount to");
}

console.log('LuminaBook: Mounting app...');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log('LuminaBook: Render called');
