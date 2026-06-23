export async function adminFetch(path: string, init?: RequestInit) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`/api/admin${normalizedPath}`, {
    ...init,
    cache: "no-store",
  });
}

export async function mairieFetch(path: string, init?: RequestInit) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`/api/mairie${normalizedPath}`, {
    ...init,
    cache: "no-store",
  });
}

export async function partnerFetch(
  path: string,
  token: string,
  partnerId: string,
  init?: RequestInit
) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const separator = normalizedPath.includes("?") ? "&" : "?";
  const url = `/api/partner${normalizedPath}${separator}token=${encodeURIComponent(token)}&partner_id=${encodeURIComponent(partnerId)}`;

  return fetch(url, {
    ...init,
    cache: "no-store",
  });
}
