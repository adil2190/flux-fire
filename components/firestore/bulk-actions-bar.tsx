"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  count: number
  onClear: () => void
  /** The actions for the selection, e.g. <ExportActions> and a Delete button. */
  children: React.ReactNode
}

export function BulkActionsBar({ count, onClear, children }: Props) {
  if (count === 0) return null
  return (
    <div className="flex items-center justify-between border-t bg-card px-4 py-2 text-xs">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Clear selection"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
        <span className="font-medium tabular-nums">
          {count} selected
        </span>
      </div>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  )
}
