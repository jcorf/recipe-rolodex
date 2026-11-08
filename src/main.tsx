import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/la-belle-aurore';
import '@fontsource/zeyada';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/500.css';
import '@fontsource/mukta-malar/300.css';
import '@fontsource/mukta-malar/400.css';
import '@fontsource/mukta-malar/500.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Works offline once visited (the built site only: in development it would hold on to old code).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* still works online */ });
  });
}
