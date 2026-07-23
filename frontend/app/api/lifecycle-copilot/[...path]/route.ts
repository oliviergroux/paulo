import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, getSessionRole } from "@/lib/auth";
import { getAdminApiKey, getBackendUrl } from "@/lib/backend";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyLifecycleCopilotRequest(
  request: NextRequest,
  pathSegments: string[]
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const role = await getSessionRole(token);

  if (role !== "admin") {
    return NextResponse.json(
      { error: "unauthorized", detail: "admin_session_required" },
      { status: 401 }
    );
  }

  let adminApiKey: string;
  try {
    adminApiKey = getAdminApiKey();
  } catch {
    return NextResponse.json(
      { error: "misconfigured", detail: "admin_api_key_missing" },
      { status: 503 }
    );
  }

  const backendPath = `/lifecycle-copilot/${pathSegments.join("/")}`;
  const url = new URL(`${getBackendUrl()}${backendPath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers = new Headers();
  headers.set("X-Admin-Key", adminApiKey);

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
    if (contentType?.includes("multipart/form-data")) {
      init.body = await request.arrayBuffer();
    } else {
      init.body = await request.text();
    }
  }

  const response = await fetch(url.toString(), init);
  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyLifecycleCopilotRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyLifecycleCopilotRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyLifecycleCopilotRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyLifecycleCopilotRequest(request, path);
}
