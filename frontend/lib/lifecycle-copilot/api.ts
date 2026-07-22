export async function lcFetch(path: string, init?: RequestInit) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`/api/lifecycle-copilot${normalizedPath}`, {
    ...init,
    cache: "no-store",
  });
}

export async function lcUpload(path: string, formData: FormData, init?: RequestInit) {
  return lcFetch(path, {
    ...init,
    method: "POST",
    body: formData,
  });
}

export async function readLcError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) return data.detail.map(String).join(", ");
    if (typeof data?.error === "string") return data.error;
  } catch {
    // ignore
  }
  return `Erreur ${response.status}`;
}
