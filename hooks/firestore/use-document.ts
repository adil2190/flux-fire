"use client"

import { useQuery } from "@tanstack/react-query"
import { useFirestoreSession } from "./use-firestore-session"
import { decodeDocument } from "@/lib/firestore/encoding"
import { encodePath } from "@/lib/firestore/paths"
import type { FirestoreDocument } from "@/types/firestore"

export function useDocument(docPath: string | undefined) {
  const { client, ready, projectId } = useFirestoreSession()

  return useQuery<FirestoreDocument>({
    queryKey: ["firestore", projectId, "doc", docPath],
    enabled: ready && !!docPath,
    queryFn: async () => {
      if (!client || !docPath) throw new Error("Firestore client not ready")
      const wire = await client.request<Parameters<typeof decodeDocument>[0]>(
        "GET",
        encodePath(docPath)
      )
      return decodeDocument(wire)
    },
  })
}
