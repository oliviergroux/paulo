import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE, getSessionRole } from "@/lib/auth";
import { getAdminApiKey, getBackendUrl } from "@/lib/backend";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const BLOCKED_FOR_MAIRIE = [
  /^\/partners\/\d+\/(activate|deactivate)$/,
  /^\/partners\/apply$/,
];

function isPathAllowedForMairie(method: string, path: string): boolean {
  if (method === "PATCH" && path.startsWith("/partners/")) return false;
  if (method === "POST" && BLOCKED_FOR_MAIRIE.some((pattern) => pattern.test(path))) {
    return false;
  }
  return true;
}

async function proxyMairieRequest(request: NextRequest, pathSegments: string[]) {
  const cookieStore = await cookies();
  const role = await getSessionRole(cookieStore.get(SESSION_COOKIE)?.value);

  if (role !== "admin" && role !== "mairie") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const backendPath = `/${pathSegments.join("/")}`;

  if (role === "mairie" && !isPathAllowedForMairie(request.method, backendPath)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(`${getBackendUrl()}${backendPath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers = new Headers();
  headers.set("X-Admin-Key", getAdminApiKey());

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const response = await fetch(url.toString(), init);
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyMairieRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyMairieRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyMairieRequest(request, path);
}
