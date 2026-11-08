import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/la-belle-aurore';
import '@fontsource/zeyada';
import '@fontsource/figtree/300.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
