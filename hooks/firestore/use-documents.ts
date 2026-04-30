"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useFirestoreSession } from "./use-firestore-session"
import { decodeDocument } from "@/lib/firestore/encoding"
import { encodePath } from "@/lib/firestore/paths"
import type { ListPage } from "@/types/firestore"

interface ListDocumentsResponse {
  documents?: Array<{
    name: string
    fields?: Record<string, unknown>
    createTime?: string
    updateTime?: string
  }>
  nextPageToken?: string
}

export function useDocuments(
  collectionPath: string | undefined,
  options: { pageSize?: number; pageToken?: string; orderBy?: string } = {}
) {
  const { client, ready, projectId } = useFirestoreSession()
  const pageSize = options.pageSize ?? 50

  return useQuery<ListPage>({
    queryKey: [
      "firestore",
      projectId,
      "browse",
      collectionPath,
      options.pageToken ?? null,
      pageSize,
      options.orderBy ?? null,
    ],
    enabled: ready && !!collectionPath,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!client || !collectionPath) throw new Error("Firestore client not ready")
      const res: ListDocumentsResponse = await client.request(
        "GET",
        encodePath(collectionPath),
        {
          query: {
            pageSize,
            pageToken: options.pageToken,
            orderBy: options.orderBy,
          },
        }
      )
      const documents = (res.documents ?? []).map((d) =>
        decodeDocument(d as Parameters<typeof decodeDocument>[0])
      )
      return { documents, nextPageToken: res.nextPageToken }
    },
  })
}
