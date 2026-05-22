"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fieldValueToPlain } from "@/lib/firestore/encoding"
import { cn } from "@/lib/utils"
import type { FirestoreDocument } from "@/types/firestore"

interface Props {
  documents: FirestoreDocument[]
  isLoading: boolean
  selectedId: string | null
  selection: Set<string>
  onSelectionChange: (next: Set<string>) => void
  onOpenDocument: (path: string) => void
  showPathColumn?: boolean
  pagination?: {
    onPrev?: () => void
    onNext?: () => void
    hasPrev: boolean
    hasNext: boolean
    pageNum: number
  }
  failedPaths?: Set<string>
}

const MAX_INLINE_COLUMNS = 12

export function DocumentsTable({
  documents,
  isLoading,
  selectedId,
  selection,
  onSelectionChange,
  onOpenDocument,
  showPathColumn,
  pagination,
  failedPaths,
}: Props) {
  const columns = useMemo(() => {
    const seen = new Set<string>()
    for (const doc of documents) {
      for (const key of Object.keys(doc.fields)) {
        seen.add(key)
        if (seen.size >= MAX_INLINE_COLUMNS) break
      }
      if (seen.size >= MAX_INLINE_COLUMNS) break
    }
    return Array.from(seen)
  }, [documents])

  const allSelected = documents.length > 0 && documents.every((d) => selection.has(d.path))
  const someSelected = documents.some((d) => selection.has(d.path))

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(v) => {
                    const next = new Set(selection)
                    if (v) {
                      for (const d of documents) next.add(d.path)
                    } else {
                      for (const d of documents) next.delete(d.path)
                    }
                    onSelectionChange(next)
                  }}
                />
              </TableHead>
              <TableHead className="min-w-[180px]">Document ID</TableHead>
              {showPathColumn && <TableHead className="min-w-[200px]">Path</TableHead>}
              {columns.map((col) => (
                <TableHead key={col} className="min-w-[120px] font-mono text-xs">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={2 + (showPathColumn ? 1 : 0) + columns.length}>
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading documents...
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={2 + (showPathColumn ? 1 : 0) + columns.length}>
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No documents
                  </p>
                </TableCell>
              </TableRow>
            )}
            {documents.map((doc) => {
              const isSel = selection.has(doc.path)
              const isOpen = doc.path === selectedId
              const failed = failedPaths?.has(doc.path)
              return (
                <TableRow
                  key={doc.path}
                  data-state={isOpen ? "selected" : undefined}
                  className={cn(
                    "cursor-pointer",
                    isOpen && "bg-accent/50",
                    failed && "bg-destructive/10"
                  )}
                  onClick={() => onOpenDocument(doc.path)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={(v) => {
                        const next = new Set(selection)
                        if (v) next.add(doc.path)
                        else next.delete(doc.path)
                        onSelectionChange(next)
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{doc.id}</span>
                      {failed && (
                        <Badge variant="destructive" className="text-[10px]">
                          failed
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {showPathColumn && (
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {doc.path}
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col} className="max-w-[300px] truncate font-mono text-xs">
                      {formatCell(doc.fields[col])}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {pagination && (
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span>
            {documents.length} doc{documents.length === 1 ? "" : "s"} — page {pagination.pageNum}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={pagination.onPrev}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={pagination.onNext}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatCell(value: unknown): string {
  const v = value as { kind?: string } | undefined
  if (!v) return "—"
  if (v.kind === "null") return "null"
  if (v.kind === "string") return JSON.stringify((v as { value: string }).value)
  if (v.kind === "boolean") return String((v as { value: boolean }).value)
  if (v.kind === "integer") return (v as { value: string }).value
  if (v.kind === "double") return String((v as { value: number }).value)
  if (v.kind === "timestamp") return (v as { value: string }).value
  if (v.kind === "reference") return `→ ${(v as { path: string }).path}`
  if (v.kind === "geopoint") {
    const g = v as { lat: number; lng: number }
    return `${g.lat}, ${g.lng}`
  }
  if (v.kind === "array") {
    const a = v as { value: unknown[] }
    return `[${a.value.length}]`
  }
  if (v.kind === "map") {
    const m = v as { value: Record<string, unknown> }
    return `{${Object.keys(m.value).length}}`
  }
  if (v.kind === "bytes") return "<bytes>"
  return JSON.stringify(fieldValueToPlain(v as never))
}
