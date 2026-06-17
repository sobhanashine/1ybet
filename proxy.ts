import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/config";

// Pages reachable without a session.
const PUBLIC_PATHS = ["/login", "/offline"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Telegram webhook: must be publicly reachable so Telegram can POST updates.
  // The route handler authenticates the bot token / initData itself, so it does
  // not need a session cookie (and must not be redirected to /login).
  if (pathname.startsWith("/api/webhook")) {
    return NextResponse.next();
  }

  // Cron endpoints: protected by a shared-secret header.
  if (pathname.startsWith("/api/cron")) {
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Everything else requires a session cookie (full verification happens in the
  // page/action via getCurrentUser; admin authorization is checked there too).
  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|.*\\.png$|.*\\.svg$).*)",
  ],
};
