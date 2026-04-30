import { fieldValueToPlain } from "./encoding"
import type { FieldValue, FirestoreDocument } from "@/types/firestore"

export function exportJson(documents: FirestoreDocument[]): string {
  return JSON.stringify(
    documents.map((d) => ({
      id: d.id,
      path: d.path,
      data: plainFields(d.fields),
    })),
    null,
    2
  )
}

export function exportCsv(documents: FirestoreDocument[]): string {
  const rows: Record<string, unknown>[] = documents.map((d) => ({
    id: d.id,
    path: d.path,
    ...flatten(plainFields(d.fields)),
  }))
  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      for (const k of Object.keys(row)) set.add(k)
      return set
    }, new Set())
  )
  const lines = [headers.map(csvCell).join(",")]
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","))
  }
  return lines.join("\r\n")
}

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function plainFields(fields: Record<string, FieldValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) out[k] = fieldValueToPlain(v)
  return out
}

function flatten(input: unknown, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    out[prefix || "value"] = input
    return out
  }
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key))
    } else {
      out[key] = v
    }
  }
  return out
}

function csvCell(v: unknown): string {
  if (v === undefined || v === null) return ""
  let str: string
  if (typeof v === "string") str = v
  else if (typeof v === "object") str = JSON.stringify(v)
  else str = String(v)
  if (/[,"\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
