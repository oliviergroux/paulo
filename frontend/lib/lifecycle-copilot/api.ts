export async function lcFetch(path: string, init?: RequestInit) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`/api/lifecycle-copilot${normalizedPath}`, {
    ...init,
    cache: "no-store",
  });
}
