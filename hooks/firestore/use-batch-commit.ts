"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useFirestoreSession } from "./use-firestore-session"
import { documentResourceName } from "@/lib/firestore/paths"

export type BatchWrite =
  | { kind: "delete"; path: string }
  | { kind: "update"; path: string; fields: Record<string, unknown>; updateMask?: string[] }

interface CommitInput {
  writes: BatchWrite[]
  onProgress?: (done: number, total: number) => void
}

interface CommitResult {
  succeeded: number
  failed: { write: BatchWrite; error: unknown }[]
}

const CHUNK_SIZE = 500

export function useBatchCommit() {
  const { client, projectId } = useFirestoreSession()
  const qc = useQueryClient()

  return useMutation<CommitResult, Error, CommitInput>({
    mutationFn: async ({ writes, onProgress }) => {
      if (!client) throw new Error("Firestore client not ready")
      let succeeded = 0
      const failed: CommitResult["failed"] = []

      for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
        const chunk = writes.slice(i, i + CHUNK_SIZE)
        const wireWrites = chunk.map((w) => writeToWire(w, client.projectId, client.databaseId))
        try {
          await client.request("POST", ":commit", { body: { writes: wireWrites } })
          succeeded += chunk.length
        } catch (err) {
          for (const w of chunk) failed.push({ write: w, error: err })
        }
        onProgress?.(Math.min(i + chunk.length, writes.length), writes.length)
      }

      return { succeeded, failed }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["firestore", projectId] })
    },
  })
}

function writeToWire(
  w: BatchWrite,
  projectId: string,
  databaseId: string
): Record<string, unknown> {
  const name = documentResourceName(projectId, databaseId, w.path)
  if (w.kind === "delete") return { delete: name }
  return {
    update: { name, fields: w.fields },
    updateMask: w.updateMask?.length ? { fieldPaths: w.updateMask } : undefined,
  }
}
