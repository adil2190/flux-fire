"use client"

import { Suspense, useCallback, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Database, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { useProjectStore } from "@/stores/project-store"
import { useFirestoreSession } from "@/hooks/firestore/use-firestore-session"
import { useDocuments } from "@/hooks/firestore/use-documents"
import { useRunQuery } from "@/hooks/firestore/use-run-query"
import { useBatchCommit } from "@/hooks/firestore/use-batch-commit"
import { CollectionsTree } from "@/components/firestore/collections-tree"
import { DocumentsTable } from "@/components/firestore/documents-table"
import { QueryBuilder } from "@/components/firestore/query-builder"
import { DocumentInspector } from "@/components/firestore/document-inspector"
import { BulkActionsBar } from "@/components/firestore/bulk-actions-bar"
import { ScopeBanner } from "@/components/firestore/scope-banner"
import { NewDocumentDialog } from "@/components/firestore/new-document-dialog"
import {
  FirestoreTabsBar,
  type FirestoreTab,
} from "@/components/firestore/firestore-tabs-bar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  isCollectionPath,
  isDocPath,
  parentDoc,
  parentCollection,
  collectionId as collIdOf,
} from "@/lib/firestore/paths"
import { FirestoreError, isPermissionDenied } from "@/lib/firestore/errors"
import { exportCsv, exportJson, downloadBlob } from "@/lib/firestore/export"
import { collectFieldPaths } from "@/lib/firestore/fields"
import type { QueryState } from "@/types/firestore"

const PAGE_SIZE = 50

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
  const { selectedProject } = useProjectStore()
  const session = useFirestoreSession()

  const path = searchParams.get("path") ?? ""
  const cgFlag = searchParams.get("cg") === "1"
  const [tabs, setTabs] = useState<FirestoreTab[]>(() => [
    { id: "initial", path, collectionGroup: cgFlag },
  ])
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
          <h2 className="mt-4 text-xl font-semibold">No Project Selected</h2>
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
        <ScopeBanner />
      </div>
    )
  }

  return (
    <div className="grid h-full grid-cols-[260px_minmax(0,1fr)_420px] grid-rows-[36px_minmax(0,1fr)] overflow-hidden bg-card">
      <div className="col-start-1 row-span-2 min-h-0 overflow-hidden border-r">
        <CollectionsTree
          selectedPath={path}
          onSelect={(next) => {
            if (isCollectionPath(next)) openCollectionTab(next)
            else setUrlPath(next)
          }}
        />
      </div>

      <div className="col-span-2 col-start-2 row-start-1 min-w-0">
        <FirestoreTabsBar
          tabs={visibleTabs}
          activeTabId={activeTabId}
          onSelect={selectTab}
          onClose={closeTab}
          onAdd={addTab}
        />
      </div>

      {visibleTabs.map((tab) => (
        <FirestoreWorkspace
          key={tab.id}
          tab={tab}
          active={tab.id === activeTabId}
          onNavigate={(next, collectionGroup) =>
            setUrlPath(next, { cg: collectionGroup })
          }
        />
      ))}
    </div>
  )
}

interface FirestoreWorkspaceProps {
  tab: FirestoreTab
  active: boolean
  onNavigate: (path: string, collectionGroup: boolean) => void
}

function FirestoreWorkspace({
  tab,
  active,
  onNavigate,
}: FirestoreWorkspaceProps) {
  const collectionPath = (() => {
    if (!tab.path) return ""
    if (isCollectionPath(tab.path)) return tab.path
    if (isDocPath(tab.path)) return parentCollection(tab.path) ?? ""
    return ""
  })()
  const docPath = isDocPath(tab.path) ? tab.path : null

  return (
    <>
      <div
        id={`firestore-panel-${tab.id}`}
        role="tabpanel"
        aria-labelledby={`firestore-tab-${tab.id}`}
        hidden={!active}
        className="col-start-2 row-start-2 flex min-h-0 flex-col overflow-hidden"
      >
        {collectionPath ? (
          <CollectionView
            key={`${collectionPath}|${tab.collectionGroup}`}
            collectionPath={collectionPath}
            cgFlag={tab.collectionGroup}
            docPath={docPath}
            onOpenDocument={(next) =>
              onNavigate(next, tab.collectionGroup)
            }
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

      <div
        hidden={!active}
        className="col-start-3 row-start-2 min-h-0 overflow-hidden border-l"
      >
        <DocumentInspector
          docPath={docPath}
          onClose={() => {
            const parent = docPath
              ? parentCollection(docPath) ?? parentDoc(docPath) ?? ""
              : ""
            onNavigate(parent, tab.collectionGroup)
          }}
          onNavigate={(next) => onNavigate(next, tab.collectionGroup)}
        />
      </div>
    </>
  )
}

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

  const documents = activeQuery ? queryRun.data ?? [] : browse.data?.documents ?? []
  const isLoading = activeQuery ? queryRun.isLoading : browse.isLoading
  const error = activeQuery ? queryRun.error : browse.error
  const errorObj = error instanceof FirestoreError ? error : null
  const showPermissionBanner = !!errorObj && isPermissionDenied(errorObj)
  const indexUrl = errorObj?.indexUrl

  const nextPageToken = activeQuery ? undefined : browse.data?.nextPageToken
  const pageNum = tokenStack.length

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            {collectionPath}
          </Badge>
          {queryState.allDescendants && (
            <Badge className="text-[11px]">collectionGroup</Badge>
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
      {showPermissionBanner && (
        <div className="border-b px-4 py-2">
          <ScopeBanner variant="permission" message={errorObj?.message} />
        </div>
      )}
      {indexUrl && (
        <div className="border-b px-4 py-2">
          <ScopeBanner variant="index" indexUrl={indexUrl} />
        </div>
      )}
      {errorObj && !showPermissionBanner && !indexUrl && (
        <div className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {errorObj.message}
        </div>
      )}
      <DocumentsTable
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
      <BulkActionsBar
        count={selection.size}
        busy={batch.isPending}
        onClear={() => setSelection(new Set())}
        onCopyIds={async () => {
          const ids = documents
            .filter((d) => selection.has(d.path))
            .map((d) => d.id)
            .join("\n")
          await navigator.clipboard.writeText(ids)
          toast.success(`Copied ${selection.size} ids`)
        }}
        onExportJson={() => {
          const docs = documents.filter((d) => selection.has(d.path))
          downloadBlob(
            exportJson(docs),
            `${collIdOf(collectionPath)}-${Date.now()}.json`,
            "application/json"
          )
        }}
        onExportCsv={() => {
          const docs = documents.filter((d) => selection.has(d.path))
          downloadBlob(
            exportCsv(docs),
            `${collIdOf(collectionPath)}-${Date.now()}.csv`,
            "text/csv"
          )
        }}
        onDelete={async () => {
          const paths = Array.from(selection)
          if (paths.length === 0) return
          if (!confirm(`Delete ${paths.length} document${paths.length === 1 ? "" : "s"}? This cannot be undone.`)) return
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
                `Deleted ${result.succeeded}, failed ${result.failed.length}`,
                { id: t }
              )
            } else {
              toast.success(`Deleted ${result.succeeded} documents`, { id: t })
            }
            setSelection(new Set())
          } catch (err) {
            toast.error(
              err instanceof FirestoreError ? err.message : "Bulk delete failed",
              { id: t }
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
