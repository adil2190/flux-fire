"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { toast } from "sonner"
import {
  Flame,
  Search,
  Database,
  Loader2,
  LogOut,
  FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useProjects, useProjectConfig } from "@/hooks/use-projects"
import { useProjectStore } from "@/stores/project-store"
import type { FirebaseProject } from "@/types/project"

export default function ProjectsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [search, setSearch] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const { data, isLoading, error } = useProjects()
  const { data: configData, isLoading: configLoading } = useProjectConfig(
    selectedProjectId ?? undefined
  )
  const { setSelectedProject, setFirebaseConfig } = useProjectStore()

  const projects = data?.projects || []
  const filteredProjects = projects.filter(
    (p) =>
      p.displayName.toLowerCase().includes(search.toLowerCase()) ||
      p.projectId.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectProject = async (project: FirebaseProject) => {
    setSelectedProjectId(project.projectId)
  }

  // Effect to handle config fetch completion
  if (configData?.config && selectedProjectId) {
    const project = projects.find((p) => p.projectId === selectedProjectId)
    if (project) {
      setSelectedProject(project)
      setFirebaseConfig(configData.config)
      toast.success(`Connected to ${project.displayName}`)
      router.push("/firestore")
    }
  }

  const userInitials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U"

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-500">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Fluxfire</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{session?.user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Your Firebase Projects</h1>
          <p className="mt-2 text-muted-foreground">
            Select a project to start managing your Firestore data and Authentication
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading your projects...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive">
              Failed to load projects. Please try again.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground/50" />
            <h2 className="mt-4 text-xl font-semibold">No Firebase Projects</h2>
            <p className="mt-2 max-w-md text-muted-foreground">
              You don&apos;t have any Firebase projects yet. Create one in the{" "}
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Firebase Console
              </a>
              .
            </p>
          </div>
        )}

        {/* Projects Grid */}
        {!isLoading && !error && filteredProjects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card
                key={project.projectId}
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                onClick={() => handleSelectProject(project)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950 dark:to-amber-950">
                      <Database className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">
                        {project.displayName}
                      </h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {project.projectId}
                      </p>
                      {project.resources?.locationId && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          📍 {project.resources.locationId}
                        </p>
                      )}
                    </div>
                    {configLoading && selectedProjectId === project.projectId && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && projects.length > 0 && filteredProjects.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">
              No projects match &quot;{search}&quot;
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
