"use client"

import { Users } from "lucide-react"
import { useProjectStore } from "@/stores/project-store"

export default function AuthPage() {
  const { selectedProject } = useProjectStore()

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Authentication</h1>
        <p className="text-muted-foreground">
          Manage your Firebase Authentication users
        </p>
      </div>

      <div className="flex-1 rounded-lg border bg-card p-6">
        <div className="flex h-full items-center justify-center text-center">
          <div>
            <Users className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">User Management</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedProject
                ? `Managing users for ${selectedProject.displayName}`
                : "Select a project to manage users"}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Authentication management coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
