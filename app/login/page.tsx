import { Flame } from "lucide-react"
import { SignInButton } from "@/components/auth/sign-in-button"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-lg">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg">
            <Flame className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Fluxfire</h1>
          <p className="text-center text-muted-foreground">
            Modern Firebase Admin Panel
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
              <span className="text-orange-600 dark:text-orange-400">🔥</span>
            </div>
            <span>Browse and edit Firestore collections</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
              <span className="text-orange-600 dark:text-orange-400">👥</span>
            </div>
            <span>Manage Firebase Authentication users</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
              <span className="text-orange-600 dark:text-orange-400">⚡</span>
            </div>
            <span>Query data with visual builder or JavaScript</span>
          </div>
        </div>

        {/* Sign In Button */}
        <SignInButton />

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Sign in with your Google account to access your Firebase projects
        </p>
      </div>
    </div>
  )
}
