"use client"

import { memo, useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from "react"
import { Loader2, Save, Trash2, X, Plus, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { FieldEditor, defaultFieldValue } from "./field-editor"
import { ConfirmDialog } from "./confirm-dialog"
import { useDocument } from "@/hooks/firestore/use-document"
import { useCollectionIds } from "@/hooks/firestore/use-collection-ids"
import { useWriteDocument } from "@/hooks/firestore/use-write-document"
import { useDeleteDocument } from "@/hooks/firestore/use-delete-document"
import { fieldValueToPlain } from "@/lib/firestore/encoding"
import { cn } from "@/lib/utils"
import { useProjectStore } from "@/stores/project-store"
import type { FieldValue, FirestoreDocument } from "@/types/firestore"
import { FirestoreError } from "@/lib/firestore/errors"

interface Props {
  docPath: string | null
  onClose: () => void
  onNavigate: (path: string) => void
  /** Called after a successful delete, just before onClose. */
  onDeleted?: () => void
}

interface DraftState {
  draft: Record<string, FieldValue>
  dirty: string[]
  baseUpdateTime?: string
}

// Unsaved edits survive switching documents, closing the inspector, or hiding
// the tab, keyed by project + document path. Entries are dropped on save,
// discard, or delete.
const draftCache = new Map<string, DraftState>()

// One listener for the whole app: warn before unload while any draft is
// unsaved, including drafts in hidden tabs whose effects are paused.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (event) => {
    if (draftCache.size > 0) event.preventDefault()
  })
}

function freshDraft(doc: FirestoreDocument): DraftState {
  return { draft: doc.fields, dirty: [], baseUpdateTime: doc.updateTime }
}

type DraftAction =
  | { type: "change"; name: string; value: FieldValue }
  | { type: "rename"; from: string; to: string }
  | { type: "delete"; name: string }
  | { type: "add" }
  | { type: "saved" }
  | { type: "reset"; state: DraftState }

function withDirty(state: DraftState, ...names: string[]): string[] {
  return Array.from(new Set([...state.dirty, ...names]))
}

function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "change":
      return {
        ...state,
        draft: { ...state.draft, [action.name]: action.value },
        dirty: withDirty(state, action.name),
      }
    case "rename": {
      const { [action.from]: value, ...rest } = state.draft
      return {
        ...state,
        draft: { ...rest, [action.to]: value },
        dirty: withDirty(state, action.from, action.to),
      }
    }
    case "delete": {
      const rest = { ...state.draft }
      delete rest[action.name]
      return { ...state, draft: rest, dirty: withDirty(state, action.name) }
    }
    case "add": {
      let i = 1
      let name = "newField"
      while (name in state.draft) name = `newField${i++}`
      return {
        ...state,
        draft: { ...state.draft, [name]: defaultFieldValue("string") },
        dirty: withDirty(state, name),
      }
    }
    case "saved":
      return { ...state, dirty: [] }
    case "reset":
      return action.state
  }
}

export function DocumentInspector({ docPath, onClose, onNavigate, onDeleted }: Props) {
  const { data: doc, isLoading, error } = useDocument(docPath ?? undefined)
  const projectId = useProjectStore((s) => s.selectedProject?.projectId)

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
            {error instanceof FirestoreError ? error.message : "Unable to load this document. Try again."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <DocumentEditor
      key={doc.path}
      doc={doc}
      cacheKey={`${projectId}/${doc.path}`}
      onClose={onClose}
      onNavigate={onNavigate}
      onDeleted={onDeleted}
    />
  )
}

interface DocumentEditorProps {
  doc: FirestoreDocument
  cacheKey: string
  onClose: () => void
  onNavigate: (path: string) => void
  onDeleted?: () => void
}

function DocumentEditor({ doc, cacheKey, onClose, onNavigate, onDeleted }: DocumentEditorProps) {
  const writeDoc = useWriteDocument()
  const deleteDoc = useDeleteDocument()
  const [state, dispatch] = useReducer(
    draftReducer,
    cacheKey,
    (key) => draftCache.get(key) ?? freshDraft(doc)
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { draft } = state
  const dirty = useMemo(() => new Set(state.dirty), [state.dirty])
  const isDirty = dirty.size > 0

  // Pick up server changes (after a save, or someone else's write) only while
  // there are no local edits, so a refetch never wipes unsaved work.
  if (!isDirty && state.baseUpdateTime !== doc.updateTime) {
    dispatch({ type: "reset", state: freshDraft(doc) })
  }

  useEffect(() => {
    if (state.dirty.length > 0) draftCache.set(cacheKey, state)
    else draftCache.delete(cacheKey)
  }, [cacheKey, state])

  // Lets the stable rename handler validate against the latest draft.
  const draftRef = useRef(draft)
  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  const fieldNames = useMemo(() => Object.keys(draft).sort(), [draft])

  const changeField = useCallback(
    (name: string, value: FieldValue) => dispatch({ type: "change", name, value }),
    []
  )
  const deleteField = useCallback(
    (name: string) => dispatch({ type: "delete", name }),
    []
  )
  const renameField = useCallback((from: string, to: string): string | null => {
    if (to === from) return null
    if (!to) return "Enter a field name."
    if (to in draftRef.current) {
      return `A field named “${to}” already exists. Choose another name.`
    }
    dispatch({ type: "rename", from, to })
    return null
  }, [])

  const discard = () => {
    draftCache.delete(cacheKey)
    dispatch({ type: "reset", state: freshDraft(doc) })
  }

  const save = async () => {
    try {
      await writeDoc.mutateAsync({
        path: doc.path,
        fields: draft,
        mode: "patch",
        updateMask: Array.from(dirty),
      })
      toast.success("Changes saved")
      dispatch({ type: "saved" })
    } catch (err) {
      toast.error(
        err instanceof FirestoreError ? err.message : "Unable to save changes. Try again.",
        { duration: Infinity }
      )
    }
  }

  const remove = async () => {
    try {
      await deleteDoc.mutateAsync({ path: doc.path })
      draftCache.delete(cacheKey)
      setConfirmDelete(false)
      toast.success("Document deleted")
      onDeleted?.()
      onClose()
    } catch (err) {
      toast.error(
        err instanceof FirestoreError ? err.message : "Unable to delete the document. Try again.",
        { duration: Infinity }
      )
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
                  onChange={changeField}
                  onRename={renameField}
                  onDelete={deleteField}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => dispatch({ type: "add" })}
              >
                <Plus className="h-3.5 w-3.5" /> Add field
              </Button>
            </div>
        </TabsContent>

        <TabsContent value="subcollections" className="flex-1 overflow-auto">
          <SubcollectionsList docPath={doc.path} onNavigate={onNavigate} />
        </TabsContent>

        <TabsContent value="raw" className="flex-1 overflow-auto">
          <RawJson fields={draft} />
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between gap-2 border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
          disabled={deleteDoc.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={discard}
              disabled={writeDoc.isPending}
            >
              Discard changes
            </Button>
          )}
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

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this document?"
        description={
          <>
            <span className="break-all font-mono">{doc.path}</span> will be
            permanently deleted. This can’t be undone.
          </>
        }
        confirmLabel="Delete document"
        onConfirm={remove}
        busy={deleteDoc.isPending}
      />
    </div>
  )
}

interface FieldRowProps {
  name: string
  value: FieldValue
  dirty: boolean
  onChange: (name: string, next: FieldValue) => void
  /** Returns an error message when the rename is rejected. */
  onRename: (name: string, next: string) => string | null
  onDelete: (name: string) => void
}

// Memoized with name-keyed handlers, so editing one field re-renders one row.
const FieldRow = memo(function FieldRow({
  name,
  value,
  dirty,
  onChange,
  onRename,
  onDelete,
}: FieldRowProps) {
  const [localName, setLocalName] = useState(name)
  const [renameError, setRenameError] = useState<string | null>(null)
  const errorId = useId()
  return (
    <div
      className={cn(
        "rounded-md border p-2",
        dirty && "border-amber-400 bg-amber-50/30 dark:border-amber-700 dark:bg-amber-950/20"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Input
          aria-label={`Name of field ${name}`}
          aria-invalid={!!renameError}
          aria-describedby={renameError ? errorId : undefined}
          className="h-7 flex-1 font-mono text-xs"
          value={localName}
          onChange={(e) => {
            setLocalName(e.target.value)
            setRenameError(null)
          }}
          onBlur={() => setRenameError(onRename(name, localName.trim()))}
        />
        {dirty && (
          <Badge variant="outline" className="text-2xs">
            Modified
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Delete field ${name}`}
          onClick={() => onDelete(name)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {renameError && (
        <p id={errorId} className="mb-2 text-xs text-destructive">
          {renameError}
        </p>
      )}
      <FieldEditor
        value={value}
        onChange={(next) => onChange(name, next)}
        label={name}
        compact
      />
    </div>
  )
})

// A component, not inline JSX, so the document is only stringified while the
// Raw JSON tab is open (inactive tab content isn't mounted).
function RawJson({ fields }: { fields: Record<string, FieldValue> }) {
  const json = useMemo(() => JSON.stringify(plainFields(fields), null, 2), [fields])
  return <pre className="p-3 font-mono text-2xs">{json}</pre>
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
        <p className="truncate font-mono text-xs" title={path}>{path}</p>
        {dirty && (
          <Badge variant="outline" className="mt-1 text-2xs">
            Unsaved changes
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label="Close inspector"
        onClick={onClose}
      >
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
    return <p className="p-3 text-xs text-destructive">Unable to load subcollections. Try again.</p>
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
