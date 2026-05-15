import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin and /api/admin routes. Login + public chat + widget stay open.
  const needsAuth = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!needsAuth) return NextResponse.next();

  const session = await readSessionFromRequest(req);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
