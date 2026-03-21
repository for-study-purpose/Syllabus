import { apiRequest } from '@/services/apiClient'
import { auth } from '@/services/firebase'

async function requireAdminToken() {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Authentication required')
  }
  return user.getIdToken()
}

async function adminRequest(path, options = {}) {
  const token = await requireAdminToken()
  return apiRequest(path, { ...options, token })
}

export const listSubmissions = () => adminRequest('/admin/submissions')

export const approve = (id) => adminRequest(`/admin/approve/${id}`, { method: 'POST' })

export const reject = (id) => adminRequest(`/admin/reject/${id}`, { method: 'POST' })

export const unpublish = (id) => adminRequest(`/admin/unpublish/${id}`, { method: 'POST' })

export async function remove(id, fileId) {
  void fileId
  await adminRequest(`/admin/submission/${id}`, { method: 'DELETE' })
}

export const toggleDisplayName = (id, adminApprovedDisplay) =>
  adminRequest(`/admin/toggle-display/${id}`, {
    method: 'PATCH',
    body: { adminApprovedDisplay },
  })
