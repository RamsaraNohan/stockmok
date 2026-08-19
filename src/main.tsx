import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppRouter } from '@/app/router';
import '@/styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Stockmok root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
