import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Public routes
  const publicRoutes = ["/login", "/api/auth"]
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isPublicRoute && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Redirect authenticated users away from login page
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/projects", req.url))
  }

  // Redirect root to appropriate page
  if (pathname === "/") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/projects", req.url))
    } else {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Match all routes except static files and api routes (except auth)
    "/((?!_next/static|_next/image|favicon.ico|api/(?!auth)).*)",
  ],
}
