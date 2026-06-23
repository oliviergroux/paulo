import { NextResponse } from "next/server";

import { getBackendUrl } from "@/lib/backend";

export async function GET() {
  const response = await fetch(`${getBackendUrl()}/communes/active`, {
    cache: "no-store",
  });
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}
