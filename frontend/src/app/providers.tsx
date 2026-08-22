import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { ToastProvider } from '../components/feedback/ToastProvider';
import { queryClient } from './query-client';

export function AppProviders({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}><ToastProvider>{children}</ToastProvider></QueryClientProvider>;
}
