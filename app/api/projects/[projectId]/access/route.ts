import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import type { FirebaseProject } from "@/types/project"

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()
    const { projectId } = await params

    if (!session?.accessToken) {
      return json({ error: "Unauthorized" }, 401)
    }

    const response = await fetch(
      `https://firebase.googleapis.com/v1beta1/projects/${encodeURIComponent(
        projectId
      )}`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )

    if (response.status === 403 || response.status === 404) {
      return json({ accessible: false })
    }

    if (!response.ok) {
      const error = await response.text()
      console.error("Firebase API error (project access):", error)
      return json({ error: "Failed to verify project access" }, response.status)
    }

    const project: FirebaseProject = await response.json()
    return json({ accessible: true, project })
  } catch (error) {
    console.error("Error verifying project access:", error)
    return json({ error: "Internal server error" }, 500)
  }
}
