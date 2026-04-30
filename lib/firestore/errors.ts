import type { FirestoreErrorBody } from "@/types/firestore"

export class FirestoreError extends Error {
  status: string
  httpStatus: number
  indexUrl?: string
  raw: unknown

  constructor(
    message: string,
    opts: { status: string; httpStatus: number; indexUrl?: string; raw?: unknown }
  ) {
    super(message)
    this.name = "FirestoreError"
    this.status = opts.status
    this.httpStatus = opts.httpStatus
    this.indexUrl = opts.indexUrl
    this.raw = opts.raw
  }
}

const INDEX_URL_RE =
  /https:\/\/console\.(?:firebase|cloud)\.google\.com\/[^\s")]*create_composite=[A-Za-z0-9_-]+/

export function parseFirestoreError(
  httpStatus: number,
  body: unknown
): FirestoreError {
  let status = "UNKNOWN"
  let message = "Firestore request failed"
  let indexUrl: string | undefined

  const errorObj =
    body && typeof body === "object" && "error" in body
      ? (body as { error: FirestoreErrorBody }).error
      : undefined

  if (errorObj) {
    if (typeof errorObj.status === "string") status = errorObj.status
    if (typeof errorObj.message === "string") {
      message = errorObj.message
      const match = errorObj.message.match(INDEX_URL_RE)
      if (match) indexUrl = match[0]
    }
  } else if (typeof body === "string") {
    message = body
  }

  return new FirestoreError(message, {
    status,
    httpStatus,
    indexUrl,
    raw: body,
  })
}

export function isPermissionDenied(err: unknown): boolean {
  return err instanceof FirestoreError && err.status === "PERMISSION_DENIED"
}

export function isMissingIndex(err: unknown): boolean {
  return err instanceof FirestoreError && !!err.indexUrl
}
