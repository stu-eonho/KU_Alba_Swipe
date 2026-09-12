/**
 * OWNER: Dev B (screens)
 *
 * Provider order is fixed:
 *   QueryClientProvider -> AuthProvider -> ToastProvider -> App(RouterProvider)
 *
 * AuthProvider must be INSIDE QueryClientProvider so logout can clear the query cache.
 * ToastProvider is INSIDE AuthProvider so auth failures can raise a toast.
 * Do not reorder.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/components/ui';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
