"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
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
  const { data: session } = useSession()
  const { selectedProject, useEmulator, toggleEmulator, disconnect } =
    useProjectStore()

  const handleDisconnect = () => {
    disconnect()
    router.push("/projects")
  }

  const handleSignOut = () => {
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
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* Project Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-500">
          <Flame className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 overflow-hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto w-full justify-between p-0 font-normal hover:bg-transparent"
              >
                <div className="text-left">
                  <p className="truncate font-semibold">
                    {selectedProject?.displayName || "Fluxfire"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {useEmulator ? "Emulator" : "Production"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
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
        </div>
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
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Emulator Toggle */}
      <div className="p-4">
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
        {useEmulator && (
          <p className="mt-1 text-xs text-muted-foreground">
            Connected to local emulators
          </p>
        )}
      </div>

      <Separator />

      {/* User Section */}
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Avatar className="h-7 w-7">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{session?.user?.name}</span>
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
