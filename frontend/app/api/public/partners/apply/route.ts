import { NextRequest, NextResponse } from "next/server";

import { getBackendUrl } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = new Headers();

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const response = await fetch(`${getBackendUrl()}/partners/apply`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  const responseBody = await response.text();

  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}
