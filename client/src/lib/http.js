// client/src/lib/http.js

// VITE_API_URL debe ser algo como:
// https://ecommerceserver-vpti.onrender.com/api
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "";

/**
 * Wrapper para fetch con JSON + cookies + base URL automática.
 */
export async function fetchJSON(path, { method = "GET", body, headers } = {}) {
  let url = path;

  // Si NO es URL absoluta → se concatena con API_BASE
  if (!/^https?:\/\//i.test(path)) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    // Si la ruta YA empieza con /auth, /admin, /orders...
    // la convertimos a /api/auth/... automáticamente
    const finalPath = cleanPath.startsWith("/api")
      ? cleanPath
      : `/api${cleanPath}`;

    // Unimos API_BASE + finalPath sin duplicar slashes
    url = API_BASE + finalPath;
  }

  const res = await fetch(url, {
    method,
    credentials: "include", // NECESARIO para cookies cross-site
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const msg =
      data?.error || data?.message || res.statusText || "Request error";
    throw new Error(msg);
  }

  return data;
}
