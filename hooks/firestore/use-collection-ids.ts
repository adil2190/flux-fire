"use client"

import { useQuery } from "@tanstack/react-query"
import { useFirestoreSession } from "./use-firestore-session"
import { encodePath } from "@/lib/firestore/paths"

interface ListCollectionIdsResponse {
  collectionIds?: string[]
  nextPageToken?: string
}

export function useCollectionIds(parentDocPath?: string) {
  const { client, ready, projectId } = useFirestoreSession()

  return useQuery({
    queryKey: ["firestore", projectId, "collectionIds", parentDocPath ?? "__root__"],
    enabled: ready,
    queryFn: async () => {
      if (!client) throw new Error("Firestore client not ready")
      const path = parentDocPath
        ? `${encodePath(parentDocPath)}:listCollectionIds`
        : ":listCollectionIds"
      const collectionIds: string[] = []
      let pageToken: string | undefined
      do {
        const res: ListCollectionIdsResponse = await client.request("POST", path, {
          body: { pageSize: 1000, pageToken },
        })
        if (res.collectionIds) collectionIds.push(...res.collectionIds)
        pageToken = res.nextPageToken
      } while (pageToken)
      return collectionIds.sort()
    },
  })
}
