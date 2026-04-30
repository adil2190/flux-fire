"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useFirestoreSession } from "./use-firestore-session"
import { buildStructuredQuery } from "@/lib/firestore/queries"
import { decodeDocument } from "@/lib/firestore/encoding"
import { encodePath } from "@/lib/firestore/paths"
import type { FirestoreDocument, QueryState } from "@/types/firestore"

interface RunQueryResponseRow {
  document?: {
    name: string
    fields?: Record<string, unknown>
    createTime?: string
    updateTime?: string
  }
  readTime?: string
  skippedResults?: number
}

export function useRunQuery(state: QueryState | null) {
  const { client, ready, projectId } = useFirestoreSession()

  return useQuery<FirestoreDocument[]>({
    queryKey: ["firestore", projectId, "query", state],
    enabled: ready && !!state,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!client || !state) throw new Error("Firestore client not ready")
      const body = buildStructuredQuery(state)
      const path = state.parentDoc
        ? `${encodePath(state.parentDoc)}:runQuery`
        : ":runQuery"
      const rows: RunQueryResponseRow[] = await client.request("POST", path, { body })
      return rows
        .filter((r) => r.document)
        .map((r) => decodeDocument(r.document as Parameters<typeof decodeDocument>[0]))
    },
  })
}
