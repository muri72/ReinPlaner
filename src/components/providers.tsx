"use client";

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { ImpersonationProviderWrapper } from '@/components/impersonation-provider-wrapper';
import { UserProfileProvider } from '@/components/user-profile-provider';
import { UnsavedChangesProvider } from '@/components/ui/unsaved-changes-context';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance once and reuse it
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data stays fresh for 5 minutes
            staleTime: 1000 * 60 * 5,
            // Keep data in cache for 10 minutes
            gcTime: 1000 * 60 * 10,
            // Retry failed requests 3 times
            retry: 3,
            // Don't refetch on window focus (reduces unnecessary requests)
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect (user might be offline)
            refetchOnReconnect: false,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ImpersonationProviderWrapper>
          <UserProfileProvider>
            <UnsavedChangesProvider>
              {children}
            </UnsavedChangesProvider>
          </UserProfileProvider>
        </ImpersonationProviderWrapper>
        <Toaster />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
