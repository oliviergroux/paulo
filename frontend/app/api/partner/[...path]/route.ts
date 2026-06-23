import { NextRequest, NextResponse } from "next/server";

import { getBackendUrl } from "@/lib/backend";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyPartnerRequest(request: NextRequest, pathSegments: string[]) {
  const token = request.nextUrl.searchParams.get("token");
  const partnerId = request.nextUrl.searchParams.get("partner_id");

  if (!token || !partnerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const backendPath = `/${pathSegments.join("/")}`;
  const url = new URL(`${getBackendUrl()}${backendPath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    if (key === "token" || key === "partner_id") {
      return;
    }
    url.searchParams.set(key, value);
  });

  url.searchParams.set("token", token);

  const headers = new Headers();
  headers.set("X-Partner-Token", token);
  headers.set("X-Partner-Id", partnerId);

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
  return proxyPartnerRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyPartnerRequest(request, path);
}
