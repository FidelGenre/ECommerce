// client/src/lib/http.js

const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * Wrapper para fetch con JSON + cookies + base URL automática.
 */
export async function fetchJSON(path, { method = "GET", body, headers } = {}) {
  let url = path;

  // Si NO es una URL absoluta → se concatena con VITE_API_URL
  if (!/^https?:\/\//i.test(path)) {
    const p = path.startsWith("/") ? path : `/${path}`;

    // 🔥 Permite que el user pase "admin/users" o "/admin/users"
    if (API_BASE.endsWith("/")) {
      url = API_BASE.slice(0, -1) + (p.startsWith("/api") ? p : `/api${p}`);
    } else {
      url = API_BASE + (p.startsWith("/api") ? p : `/api${p}`);
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    credentials: "include", // necesario para cookies cross-site
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // si el backend no manda JSON, data queda null
  }

  if (!res.ok) {
    const msg =
      data?.error || data?.message || res.statusText || "Request error";
    throw new Error(msg);
  }

  return data;
}
