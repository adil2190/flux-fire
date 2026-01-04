"use client"

import { Database } from "lucide-react"
import { useProjectStore } from "@/stores/project-store"

export default function FirestorePage() {
  const { selectedProject, firebaseConfig } = useProjectStore()

  if (!selectedProject || !firebaseConfig) {
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

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Firestore</h1>
        <p className="text-muted-foreground">
          Browse and manage your Firestore collections
        </p>
      </div>

      <div className="flex-1 rounded-lg border bg-card p-6">
        <div className="flex h-full items-center justify-center text-center">
          <div>
            <Database className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">
              Connected to {selectedProject.displayName}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Project ID: {selectedProject.projectId}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Firestore browser coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
