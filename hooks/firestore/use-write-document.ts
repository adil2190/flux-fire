"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useFirestoreSession } from "./use-firestore-session"
import { encodeFields, decodeDocument } from "@/lib/firestore/encoding"
import { encodePath, parentCollection } from "@/lib/firestore/paths"
import type { FieldValue, FirestoreDocument } from "@/types/firestore"

interface WriteDocumentInput {
  path: string
  fields: Record<string, FieldValue>
  mode: "patch" | "replace" | "create"
  updateMask?: string[]
}

interface WireDocumentResult {
  name: string
  fields?: Record<string, unknown>
  createTime?: string
  updateTime?: string
}

export function useWriteDocument() {
  const { client, projectId } = useFirestoreSession()
  const qc = useQueryClient()

  return useMutation<FirestoreDocument, Error, WriteDocumentInput>({
    mutationFn: async (input) => {
      if (!client) throw new Error("Firestore client not ready")
      const query: Record<string, string | string[] | boolean | undefined> = {}
      if (input.mode === "patch" && input.updateMask?.length) {
        query["updateMask.fieldPaths"] = input.updateMask
      }
      if (input.mode === "create") {
        query["currentDocument.exists"] = false
      }
      const wire = await client.request<WireDocumentResult>(
        "PATCH",
        encodePath(input.path),
        {
          query,
          body: { fields: encodeFields(input.fields) },
        }
      )
      return decodeDocument(wire as Parameters<typeof decodeDocument>[0])
    },
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: ["firestore", projectId, "doc", input.path] })
      const collPath = parentCollection(input.path)
      if (collPath) {
        qc.invalidateQueries({ queryKey: ["firestore", projectId, "browse", collPath] })
      }
      qc.invalidateQueries({ queryKey: ["firestore", projectId, "query"] })
    },
  })
}
