"use client"

import { ShieldAlert, ExternalLink } from "lucide-react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Props {
  message?: string
  indexUrl?: string
  variant?: "scope" | "permission" | "index"
}

export function ScopeBanner({ message, indexUrl, variant = "scope" }: Props) {
  if (variant === "index" && indexUrl) {
    return (
      <Alert>
        <ShieldAlert className="h-4 w-4" />
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

  if (variant === "permission") {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Permission denied</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="text-xs">
            {message ||
              "Your Google account lacks the required IAM role on this project (need roles/datastore.user or higher)."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => signIn("google", { callbackUrl: window.location.href })}
          >
            Re-authenticate
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

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
          onClick={() => signIn("google", { callbackUrl: window.location.href })}
        >
          Re-authenticate
        </Button>
      </AlertDescription>
    </Alert>
  )
}
