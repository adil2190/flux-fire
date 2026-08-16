"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Braces,
  CheckCircle2,
  Copy,
  Database,
  Download,
  FileSearch,
  Loader2,
  Terminal,
} from "lucide-react"
import { toast } from "sonner"
import { QueryBuilder } from "@/components/firestore/query-builder"
import { DocumentsTable } from "@/components/firestore/documents-table"
import { DocumentInspector } from "@/components/firestore/document-inspector"
import { ScopeBanner } from "@/components/firestore/scope-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useFirestoreSession } from "@/hooks/firestore/use-firestore-session"
import { useRunQuery } from "@/hooks/firestore/use-run-query"
import { FirestoreError, isPermissionDenied } from "@/lib/firestore/errors"
import { exportCsv, exportJson, downloadBlob } from "@/lib/firestore/export"
import { isCollectionPath, splitPath } from "@/lib/firestore/paths"
import { buildStructuredQuery } from "@/lib/firestore/queries"
import { useProjectStore } from "@/stores/project-store"
import type { QueryState } from "@/types/firestore"

const DEFAULT_LIMIT = 50

export default function QueryPage() {
  const router = useRouter()
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const useEmulator = useProjectStore((state) => state.useEmulator)
  const session = useFirestoreSession()
  const [target, setTarget] = useState("")
  const [draft, setDraft] = useState<QueryState>(emptyQueryState)
  const [activeQuery, setActiveQuery] = useState<QueryState | null>(null)
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [selectedDocPath, setSelectedDocPath] = useState<string | null>(null)

  const queryRun = useRunQuery(activeQuery)
  const documents = useMemo(() => queryRun.data ?? [], [queryRun.data])
  const error = queryRun.error
  const firestoreError = error instanceof FirestoreError ? error : null
  const validationError = validateQuery(target, draft)
  const requestPreview = useMemo(
    () => JSON.stringify(buildStructuredQuery(draft), null, 2),
    [draft]
  )
  const requestPath = draft.parentDoc
    ? `documents/${draft.parentDoc}:runQuery`
    : "documents:runQuery"
  const selectedDocuments = useMemo(
    () => documents.filter((document) => selection.has(document.path)),
    [documents, selection]
  )
  const exportDocuments =
    selectedDocuments.length > 0 ? selectedDocuments : documents

  const updateTarget = (value: string) => {
    setTarget(value)
    const parts = splitPath(value)
    setDraft((current) => ({
      ...current,
      collectionId: parts[parts.length - 1] ?? "",
      parentDoc:
        parts.length > 1 ? parts.slice(0, -1).join("/") : undefined,
    }))
  }

  const runQuery = () => {
    if (validationError) {
      toast.error(validationError)
      return
    }

    const next = cloneQueryState(draft)
    setSelection(new Set())
    setSelectedDocPath(null)

    if (
      activeQuery &&
      JSON.stringify(activeQuery) === JSON.stringify(next)
    ) {
      void queryRun.refetch()
      return
    }

    setActiveQuery(next)
  }

  const resetQuery = () => {
    setTarget("")
    setDraft(emptyQueryState())
    setActiveQuery(null)
    setSelection(new Set())
    setSelectedDocPath(null)
  }

  const downloadResults = (format: "json" | "csv") => {
    if (exportDocuments.length === 0) return
    const collection = activeQuery?.collectionId || "query-results"
    const timestamp = Date.now()

    if (format === "json") {
      downloadBlob(
        exportJson(exportDocuments),
        `${collection}-${timestamp}.json`,
        "application/json"
      )
      return
    }

    downloadBlob(
      exportCsv(exportDocuments),
      `${collection}-${timestamp}.csv`,
      "text/csv"
    )
  }

  if (!selectedProject) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <Database className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h1 className="mt-4 text-lg font-semibold">No project selected</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a Firebase project before running a query.
          </p>
        </div>
      </div>
    )
  }

  if (session.scopeError) {
    return (
      <div className="p-6">
        <ScopeBanner />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <h1 className="font-semibold">Query workbench</h1>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Build and run structured Firestore queries against {selectedProject.displayName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="max-w-52 truncate font-mono">
            {selectedProject.projectId}
          </Badge>
          <Badge variant={useEmulator ? "secondary" : "outline"}>
            {useEmulator ? "Emulator" : "Production"}
          </Badge>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[440px_minmax(0,1fr)] overflow-hidden">
        <aside className="min-h-0 overflow-y-auto border-r bg-muted/10">
          <section className="space-y-2 border-b bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="query-target" className="text-xs font-medium">
                Collection path
              </Label>
              {draft.parentDoc && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  parent: {draft.parentDoc}
                </Badge>
              )}
            </div>
            <Input
              id="query-target"
              data-testid="query-target"
              value={target}
              onChange={(event) => updateTarget(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runQuery()
              }}
              placeholder="users or users/alice/orders"
              className="font-mono text-sm"
              autoComplete="off"
            />
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] leading-4 text-muted-foreground">
                Enter a root collection or a full subcollection path.
              </p>
              {target && (
                <span
                  className={
                    validationError?.startsWith("Collection path")
                      ? "text-[11px] text-destructive"
                      : "text-[11px] text-emerald-600"
                  }
                >
                  {validationError?.startsWith("Collection path")
                    ? "Invalid path"
                    : "Valid target"}
                </span>
              )}
            </div>
          </section>

          <QueryBuilder
            state={draft}
            onChange={setDraft}
            onRun={runQuery}
            onReset={resetQuery}
            isRunning={queryRun.isFetching}
            layout="stacked"
          />

          <details className="group border-b bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-medium hover:bg-accent/50">
              <span className="flex items-center gap-2">
                <Braces className="h-3.5 w-3.5 text-muted-foreground" />
                REST request preview
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                POST
              </Badge>
            </summary>
            <div className="border-t bg-zinc-950 p-3 text-zinc-100">
              <div className="mb-2 flex items-start justify-between gap-2">
                <code className="break-all font-mono text-[10px] text-zinc-400">
                  {requestPath}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={async () => {
                    await navigator.clipboard.writeText(requestPreview)
                    toast.success("Request copied")
                  }}
                  aria-label="Copy request"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-4">
                {requestPreview}
              </pre>
            </div>
          </details>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Results</span>
              {activeQuery && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {activeQuery.allDescendants
                    ? `collectionGroup(${activeQuery.collectionId})`
                    : targetLabel(activeQuery)}
                </Badge>
              )}
              {queryRun.isFetching ? (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Loader2 className="h-3 w-3 animate-spin" /> Running
                </Badge>
              ) : activeQuery && !queryRun.error ? (
                <Badge variant="outline" className="gap-1 text-[10px] text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> {documents.length} found
                </Badge>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              {selection.size > 0 && (
                <Badge variant="secondary" className="mr-1 text-[10px]">
                  {selection.size} selected
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={exportDocuments.length === 0}
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    exportDocuments.map((document) => document.id).join("\n")
                  )
                  toast.success(
                    `Copied ${exportDocuments.length} document ${
                      exportDocuments.length === 1 ? "ID" : "IDs"
                    }`
                  )
                }}
              >
                <Copy className="h-3.5 w-3.5" /> IDs
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={exportDocuments.length === 0}
                onClick={() => downloadResults("json")}
              >
                <Download className="h-3.5 w-3.5" /> JSON
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={exportDocuments.length === 0}
                onClick={() => downloadResults("csv")}
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>

          {firestoreError && isPermissionDenied(firestoreError) && (
            <div className="border-b p-3">
              <ScopeBanner
                variant="permission"
                message={firestoreError.message}
              />
            </div>
          )}
          {firestoreError?.indexUrl && (
            <div className="border-b p-3">
              <ScopeBanner
                variant="index"
                indexUrl={firestoreError.indexUrl}
              />
            </div>
          )}
          {firestoreError &&
            !isPermissionDenied(firestoreError) &&
            !firestoreError.indexUrl && (
              <div className="border-b bg-destructive/10 px-4 py-3 text-xs text-destructive">
                {firestoreError.message}
              </div>
            )}
          {error && !firestoreError && (
            <div className="border-b bg-destructive/10 px-4 py-3 text-xs text-destructive">
              {error instanceof Error ? error.message : "Query failed"}
            </div>
          )}

          {!activeQuery ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div className="max-w-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/50">
                  <FileSearch className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <h2 className="mt-4 font-medium">Build your first query</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Choose a collection path, add optional filters and ordering,
                  then run the query to inspect matching documents.
                </p>
              </div>
            </div>
          ) : (
            <DocumentsTable
              documents={documents}
              isLoading={queryRun.isFetching}
              selectedId={selectedDocPath}
              selection={selection}
              onSelectionChange={setSelection}
              onOpenDocument={setSelectedDocPath}
              showPathColumn={activeQuery.allDescendants}
            />
          )}
        </main>
      </div>

      <Sheet
        open={!!selectedDocPath}
        onOpenChange={(open) => {
          if (!open) setSelectedDocPath(null)
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full gap-0 p-0 sm:max-w-[480px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Document inspector</SheetTitle>
            <SheetDescription>
              Inspect and edit the selected Firestore document.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <DocumentInspector
              docPath={selectedDocPath}
              onClose={() => setSelectedDocPath(null)}
              onNavigate={(path) => {
                const params = new URLSearchParams({ path })
                setSelectedDocPath(null)
                router.push(`/firestore?${params.toString()}`)
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function emptyQueryState(): QueryState {
  return {
    collectionId: "",
    allDescendants: false,
    filters: [],
    orderBy: [],
    limit: DEFAULT_LIMIT,
  }
}

function validateQuery(target: string, query: QueryState): string | null {
  if (!target.trim()) return "Enter a collection path before running the query."
  if (!isCollectionPath(target)) {
    return "Collection path must contain an odd number of segments."
  }
  if (query.filters.some((filter) => !filter.field.trim())) {
    return "Every filter needs a field path."
  }
  if (query.orderBy.some((order) => !order.field.trim())) {
    return "Every order clause needs a field path."
  }
  return null
}

function cloneQueryState(query: QueryState): QueryState {
  return JSON.parse(JSON.stringify(query)) as QueryState
}

function targetLabel(query: QueryState): string {
  return query.parentDoc
    ? `${query.parentDoc}/${query.collectionId}`
    : query.collectionId
}
