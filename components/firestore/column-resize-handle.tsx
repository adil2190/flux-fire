"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"

interface ColumnResizeHandleProps {
  label: string
  value: number
  min: number
  max: number
  edge: "left" | "right"
  className?: string
  /** Commits a width: on key presses and when a drag ends. */
  onChange: (value: number) => void
  /**
   * Applies a width while dragging without committing it, so the layout can
   * follow the pointer without re-rendering React on every move.
   */
  onPreview?: (value: number) => void
}

export function ColumnResizeHandle({
  label,
  value,
  min,
  max,
  edge,
  className,
  onChange,
  onPreview,
}: ColumnResizeHandleProps) {
  const drag = useRef<{
    startX: number
    startValue: number
    lastValue: number
  } | null>(null)

  const endDrag = () => {
    const current = drag.current
    drag.current = null
    if (current && current.lastValue !== current.startValue) {
      onChange(current.lastValue)
    }
  }

  const resizeBy = (delta: number) => {
    onChange(Math.min(max, Math.max(min, value + delta)))
  }

  return (
    <div
      role="separator"
      aria-label={`Resize ${label} panel`}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      className={cn(
        "group relative z-10 w-2 cursor-col-resize touch-none outline-none",
        "after:absolute after:inset-y-0 after:left-[3px] after:w-0.5 after:bg-border",
        "hover:after:bg-primary/60 focus-visible:after:bg-primary",
        className
      )}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { startX: event.clientX, startValue: value, lastValue: value }
      }}
      onPointerMove={(event) => {
        if (!drag.current) return
        const direction = edge === "left" ? 1 : -1
        const next = Math.min(
          max,
          Math.max(
            min,
            drag.current.startValue + (event.clientX - drag.current.startX) * direction
          )
        )
        if (next === drag.current.lastValue) return
        drag.current.lastValue = next
        if (onPreview) onPreview(next)
        else onChange(next)
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          resizeBy(edge === "left" ? -16 : 16)
        }
        if (event.key === "ArrowRight") {
          event.preventDefault()
          resizeBy(edge === "left" ? 16 : -16)
        }
        if (event.key === "Home") {
          event.preventDefault()
          onChange(min)
        }
        if (event.key === "End") {
          event.preventDefault()
          onChange(max)
        }
      }}
    >
      <span className="sr-only">Drag to resize. Use arrow keys to adjust.</span>
    </div>
  )
}
