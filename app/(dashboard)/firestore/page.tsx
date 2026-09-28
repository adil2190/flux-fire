"use client"

import { Activity, Suspense, memo, useCallback, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Database, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useProjectStore } from "@/stores/project-store"
import { useFirestoreSession } from "@/hooks/firestore/use-firestore-session"
import { useDocuments } from "@/hooks/firestore/use-documents"
import { useRunQuery } from "@/hooks/firestore/use-run-query"
import { useBatchCommit } from "@/hooks/firestore/use-batch-commit"
import { CollectionsRail, CollectionsTree } from "@/components/firestore/collections-tree"
import { DocumentsTable } from "@/components/firestore/documents-table"
import { QueryBuilder } from "@/components/firestore/query-builder"
import { DocumentInspector } from "@/components/firestore/document-inspector"
import { BulkActionsBar } from "@/components/firestore/bulk-actions-bar"
import { ScopeRequiredBanner } from "@/components/firestore/scope-banner"
import { FirestoreErrorNotice } from "@/components/firestore/firestore-error-notice"
import { ExportActions } from "@/components/firestore/export-actions"
import { NewDocumentDialog } from "@/components/firestore/new-document-dialog"
import { ConfirmDialog } from "@/components/firestore/confirm-dialog"
import {
  FirestoreTabsBar,
  type FirestoreTab,
} from "@/components/firestore/firestore-tabs-bar"
import { ColumnResizeHandle } from "@/components/firestore/column-resize-handle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  isCollectionPath,
  isDocPath,
  parentDoc,
  parentCollection,
  collectionId as collIdOf,
} from "@/lib/firestore/paths"
import { FirestoreError } from "@/lib/firestore/errors"
import { collectFieldPaths } from "@/lib/firestore/fields"
import type { QueryState } from "@/types/firestore"

const PAGE_SIZE = 50

// Side panels never take more than this share of the grid, so the documents
// column and the inspector's actions stay on screen at any width or zoom.
const COLLECTIONS_SHARE = 0.25
const INSPECTOR_SHARE = 0.45

/** Clamps a panel's stored width (and its handle's range) to what fits. */
function fitPanel(
  value: number,
  gridWidth: number | null,
  share: number,
  min: number,
  max: number
) {
  const cap = gridWidth ? Math.floor(gridWidth * share) : max
  const hi = Math.max(0, Math.min(max, cap))
  const lo = Math.min(min, hi)
  return { value: Math.min(Math.max(value, lo), hi), min: lo, max: hi }
}

/** The CSS min() covers the first paint, before the grid is measured. */
function gridTemplate(collectionsPx: number, collapsed: boolean, inspectorPx: number) {
  return `min(${collectionsPx}px, ${COLLECTIONS_SHARE * 100}%) ${collapsed ? 0 : 8}px minmax(0, 1fr) 8px min(${inspectorPx}px, ${INSPECTOR_SHARE * 100}%)`
}

function documentsLabel(count: number): string {
  return count === 1 ? "1 document" : `${count} documents`
}

function emptyQueryState(collectionPath: string, allDescendants = false): QueryState {
  const parts = collectionPath.split("/").filter(Boolean)
  const id = parts[parts.length - 1] ?? ""
  const parent = parts.length > 1 ? parts.slice(0, -1).join("/") : undefined
  return {
    collectionId: id,
    parentDoc: parent,
    allDescendants,
    filters: [],
    orderBy: [],
    limit: 50,
  }
}

export default function FirestorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FirestorePageContent />
    </Suspense>
  )
}

function FirestorePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedProject = useProjectStore((s) => s.selectedProject)
  const session = useFirestoreSession()

  const path = searchParams.get("path") ?? ""
  const cgFlag = searchParams.get("cg") === "1"
  const [tabs, setTabs] = useState<FirestoreTab[]>(() => [
    { id: "initial", path, collectionGroup: cgFlag },
  ])
  const [collectionsWidth, setCollectionsWidth] = useState(260)
  const [collectionsCollapsed, setCollectionsCollapsed] = useState(false)
  const [inspectorWidth, setInspectorWidth] = useState(420)
  const [gridWidth, setGridWidth] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const observeGrid = useCallback((el: HTMLDivElement | null) => {
    gridRef.current = el
    if (!el) return
    // Whole pixels only, so sub-pixel changes (e.g. during the sidebar's
    // width transition) don't re-render the page.
    const observer = new ResizeObserver(([entry]) =>
      setGridWidth(Math.round(entry.contentRect.width))
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      gridRef.current = null
    }
  }, [])
  const [fallbackActiveTabId, setFallbackActiveTabId] = useState("initial")
  const urlTabId = searchParams.get("tab")
  const urlOwnerTabId = urlTabId
    ? tabs.some((tab) => tab.id === urlTabId)
      ? urlTabId
      : undefined
    : tabs.some((tab) => tab.id === "initial")
      ? "initial"
      : undefined
  const activeTabId = urlOwnerTabId ?? fallbackActiveTabId

  const setUrlPath = useCallback(
    (next: string, opts: { cg?: boolean; tabId?: string } = {}) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next) params.set("path", next)
      else params.delete("path")
      if (opts.cg) params.set("cg", "1")
      else params.delete("cg")
      params.set("tab", opts.tabId ?? activeTabId)
      const query = params.toString()
      router.push(query ? `/firestore?${query}` : "/firestore")
    },
    [activeTabId, router, searchParams]
  )

  // Stable across column resizes, so memoized workspaces skip those renders.
  const navigateTab = useCallback(
    (next: string, collectionGroup: boolean) =>
      setUrlPath(next, { cg: collectionGroup }),
    [setUrlPath]
  )

  const visibleTabs = tabs.map((tab) =>
    tab.id === urlOwnerTabId
      ? { ...tab, path, collectionGroup: cgFlag }
      : tab
  )

  const selectTab = (tabId: string) => {
    if (tabId === activeTabId) return
    const target = tabs.find((tab) => tab.id === tabId)
    if (!target) return

    setTabs((current) =>
      current.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, path, collectionGroup: cgFlag }
          : tab
      )
    )
    setFallbackActiveTabId(tabId)
    setUrlPath(target.path, {
      cg: target.collectionGroup,
      tabId: target.id,
    })
  }

  const addTab = () => {
    const id = createTabId()
    setTabs((current) => [
      ...current.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, path, collectionGroup: cgFlag }
          : tab
      ),
      { id, path: "", collectionGroup: false },
    ])
    setFallbackActiveTabId(id)
    setUrlPath("", { tabId: id })
  }

  const openCollectionTab = (collectionPath: string) => {
    const activeTab = visibleTabs.find((tab) => tab.id === activeTabId)

    if (!activeTab?.path) {
      setUrlPath(collectionPath, { tabId: activeTabId })
      return
    }

    const id = createTabId()
    setTabs((current) => [
      ...current.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, path, collectionGroup: cgFlag }
          : tab
      ),
      { id, path: collectionPath, collectionGroup: false },
    ])
    setFallbackActiveTabId(id)
    setUrlPath(collectionPath, { tabId: id })
  }

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return

    if (tabId !== activeTabId) {
      setTabs((current) => current.filter((tab) => tab.id !== tabId))
      return
    }

    const index = tabs.findIndex((tab) => tab.id === tabId)
    const target = tabs[index + 1] ?? tabs[index - 1]
    if (!target) return

    setTabs((current) => current.filter((tab) => tab.id !== tabId))
    setFallbackActiveTabId(target.id)
    setUrlPath(target.path, {
      cg: target.collectionGroup,
      tabId: target.id,
    })
  }

  if (!selectedProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Database className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">No project selected</h2>
          <p className="mt-2 text-muted-foreground">
            Please select a project from the projects page.
          </p>
        </div>
      </div>
    )
  }

  if (session.scopeError) {
    return (
      <div className="p-6">
        <ScopeRequiredBanner />
      </div>
    )
  }

  const collections = fitPanel(collectionsWidth, gridWidth, COLLECTIONS_SHARE, 180, 480)
  const inspector = fitPanel(inspectorWidth, gridWidth, INSPECTOR_SHARE, 280, 640)
  const collectionsColumn = collectionsCollapsed ? 52 : collections.value
  // Drags restyle the grid directly and commit to state on release.
  const previewGrid = (collectionsPx: number, inspectorPx: number) => {
    gridRef.current?.style.setProperty(
      "grid-template-columns",
      gridTemplate(collectionsPx, collectionsCollapsed, inspectorPx)
    )
  }

  return (
    <div
      ref={observeGrid}
      className="grid h-full grid-rows-[36px_minmax(0,1fr)] overflow-hidden bg-card"
      style={{
        gridTemplateColumns: gridTemplate(
          collectionsColumn,
          collectionsCollapsed,
          inspector.value
        ),
      }}
    >
      <h1 className="sr-only">Firestore data for {selectedProject.displayName}</h1>
      <div className="col-start-1 row-span-2 min-h-0 overflow-hidden">
        {collectionsCollapsed ? (
          <CollectionsRail onExpand={() => setCollectionsCollapsed(false)} />
        ) : (
          <CollectionsTree
            selectedPath={path}
            onCollapse={() => setCollectionsCollapsed(true)}
            onSelect={(next) => {
              if (isCollectionPath(next)) openCollectionTab(next)
              else setUrlPath(next)
            }}
          />
        )}
      </div>

      {!collectionsCollapsed && (
        <ColumnResizeHandle
          label="collections"
          value={collections.value}
          min={collections.min}
          max={collections.max}
          edge="left"
          className="col-start-2 row-span-2 row-start-1"
          onPreview={(value) => previewGrid(value, inspector.value)}
          onChange={setCollectionsWidth}
        />
      )}

      <div className="col-span-3 col-start-3 row-start-1 min-w-0">
        <FirestoreTabsBar
          tabs={visibleTabs}
          activeTabId={activeTabId}
          onSelect={selectTab}
          onClose={closeTab}
          onAdd={addTab}
        />
      </div>

      <ColumnResizeHandle
        label="document inspector"
        value={inspector.value}
        min={inspector.min}
        max={inspector.max}
        edge="right"
        className="col-start-4 row-start-2"
        onPreview={(value) => previewGrid(collectionsColumn, value)}
        onChange={setInspectorWidth}
      />

      {/* Hidden tabs keep their state but pause effects and queries, so
          writes only refetch what the visible tab shows. */}
      {visibleTabs.map((tab) => (
        <Activity
          key={tab.id}
          mode={tab.id === activeTabId ? "visible" : "hidden"}
        >
          <FirestoreWorkspace
            tabId={tab.id}
            path={tab.path}
            collectionGroup={tab.collectionGroup}
            onNavigate={navigateTab}
          />
        </Activity>
      ))}
    </div>
  )
}

interface FirestoreWorkspaceProps {
  tabId: string
  path: string
  collectionGroup: boolean
  onNavigate: (path: string, collectionGroup: boolean) => void
}

const FirestoreWorkspace = memo(function FirestoreWorkspace({
  tabId,
  path,
  collectionGroup,
  onNavigate,
}: FirestoreWorkspaceProps) {
  const collectionPath = (() => {
    if (!path) return ""
    if (isCollectionPath(path)) return path
    if (isDocPath(path)) return parentCollection(path) ?? ""
    return ""
  })()
  const docPath = isDocPath(path) ? path : null
  const panelRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <div
        ref={panelRef}
        id={`firestore-panel-${tabId}`}
        role="tabpanel"
        aria-labelledby={`firestore-tab-${tabId}`}
        tabIndex={-1}
        className="col-start-3 row-start-2 flex min-h-0 flex-col overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {collectionPath ? (
          <CollectionView
            key={`${collectionPath}|${collectionGroup}`}
            collectionPath={collectionPath}
            cgFlag={collectionGroup}
            docPath={docPath}
            onOpenDocument={(next) => onNavigate(next, collectionGroup)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
            <div>
              <Database className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3">Select a collection to begin.</p>
            </div>
          </div>
        )}
      </div>

      <aside
        aria-label="Document inspector"
        className="col-start-5 row-start-2 min-h-0 overflow-hidden border-l"
      >
        <DocumentInspector
          docPath={docPath}
          onClose={() => {
            const parent = docPath
              ? parentCollection(docPath) ?? parentDoc(docPath) ?? ""
              : ""
            onNavigate(parent, collectionGroup)
            // Closing (or deleting) removes the focused control; land on the
            // documents panel instead of the top of the page.
            requestAnimationFrame(() => panelRef.current?.focus())
          }}
          onNavigate={(next) => onNavigate(next, collectionGroup)}
        />
      </aside>
    </>
  )
})

function createTabId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

interface CollectionViewProps {
  collectionPath: string
  cgFlag: boolean
  docPath: string | null
  onOpenDocument: (path: string) => void
}

function CollectionView({ collectionPath, cgFlag, docPath, onOpenDocument }: CollectionViewProps) {
  const [queryState, setQueryState] = useState<QueryState>(() =>
    emptyQueryState(collectionPath, cgFlag)
  )
  const [activeQuery, setActiveQuery] = useState<QueryState | null>(null)
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [tokenStack, setTokenStack] = useState<(string | undefined)[]>([undefined])
  const [failedPaths, setFailedPaths] = useState<Set<string>>(new Set())
  const [newDocOpen, setNewDocOpen] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  const browse = useDocuments(collectionPath, {
    pageSize: PAGE_SIZE,
    pageToken: tokenStack[tokenStack.length - 1],
  })
  const queryRun = useRunQuery(activeQuery)
  const batch = useBatchCommit()

  const fieldPaths = useMemo(
    () =>
      collectFieldPaths([
        ...(browse.data?.documents ?? []),
        ...(queryRun.data ?? []),
      ]),
    [browse.data?.documents, queryRun.data]
  )

  const documents = useMemo(
    () => (activeQuery ? queryRun.data ?? [] : browse.data?.documents ?? []),
    [activeQuery, queryRun.data, browse.data?.documents]
  )
  const isLoading = activeQuery ? queryRun.isLoading : browse.isLoading
  const error = activeQuery ? queryRun.error : browse.error
  const selectedDocuments = useMemo(
    () => documents.filter((d) => selection.has(d.path)),
    [documents, selection]
  )

  const nextPageToken = activeQuery ? undefined : browse.data?.nextPageToken
  const pageNum = tokenStack.length

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-2xs">
            {collectionPath}
          </Badge>
          {queryState.allDescendants && (
            <Badge className="text-2xs">collectionGroup</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={() => setNewDocOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> New document
        </Button>
      </div>
      <QueryBuilder
        state={queryState}
        fieldPaths={fieldPaths}
        onChange={setQueryState}
        onRun={() => {
          setActiveQuery(queryState)
          setSelection(new Set())
        }}
        onReset={() => {
          setQueryState(emptyQueryState(collectionPath, cgFlag))
          setActiveQuery(null)
          setTokenStack([undefined])
        }}
        isRunning={queryRun.isFetching}
      />
      <FirestoreErrorNotice error={error} />
      <DocumentsTable
        ref={tableRef}
        documents={documents}
        isLoading={isLoading}
        selectedId={docPath}
        selection={selection}
        onSelectionChange={setSelection}
        onOpenDocument={onOpenDocument}
        showPathColumn={!!activeQuery && queryState.allDescendants}
        failedPaths={failedPaths}
        pagination={
          activeQuery
            ? undefined
            : {
                hasPrev: tokenStack.length > 1,
                hasNext: !!nextPageToken,
                pageNum,
                onPrev: () =>
                  setTokenStack((stack) =>
                    stack.length > 1 ? stack.slice(0, -1) : stack
                  ),
                onNext: () => {
                  if (nextPageToken) {
                    setTokenStack((stack) => [...stack, nextPageToken])
                  }
                },
              }
        }
      />
      <BulkActionsBar count={selection.size} onClear={() => setSelection(new Set())}>
        <ExportActions
          documents={selectedDocuments}
          filenameBase={collIdOf(collectionPath)}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
          disabled={batch.isPending}
          onClick={() => setConfirmBulkDelete(true)}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </BulkActionsBar>
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={`Delete ${documentsLabel(selection.size)}?`}
        description={`The selected ${selection.size === 1 ? "document" : "documents"} will be permanently deleted. This can’t be undone.`}
        confirmLabel={`Delete ${documentsLabel(selection.size)}`}
        busy={batch.isPending}
        onConfirm={async () => {
          const paths = Array.from(selection)
          if (paths.length === 0) return
          setConfirmBulkDelete(false)
          const writes = paths.map((p) => ({ kind: "delete" as const, path: p }))
          const t = toast.loading(`Deleting 0 / ${paths.length}...`)
          try {
            const result = await batch.mutateAsync({
              writes,
              onProgress: (done, total) => {
                toast.loading(`Deleting ${done} / ${total}...`, { id: t })
              },
            })
            if (result.failed.length > 0) {
              setFailedPaths(
                new Set(
                  result.failed
                    .map((f) => (f.write.kind === "delete" ? f.write.path : ""))
                    .filter(Boolean)
                )
              )
              toast.error(
                `Deleted ${documentsLabel(result.succeeded)}. ${documentsLabel(result.failed.length)} could not be deleted and ${result.failed.length === 1 ? "is" : "are"} marked in the table.`,
                { id: t, duration: Infinity }
              )
            } else {
              toast.success(`Deleted ${documentsLabel(result.succeeded)}`, { id: t })
            }
            setSelection(new Set())
            // The bulk bar (and its Delete button) unmounts with the selection.
            requestAnimationFrame(() => tableRef.current?.focus())
          } catch (err) {
            toast.error(
              err instanceof FirestoreError
                ? err.message
                : "Unable to delete the selected documents. Try again.",
              { id: t, duration: Infinity }
            )
          }
        }}
      />
      <NewDocumentDialog
        open={newDocOpen}
        onOpenChange={setNewDocOpen}
        collectionPath={collectionPath}
        onCreated={(p) => onOpenDocument(p)}
      />
    </>
  )
}
