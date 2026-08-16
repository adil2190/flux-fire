import { parseFirestoreError } from "./errors"
import { encodePath } from "./paths"

export interface FirestoreClientOptions {
  token: string
  projectId: string
  databaseId?: string
  emulator?: { host: string; port: number }
  onPermissionDenied?: () => void
}

export interface FirestoreClient {
  projectId: string
  databaseId: string
  baseUrl: string
  documentsUrl: string
  request: <T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    init?: FirestoreRequestInit
  ) => Promise<T>
}

export interface FirestoreRequestInit {
  query?: Record<string, string | number | boolean | string[] | undefined>
  body?: unknown
}

export function createFirestoreClient(opts: FirestoreClientOptions): FirestoreClient {
  const databaseId = opts.databaseId ?? "(default)"
  const origin = opts.emulator
    ? `http://${opts.emulator.host}:${opts.emulator.port}`
    : "https://firestore.googleapis.com"
  const baseUrl = `${origin}/v1/projects/${opts.projectId}/databases/${encodeURIComponent(
    databaseId
  )}`
  const documentsUrl = `${baseUrl}/documents`

  async function request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    init?: FirestoreRequestInit
  ): Promise<T> {
    const url = new URL(buildUrl(documentsUrl, path))
    if (init?.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v === undefined) continue
        if (Array.isArray(v)) {
          for (const item of v) url.searchParams.append(k, String(item))
        } else {
          url.searchParams.append(k, String(v))
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${opts.token}`,
    }
    if (init?.body !== undefined) headers["Content-Type"] = "application/json"

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })

    if (res.status === 204) return undefined as T

    const text = await res.text()
    const data = text ? safeJsonParse(text) : undefined

    if (!res.ok) {
      if (res.status === 403 && !opts.emulator) {
        opts.onPermissionDenied?.()
      }
      throw parseFirestoreError(res.status, data ?? text)
    }

    return data as T
  }

  return { projectId: opts.projectId, databaseId, baseUrl, documentsUrl, request }
}

function buildUrl(documentsUrl: string, path: string): string {
  if (!path) return documentsUrl
  if (path.startsWith(":")) return `${documentsUrl}${path}`
  if (path.startsWith("/")) return `${documentsUrl}${path}`

  const colonIdx = path.indexOf(":")
  if (colonIdx > -1) {
    const segment = path.slice(0, colonIdx)
    const verb = path.slice(colonIdx)
    return `${documentsUrl}/${encodePath(segment)}${verb}`
  }
  return `${documentsUrl}/${encodePath(path)}`
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
