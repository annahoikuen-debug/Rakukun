import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse, type NextRequest } from "next/server";
import { withRequestLogging } from "@/lib/middleware-logger";

// Edge-safe auth (no Prisma/bcrypt) — Node-only auth lives in ./auth.ts for handlers.
export const { auth } = NextAuth(authConfig);

export default auth((req: NextRequest) => {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const userId = (req as any).auth?.userId;

  const { pathname } = req.nextUrl;
  const isAuthRoute = pathname.startsWith("/api/auth");
  const isPublic =
    pathname === "/" ||
    pathname === "/signin" ||
    pathname.startsWith("/signin/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/faq" ||
    pathname.startsWith("/faq/") ||
    pathname === "/manual" ||
    pathname.startsWith("/manual/") ||
    pathname.startsWith("/training/") ||
    pathname.startsWith("/api/training/");
  const isLoggedIn = !!userId;

  let response: NextResponse;

  if (!isLoggedIn && !isPublic && !isAuthRoute) {
    if (pathname.startsWith("/api")) {
      response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } else {
      const url = req.nextUrl.clone();
      url.pathname = "/signin";
      response = NextResponse.redirect(url);
    }
  } else if (isLoggedIn && (pathname === "/signin" || pathname === "/signup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next();
  }

  return withRequestLogging(req, response, start, { requestId, userId });
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};