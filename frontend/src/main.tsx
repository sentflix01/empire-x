// @ts-nocheck
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
import { initGoogleSignIn, signInWithGoogle } from '@/lib/googleAuth';
import '@/lib/i18n';
import { registerSW } from '@/lib/push';

// Initialise Google Sign-In once the GSI script has loaded
if (document.readyState === 'complete') {
  initGoogleSignIn();
} else {
  window.addEventListener('load', initGoogleSignIn);
}

// Expose globally for use by auth.loginWithProvider('google')
window.__googleSignIn = signInWithGoogle;

// Register service worker for PWA + push notifications
window.addEventListener('load', () => { registerSW(); });

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);

