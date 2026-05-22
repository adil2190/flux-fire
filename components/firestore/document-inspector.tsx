"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save, Trash2, X, Plus, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { FieldEditor, defaultFieldValue } from "./field-editor"
import { useDocument } from "@/hooks/firestore/use-document"
import { useCollectionIds } from "@/hooks/firestore/use-collection-ids"
import { useWriteDocument } from "@/hooks/firestore/use-write-document"
import { useDeleteDocument } from "@/hooks/firestore/use-delete-document"
import { fieldValueToPlain } from "@/lib/firestore/encoding"
import { cn } from "@/lib/utils"
import type { FieldValue } from "@/types/firestore"
import { FirestoreError } from "@/lib/firestore/errors"

interface Props {
  docPath: string | null
  onClose: () => void
  onNavigate: (path: string) => void
}

export function DocumentInspector({ docPath, onClose, onNavigate }: Props) {
  const { data: doc, isLoading, error } = useDocument(docPath ?? undefined)
  const writeDoc = useWriteDocument()
  const deleteDoc = useDeleteDocument()

  const [draft, setDraft] = useState<Record<string, FieldValue>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())

  useEffect(() => {
    setDraft(doc?.fields ?? {})
    setDirty(new Set())
  }, [doc?.path, doc?.updateTime, doc?.fields])

  const fieldNames = useMemo(() => Object.keys(draft).sort(), [draft])

  if (!docPath) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Select a document to inspect.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="flex h-full flex-col">
        <InspectorHeader path={docPath} onClose={onClose} dirty={false} />
        <Alert variant="destructive" className="m-3">
          <AlertDescription>
            {error instanceof FirestoreError ? error.message : "Failed to load document"}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const isDirty = dirty.size > 0

  const save = async () => {
    try {
      await writeDoc.mutateAsync({
        path: doc.path,
        fields: draft,
        mode: "patch",
        updateMask: Array.from(dirty),
      })
      toast.success("Saved")
      setDirty(new Set())
    } catch (err) {
      toast.error(err instanceof FirestoreError ? err.message : "Save failed")
    }
  }

  const remove = async () => {
    if (!confirm(`Delete ${doc.path}?`)) return
    try {
      await deleteDoc.mutateAsync({ path: doc.path })
      toast.success("Deleted")
      onClose()
    } catch (err) {
      toast.error(err instanceof FirestoreError ? err.message : "Delete failed")
    }
  }

  return (
    <div className="flex h-full flex-col">
      <InspectorHeader path={doc.path} onClose={onClose} dirty={isDirty} />
      <Tabs defaultValue="fields" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2 self-start">
          <TabsTrigger value="fields" className="text-xs">Fields</TabsTrigger>
          <TabsTrigger value="subcollections" className="text-xs">Subcollections</TabsTrigger>
          <TabsTrigger value="raw" className="text-xs">Raw JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="flex-1 overflow-auto">
            <div className="space-y-3 p-3">
              {fieldNames.map((name) => (
                <FieldRow
                  key={name}
                  name={name}
                  value={draft[name]}
                  dirty={dirty.has(name)}
                  onChange={(next) => {
                    setDraft({ ...draft, [name]: next })
                    setDirty(new Set([...dirty, name]))
                  }}
                  onRename={(newName) => {
                    if (!newName || newName === name) return
                    if (newName in draft) {
                      toast.error("Field already exists")
                      return
                    }
                    const { [name]: val, ...rest } = draft
                    setDraft({ ...rest, [newName]: val })
                    const newDirty = new Set(dirty)
                    newDirty.delete(name)
                    newDirty.add(name)
                    newDirty.add(newName)
                    setDirty(newDirty)
                  }}
                  onDelete={() => {
                    const rest = { ...draft }
                    delete rest[name]
                    setDraft(rest)
                    setDirty(new Set([...dirty, name]))
                  }}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => {
                  let i = 1
                  let name = "newField"
                  while (name in draft) name = `newField${i++}`
                  setDraft({ ...draft, [name]: defaultFieldValue("string") })
                  setDirty(new Set([...dirty, name]))
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Add field
              </Button>
            </div>
        </TabsContent>

        <TabsContent value="subcollections" className="flex-1 overflow-auto">
          <SubcollectionsList docPath={doc.path} onNavigate={onNavigate} />
        </TabsContent>

        <TabsContent value="raw" className="flex-1 overflow-auto">
          <pre className="p-3 font-mono text-[11px]">
            {JSON.stringify(plainFields(draft), null, 2)}
          </pre>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between gap-2 border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
          onClick={remove}
          disabled={deleteDoc.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={save}
          disabled={!isDirty || writeDoc.isPending}
        >
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </div>
    </div>
  )
}

interface FieldRowProps {
  name: string
  value: FieldValue
  dirty: boolean
  onChange: (next: FieldValue) => void
  onRename: (next: string) => void
  onDelete: () => void
}

function FieldRow({ name, value, dirty, onChange, onRename, onDelete }: FieldRowProps) {
  const [localName, setLocalName] = useState(name)
  return (
    <div
      className={cn(
        "rounded-md border p-2",
        dirty && "border-amber-400 bg-amber-50/30 dark:border-amber-700 dark:bg-amber-950/20"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Input
          className="h-7 flex-1 font-mono text-xs"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => onRename(localName)}
        />
        {dirty && (
          <Badge variant="outline" className="text-[10px]">
            modified
          </Badge>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <FieldEditor value={value} onChange={onChange} compact />
    </div>
  )
}

function InspectorHeader({
  path,
  onClose,
  dirty,
}: {
  path: string
  onClose: () => void
  dirty: boolean
}) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs">{path}</p>
        {dirty && (
          <Badge variant="outline" className="mt-1 text-[10px]">
            unsaved changes
          </Badge>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

function SubcollectionsList({
  docPath,
  onNavigate,
}: {
  docPath: string
  onNavigate: (path: string) => void
}) {
  const { data, isLoading, error } = useCollectionIds(docPath)
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading...
      </div>
    )
  }
  if (error) {
    return <p className="p-3 text-xs text-destructive">Failed to load subcollections</p>
  }
  if (!data || data.length === 0) {
    return <p className="p-3 text-xs text-muted-foreground">No subcollections</p>
  }
  return (
    <div className="space-y-1 p-3">
      {data.map((id) => (
        <button
          key={id}
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
          onClick={() => onNavigate(`${docPath}/${id}`)}
        >
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono">{id}</span>
        </button>
      ))}
    </div>
  )
}

function plainFields(fields: Record<string, FieldValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) out[k] = fieldValueToPlain(v)
  return out
}
