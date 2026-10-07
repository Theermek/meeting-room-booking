"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api/http";

export function Providers({ children }: { children: ReactNode }) {
  // Created in state so each browser session gets exactly one client, and it is never
  // shared between requests on the server.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Bookings are shared state that another person can change at any moment, so
            // the cache is never treated as fresh.
            staleTime: 0,
            refetchOnWindowFocus: true,
            retry: (failureCount, error) => {
              // Retrying a 4xx just repeats the same rejection; only transport and server
              // faults are worth a second attempt.
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
