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
  const selectedProject = useProjectStore((s) => s.selectedProject)
  const useEmulator = useProjectStore((s) => s.useEmulator)
  const emulatorPorts = useProjectStore((s) => s.emulatorPorts)

  return useMemo<FirestoreSession>(() => {
    if (status === "loading") return { client: null, ready: false, scopeError: false }
    if (!session) return { client: null, ready: false, reason: "no-session", scopeError: false }
    if (session.error === "RefreshAccessTokenError") {
      return { client: null, ready: false, reason: "token-error", scopeError: true }
    }
    if (!session.accessToken) {
      return { client: null, ready: false, reason: "no-token", scopeError: false }
    }
    if (!selectedProject) {
      return { client: null, ready: false, reason: "no-project", scopeError: false }
    }

    const client = createFirestoreClient({
      token: session.accessToken,
      projectId: selectedProject.projectId,
      emulator: useEmulator
        ? { host: "localhost", port: emulatorPorts.firestore }
        : undefined,
      onPermissionDenied: () => {
        void qc.invalidateQueries({
          queryKey: ["firebase-project-access", selectedProject.projectId],
        })
      },
    })

    return {
      client,
      ready: true,
      projectId: selectedProject.projectId,
      scopeError: false,
    }
  }, [
    session,
    status,
    selectedProject,
    useEmulator,
    emulatorPorts.firestore,
    qc,
  ])
}
