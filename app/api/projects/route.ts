import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import type { FirebaseProject } from "@/types/project"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Fetch Firebase projects using the Firebase Management API
    const response = await fetch(
      "https://firebase.googleapis.com/v1beta1/projects",
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error("Firebase API error:", error)
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: response.status }
      )
    }

    const data = await response.json()
    const projects: FirebaseProject[] = data.results || []

    // Filter to only active projects
    const activeProjects = projects.filter(
      (p) => p.state === "ACTIVE" || !p.state
    )

    return NextResponse.json({ projects: activeProjects })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
