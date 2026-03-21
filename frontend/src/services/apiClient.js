const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function parseJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await parseJsonSafe(res)
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`)
  }

  return data || {}
}

export function getApiBaseUrl() {
  return API_BASE
}
