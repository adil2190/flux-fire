"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useProjectStore } from "@/stores/project-store"
import { createFirestoreClient, type FirestoreClient } from "@/lib/firestore/client"

interface FirestoreSession {
  client: FirestoreClient | null
  ready: boolean
  reason?: "no-session" | "no-token" | "no-project" | "token-error"
  projectId?: string
  scopeError: boolean
}

export function useFirestoreSession(): FirestoreSession {
  const { data: session, status } = useSession()
  const qc = useQueryClient()
  const projectId = useProjectStore((s) => s.selectedProject?.projectId)

  // next-auth replaces the session object on every refetch (e.g. each window
  // focus), so memoize on the fields we use to keep the client stable.
  const hasSession = !!session
  const tokenError = session?.error === "RefreshAccessTokenError"
  const accessToken = session?.accessToken

  return useMemo<FirestoreSession>(() => {
    if (status === "loading") return { client: null, ready: false, scopeError: false }
    if (!hasSession) return { client: null, ready: false, reason: "no-session", scopeError: false }
    if (tokenError) {
      return { client: null, ready: false, reason: "token-error", scopeError: true }
    }
    if (!accessToken) {
      return { client: null, ready: false, reason: "no-token", scopeError: false }
    }
    if (!projectId) {
      return { client: null, ready: false, reason: "no-project", scopeError: false }
    }

    const client = createFirestoreClient({
      token: accessToken,
      projectId,
      onPermissionDenied: () => {
        void qc.invalidateQueries({
          queryKey: ["firebase-project-access", projectId],
        })
      },
    })

    return {
      client,
      ready: true,
      projectId,
      scopeError: false,
    }
  }, [status, hasSession, tokenError, accessToken, projectId, qc])
}
