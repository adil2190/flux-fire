import { Sidebar } from "@/components/layout/sidebar"
import { ProjectAccessGuard } from "@/components/layout/project-access-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProjectAccessGuard>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-hidden bg-muted/30">{children}</main>
      </div>
    </ProjectAccessGuard>
  )
}
