import { apiRequest } from '@/services/apiClient'

function sanitizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 60)
}

export async function ensureMemberProfile(user, preferredName = '') {
  if (!user?.uid) return null
  const token = await user.getIdToken()
  const fallbackName = sanitizeName(preferredName) || sanitizeName(user.displayName) || (user.email || 'Member')
  const data = await apiRequest('/member/profile', {
    method: 'POST',
    token,
    body: { fullName: fallbackName },
  })
  return data.profile || null
}

export async function getMemberProfile(uid) {
  void uid
  return null
}
