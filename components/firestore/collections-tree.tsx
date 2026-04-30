"use client"

import { ChevronRight, Database, Folder, FileText, Loader2 } from "lucide-react"
import { useState } from "react"
import { useCollectionIds } from "@/hooks/firestore/use-collection-ids"
import { useDocuments } from "@/hooks/firestore/use-documents"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { joinPath } from "@/lib/firestore/paths"

interface Props {
  selectedPath: string
  onSelect: (path: string) => void
}

export function CollectionsTree({ selectedPath, onSelect }: Props) {
  const { data: rootCollections, isLoading, error } = useCollectionIds(undefined)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Collections</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1">
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading collections...
            </div>
          )}
          {error && (
            <p className="px-3 py-2 text-xs text-destructive">
              Failed to list collections
            </p>
          )}
          {rootCollections?.map((id) => (
            <CollectionNode
              key={id}
              path={id}
              name={id}
              level={0}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
          {rootCollections && rootCollections.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No collections yet</p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface NodeProps {
  path: string
  name: string
  level: number
  selectedPath: string
  onSelect: (path: string) => void
}

function CollectionNode({ path, name, level, selectedPath, onSelect }: NodeProps) {
  const [expanded, setExpanded] = useState(selectedPath.startsWith(path + "/") || selectedPath === path)
  const isSelected = selectedPath === path
  const docs = useDocuments(expanded ? path : undefined, { pageSize: 50 })

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-1 py-1 text-xs hover:bg-accent",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: 4 + level * 12 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform",
              expanded && "rotate-90"
            )}
          />
        </Button>
        <button
          type="button"
          onClick={() => {
            setExpanded(true)
            onSelect(path)
          }}
          className="flex flex-1 items-center gap-1.5 truncate text-left"
        >
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="truncate font-mono">{name}</span>
        </button>
      </div>
      {expanded && (
        <div>
          {docs.isLoading && (
            <div
              className="flex items-center gap-1 px-1 py-1 text-xs text-muted-foreground"
              style={{ paddingLeft: 16 + level * 12 }}
            >
              <Loader2 className="h-3 w-3 animate-spin" />
            </div>
          )}
          {docs.data?.documents.map((d) => (
            <DocNode
              key={d.path}
              docPath={d.path}
              docId={d.id}
              level={level + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
          {docs.data && docs.data.documents.length === 0 && (
            <p
              className="px-1 py-1 text-xs italic text-muted-foreground"
              style={{ paddingLeft: 24 + level * 12 }}
            >
              empty
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface DocNodeProps {
  docPath: string
  docId: string
  level: number
  selectedPath: string
  onSelect: (path: string) => void
}

function DocNode({ docPath, docId, level, selectedPath, onSelect }: DocNodeProps) {
  const [expanded, setExpanded] = useState(selectedPath.startsWith(docPath + "/"))
  const isSelected = selectedPath === docPath
  const subs = useCollectionIds(expanded ? docPath : undefined)

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-1 py-1 text-xs hover:bg-accent",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: 4 + level * 12 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform",
              expanded && "rotate-90"
            )}
          />
        </Button>
        <button
          type="button"
          onClick={() => onSelect(docPath)}
          className="flex flex-1 items-center gap-1.5 truncate text-left"
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600" />
          <span className="truncate font-mono">{docId}</span>
        </button>
      </div>
      {expanded && subs.data?.map((cid) => (
        <CollectionNode
          key={cid}
          path={joinPath(docPath, cid)}
          name={cid}
          level={level + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
