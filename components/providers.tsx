"use client"

import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { ThemeProvider, useTheme } from "next-themes"
import { useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            gcTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="fluxfire-theme"
    >
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={300}>
            {children}
            <ThemedToaster />
          </TooltipProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}

function ThemedToaster() {
  const { theme } = useTheme()

  return (
    <Toaster
      position="bottom-right"
      theme={theme === "light" || theme === "dark" ? theme : "system"}
      richColors
      closeButton
    />
  )
}
