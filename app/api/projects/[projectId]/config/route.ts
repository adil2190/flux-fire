import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import type { FirebaseWebApp, FirebaseConfig } from "@/types/project"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()
    const { projectId } = await params

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // First, get the list of web apps for this project
    const appsResponse = await fetch(
      `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )

    if (!appsResponse.ok) {
      // If no web apps exist, we can try to create one or return a minimal config
      if (appsResponse.status === 404) {
        // Return a minimal config that allows basic operations
        return NextResponse.json({
          config: {
            projectId,
            apiKey: "", // User will need to get this from Firebase Console
            authDomain: `${projectId}.firebaseapp.com`,
            storageBucket: `${projectId}.appspot.com`,
          } as Partial<FirebaseConfig>,
          warning: "No web app found. Please create a web app in Firebase Console for full functionality.",
        })
      }

      const error = await appsResponse.text()
      console.error("Firebase API error (apps):", error)
      return NextResponse.json(
        { error: "Failed to fetch web apps" },
        { status: appsResponse.status }
      )
    }

    const appsData = await appsResponse.json()
    const apps: FirebaseWebApp[] = appsData.apps || []

    if (apps.length === 0) {
      return NextResponse.json({
        config: {
          projectId,
          apiKey: "",
          authDomain: `${projectId}.firebaseapp.com`,
          storageBucket: `${projectId}.appspot.com`,
        } as Partial<FirebaseConfig>,
        warning: "No web app found. Please create a web app in Firebase Console.",
      })
    }

    // Get the config for the first web app
    const appName = apps[0].name
    const configResponse = await fetch(
      `https://firebase.googleapis.com/v1beta1/${appName}/config`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )

    if (!configResponse.ok) {
      const error = await configResponse.text()
      console.error("Firebase API error (config):", error)
      return NextResponse.json(
        { error: "Failed to fetch config" },
        { status: configResponse.status }
      )
    }

    const config: FirebaseConfig = await configResponse.json()

    return NextResponse.json({ config })
  } catch (error) {
    console.error("Error fetching project config:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
