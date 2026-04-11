import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Bootstrap base (grid, reboot, utilities) — loaded first so existing CSS can override
import 'bootstrap/dist/css/bootstrap.min.css';
// Tailwind layers — tw- prefixed utilities come after Bootstrap
import './styles/tailwind.css';
import './index.css';
import App from './App';

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);