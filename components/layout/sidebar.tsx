"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  Database,
  Users,
  Terminal,
  Settings,
  Zap,
  LogOut,
  Flame,
  ChevronDown,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProjectStore } from "@/stores/project-store"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/firestore", icon: Database, label: "Firestore" },
  { href: "/auth", icon: Users, label: "Authentication" },
  { href: "/query", icon: Terminal, label: "Query" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const qc = useQueryClient()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const { selectedProject, useEmulator, toggleEmulator, disconnect } =
    useProjectStore()

  const handleDisconnect = () => {
    if (selectedProject) {
      qc.removeQueries({
        queryKey: ["firestore", selectedProject.projectId],
      })
      qc.removeQueries({
        queryKey: ["firebase-config", selectedProject.projectId],
      })
      qc.removeQueries({
        queryKey: ["firebase-project-access", selectedProject.projectId],
      })
    }
    disconnect()
    router.push("/projects")
  }

  const handleSignOut = () => {
    qc.removeQueries({ queryKey: ["firestore"] })
    qc.removeQueries({ queryKey: ["firebase-config"] })
    qc.removeQueries({ queryKey: ["firebase-project-access"] })
    qc.removeQueries({ queryKey: ["firebase-projects"] })
    disconnect()
    signOut({ callbackUrl: "/login" })
  }

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U"

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r bg-card transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Project Header */}
      <div
        className={cn(
          "flex items-center gap-3 p-4",
          collapsed && "flex-col gap-2 p-2"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label={collapsed ? "Open project menu" : undefined}
              title={
                collapsed
                  ? selectedProject?.displayName || "Fluxfire"
                  : undefined
              }
              className={cn(
                "h-auto min-w-0 justify-start p-0 font-normal hover:bg-transparent",
                collapsed ? "w-10 justify-center" : "flex-1"
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-500">
                <Flame className="h-5 w-5 text-white" />
              </span>
              {!collapsed && (
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {selectedProject?.displayName || "Fluxfire"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {useEmulator ? "Emulator" : "Production"}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={collapsed ? "start" : "end"}>
            <DropdownMenuItem onClick={() => router.push("/projects")}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Switch Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDisconnect}>
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Emulator Toggle */}
      <div className={cn("p-4", collapsed && "p-2")}>
        {collapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mx-auto h-9 w-9"
            aria-label={useEmulator ? "Disable emulator" : "Enable emulator"}
            title={useEmulator ? "Emulator on" : "Emulator off"}
            onClick={toggleEmulator}
          >
            <Zap
              className={cn(
                "h-4 w-4",
                useEmulator ? "text-yellow-500" : "text-muted-foreground"
              )}
            />
          </Button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap
                className={cn(
                  "h-4 w-4",
                  useEmulator ? "text-yellow-500" : "text-muted-foreground"
                )}
              />
              <Label htmlFor="emulator-sidebar" className="text-sm font-medium">
                Emulator
              </Label>
            </div>
            <Switch
              id="emulator-sidebar"
              checked={useEmulator}
              onCheckedChange={toggleEmulator}
            />
          </div>
        )}
        {!collapsed && useEmulator && (
          <p className="mt-1 text-xs text-muted-foreground">
            Connected to local emulators
          </p>
        )}
      </div>

      <Separator />

      {/* User Section */}
      <div className={cn("p-4", collapsed && "p-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3",
                collapsed && "justify-center px-1"
              )}
              aria-label={
                collapsed ? session?.user?.name || "User menu" : undefined
              }
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span className="truncate text-sm">{session?.user?.name}</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {session?.user?.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
