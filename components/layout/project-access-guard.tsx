"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useProjectAccess } from "@/hooks/use-projects"
import { useProjectStore } from "@/stores/project-store"

const ACCESS_CHECK_INTERVAL_MS = 60_000

export function ProjectAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const qc = useQueryClient()
  const redirected = useRef(false)
  const hasHydrated = useProjectStoreHydration()
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const disconnect = useProjectStore((state) => state.disconnect)

  const access = useProjectAccess(
    hasHydrated ? selectedProject?.projectId : undefined,
    {
      refetchInterval: ACCESS_CHECK_INTERVAL_MS,
    }
  )

  const accessRevoked = !!selectedProject && access.data?.accessible === false

  useEffect(() => {
    if (!hasHydrated || redirected.current) return

    if (!selectedProject) {
      redirected.current = true
      router.replace("/projects")
      return
    }

    if (!accessRevoked) return

    redirected.current = true
    const projectId = selectedProject.projectId

    qc.removeQueries({ queryKey: ["firestore", projectId] })
    qc.removeQueries({ queryKey: ["firebase-config", projectId] })
    qc.removeQueries({ queryKey: ["firebase-project-access", projectId] })
    qc.removeQueries({ queryKey: ["firebase-projects"] })
    disconnect()
    toast.error("Your access to this project was removed.")
    router.replace("/projects")
  }, [
    accessRevoked,
    disconnect,
    hasHydrated,
    qc,
    router,
    selectedProject,
  ])

  if (!hasHydrated || !selectedProject || access.isPending || accessRevoked) {
    return <AccessCheckPending />
  }

  if (access.error) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-lg font-semibold">
            Unable to verify project access
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Fluxfire could not confirm that your account can still access this
            project. No project data will be shown until verification succeeds.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            disabled={access.isFetching}
            onClick={() => access.refetch()}
          >
            {access.isFetching && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return children
}

function AccessCheckPending() {
  return (
    <div className="flex h-screen items-center justify-center bg-muted/30">
      <div className="text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Verifying project access...
        </p>
      </div>
    </div>
  )
}

function useProjectStoreHydration() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const unsubscribeHydrate = useProjectStore.persist.onHydrate(onStoreChange)
      const unsubscribeFinish =
        useProjectStore.persist.onFinishHydration(onStoreChange)

      return () => {
        unsubscribeHydrate()
        unsubscribeFinish()
      }
    },
    () => useProjectStore.persist.hasHydrated(),
    () => false
  )
}
