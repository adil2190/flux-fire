"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useFirestoreSession } from "./use-firestore-session"
import { encodePath, parentCollection } from "@/lib/firestore/paths"

export function useDeleteDocument() {
  const { client, projectId } = useFirestoreSession()
  const qc = useQueryClient()

  return useMutation<void, Error, { path: string }>({
    mutationFn: async ({ path }) => {
      if (!client) throw new Error("Firestore client not ready")
      await client.request<void>("DELETE", encodePath(path))
    },
    onSuccess: (_, { path }) => {
      qc.invalidateQueries({ queryKey: ["firestore", projectId, "doc", path] })
      const collPath = parentCollection(path)
      if (collPath) {
        qc.invalidateQueries({ queryKey: ["firestore", projectId, "browse", collPath] })
      }
      qc.invalidateQueries({ queryKey: ["firestore", projectId, "query"] })
    },
  })
}
