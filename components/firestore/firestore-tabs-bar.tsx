"use client"

import type { KeyboardEvent } from "react"
import { Database, FileText, Folder, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isDocPath } from "@/lib/firestore/paths"
import { cn } from "@/lib/utils"

export interface FirestoreTab {
  id: string
  path: string
  collectionGroup: boolean
}

interface Props {
  tabs: FirestoreTab[]
  activeTabId: string
  onSelect: (tabId: string) => void
  onClose: (tabId: string) => void
  onAdd: () => void
}

export function FirestoreTabsBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onAdd,
}: Props) {
  return (
    <div className="flex min-w-0 items-end border-b bg-muted/40 px-1 pt-1">
      <div
        role="tablist"
        aria-label="Firestore workspaces"
        className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto"
      >
        {tabs.map((tab, index) => {
          const active = tab.id === activeTabId
          const label = tabLabel(tab.path)
          const Icon = !tab.path ? Database : isDocPath(tab.path) ? FileText : Folder

          return (
            <div
              key={tab.id}
              className={cn(
                "group flex h-8 min-w-32 max-w-56 shrink-0 items-center rounded-t-md border border-b-0",
                active
                  ? "border-border bg-card text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted"
              )}
            >
              <button
                type="button"
                role="tab"
                id={`firestore-tab-${tab.id}`}
                aria-controls={`firestore-panel-${tab.id}`}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                title={tab.path || "New Firestore tab"}
                className="flex min-w-0 flex-1 items-center gap-1.5 px-2 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                onClick={() => onSelect(tab.id)}
                onKeyDown={(event) =>
                  handleTabKeyDown(event, tabs, index, onSelect, onClose)
                }
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-mono">{label}</span>
                {tab.collectionGroup && (
                  <span className="shrink-0 rounded bg-secondary px-1 text-[9px] font-medium">
                    group
                  </span>
                )}
              </button>
              {tabs.length > 1 && (
                <button
                  type="button"
                  aria-label={`Close ${label} tab`}
                  className="mr-1 rounded p-0.5 opacity-60 outline-none hover:bg-accent hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                  onClick={() => onClose(tab.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="New Firestore tab"
        title="New Firestore tab"
        className="mb-0.5 ml-1 h-7 w-7 shrink-0"
        onClick={onAdd}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function tabLabel(path: string): string {
  if (!path) return "New tab"

  const parts = path.split("/").filter(Boolean)
  if (isDocPath(path)) {
    const collection = parts[parts.length - 2]
    const document = parts[parts.length - 1]
    return `${collection}/${document}`
  }

  return parts[parts.length - 1] ?? path
}

function handleTabKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  tabs: FirestoreTab[],
  index: number,
  onSelect: (tabId: string) => void,
  onClose: (tabId: string) => void
) {
  let targetIndex: number | undefined

  if (event.key === "ArrowRight") targetIndex = (index + 1) % tabs.length
  if (event.key === "ArrowLeft") {
    targetIndex = (index - 1 + tabs.length) % tabs.length
  }
  if (event.key === "Home") targetIndex = 0
  if (event.key === "End") targetIndex = tabs.length - 1

  if (targetIndex !== undefined) {
    event.preventDefault()
    const target = tabs[targetIndex]
    onSelect(target.id)
    requestAnimationFrame(() => {
      document.getElementById(`firestore-tab-${target.id}`)?.focus()
    })
    return
  }

  if ((event.key === "Delete" || event.key === "Backspace") && tabs.length > 1) {
    event.preventDefault()
    onClose(tabs[index].id)
  }
}
