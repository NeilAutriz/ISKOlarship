// ============================================================================
// ISKOlarship - Application Entry Point
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// ============================================================================
// CRITICAL: Suppress browser extension errors (content_script.js)
// The "deref" error comes from browser extensions (React DevTools, etc.)
// using WeakRefs that get garbage collected when components unmount.
// This is NOT an application bug - it's an extension compatibility issue.
// ============================================================================

// Store original console.error to filter extension errors
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const errorString = args.join(' ');
  // Suppress extension-related errors
  if (
    errorString.includes('deref') ||
    errorString.includes('content_script') ||
    errorString.includes('WeakRef') ||
    errorString.includes('MutationObserver')
  ) {
    return; // Silently ignore
  }
  originalConsoleError.apply(console, args);
};

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  // Suppress errors from browser extensions
  if (
    event.message?.includes('deref') ||
    event.message?.includes('reading \'deref\'') ||
    event.message?.includes('null') && event.filename?.includes('content_script') ||
    event.error?.stack?.includes('content_script.js') ||
    event.filename?.includes('content_script.js') ||
    event.filename?.includes('extension') ||
    event.filename?.includes('chrome-extension')
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
}, true); // Use capture phase to catch early

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Don't log axios timeout errors
  if (event.reason?.code === 'ECONNABORTED' || event.reason?.message?.includes('timeout')) {
    event.preventDefault();
    return;
  }
  // Don't log extension errors
  if (event.reason?.message?.includes('deref') || event.reason?.stack?.includes('content_script')) {
    event.preventDefault();
    return;
  }
});

// React 18 createRoot API
// NOTE: Removed StrictMode to prevent double-mounting that triggers extension bugs
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);