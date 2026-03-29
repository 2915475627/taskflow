import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { Routes } from './routes';
import './index.css';

// Initialize MSW in development
async function enableMocking() {
  if (import.meta.env.DEV) {
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
