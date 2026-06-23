import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  getSessionRole,
  isAdminOnlyPath,
} from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/devenir-partenaire"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/partner") ||
    pathname.startsWith("/_next") ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const role = await getSessionRole(session);

  if (!role) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (role === "mairie" && isAdminOnlyPath(pathname)) {
    const mairieUrl = request.nextUrl.clone();
    mairieUrl.pathname = "/mairie";
    mairieUrl.search = "";
    return NextResponse.redirect(mairieUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
