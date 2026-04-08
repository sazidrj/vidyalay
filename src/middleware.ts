import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // API routes need auth
  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Not logged in — redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // SUPER_ADMIN must stay in /superadmin, redirect if trying to access school routes
  if (session.user.role === "SUPER_ADMIN") {
    if (!pathname.startsWith("/superadmin")) {
      return NextResponse.redirect(new URL("/superadmin", req.url))
    }
    return NextResponse.next()
  }

  // Regular users must not access /superadmin
  if (pathname.startsWith("/superadmin")) {
    return NextResponse.redirect(new URL(`/${session.user.schoolSlug}`, req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
}
