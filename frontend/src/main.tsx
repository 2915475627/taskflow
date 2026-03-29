import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { Routes } from './routes';
import './index.css';

// MSW disabled - using real backend API
// To enable mocking: set VITE_MOCK_ENABLED=true
async function enableMocking() {
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_ENABLED === 'true') {
    const { worker } = await import('./mocks');
    return worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
      <Routes />
    </React.StrictMode>
  );
});
