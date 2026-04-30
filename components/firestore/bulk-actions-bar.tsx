"use client"

import { Trash2, Download, Copy, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  count: number
  onClear: () => void
  onDelete: () => void
  onExportJson: () => void
  onExportCsv: () => void
  onCopyIds: () => void
  busy?: boolean
}

export function BulkActionsBar({
  count,
  onClear,
  onDelete,
  onExportJson,
  onExportCsv,
  onCopyIds,
  busy,
}: Props) {
  if (count === 0) return null
  return (
    <div className="flex items-center justify-between border-t bg-card px-4 py-2 text-xs">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
        </Button>
        <span className="font-medium">
          {count} selected
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={onCopyIds}
          disabled={busy}
        >
          <Copy className="h-3.5 w-3.5" /> Copy IDs
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={onExportJson}
          disabled={busy}
        >
          <Download className="h-3.5 w-3.5" /> JSON
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={onExportCsv}
          disabled={busy}
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={busy}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </div>
  )
}
