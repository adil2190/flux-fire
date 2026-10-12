"use client"

import { FirestoreError, isPermissionDenied } from "@/lib/firestore/errors"
import { IndexRequiredBanner, PermissionDeniedBanner } from "./scope-banner"

/** Shows the right notice for a failed Firestore read; renders nothing without an error. */
export function FirestoreErrorNotice({ error }: { error: unknown }) {
  if (!error) return null

  if (error instanceof FirestoreError) {
    if (isPermissionDenied(error)) {
      return (
        <div className="border-b px-4 py-2">
          <PermissionDeniedBanner message={error.message} />
        </div>
      )
    }
    if (error.indexUrl) {
      return (
        <div className="border-b px-4 py-2">
          <IndexRequiredBanner indexUrl={error.indexUrl} />
        </div>
      )
    }
  }

  return (
    <div role="alert" className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
      {error instanceof Error ? error.message : "Something went wrong. Try again."}
    </div>
  )
}
