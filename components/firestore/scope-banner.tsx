"use client"

import { Info, ShieldAlert, ExternalLink } from "lucide-react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useProjectStore } from "@/stores/project-store"

function signInAgain() {
  void signIn("google", { callbackUrl: window.location.href })
}

/** The session predates the Datastore OAuth scope (or its token can't refresh). */
export function ScopeRequiredBanner() {
  return (
    <Alert>
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Datastore scope required</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-xs">
          Fluxfire now requires the Firestore (Datastore) OAuth scope. Sign in again
          to grant it.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={signInAgain}
        >
          Sign in again
        </Button>
      </AlertDescription>
    </Alert>
  )
}

/**
 * PERMISSION_DENIED usually means a missing IAM role, which signing in again
 * can't fix; lead with the IAM page and keep sign-in as a fallback for
 * sessions that predate the Datastore scope.
 */
export function PermissionDeniedBanner({ message }: { message?: string }) {
  const projectId = useProjectStore((s) => s.selectedProject?.projectId)
  const iamUrl = projectId
    ? `https://console.cloud.google.com/iam-admin/iam?project=${encodeURIComponent(projectId)}`
    : "https://console.cloud.google.com/iam-admin/iam"

  return (
    <Alert variant="destructive">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Permission denied</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-xs">
          {message ||
            "Your Google account needs the Cloud Datastore User role (roles/datastore.user) or higher on this project."}
        </p>
        <p className="text-xs">
          Ask a project owner to grant the role in IAM. If you already have
          it, sign in again to refresh Fluxfire’s access.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
          >
            <a href={iamUrl} target="_blank" rel="noopener noreferrer">
              Open IAM settings <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={signInAgain}
          >
            Sign in again
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

/** FAILED_PRECONDITION with a `create_composite` link. */
export function IndexRequiredBanner({ indexUrl }: { indexUrl: string }) {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>This query needs a composite index</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-xs">
          Firestore needs to build an index for this query before it can be served.
        </p>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
        >
          <a href={indexUrl} target="_blank" rel="noopener noreferrer">
            Create index <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
