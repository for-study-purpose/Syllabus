'use strict'

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getDatabase } = require('firebase-admin/database')
const { google } = require('googleapis')

const app = express()
const PORT = process.env.PORT || 5000
const CORS_ORIGIN = process.env.CORS_ORIGIN || ''

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests (curl, server-to-server) without Origin header.
    if (!origin) return callback(null, true)

    if (!CORS_ORIGIN) {
      // Dev fallback: allow localhost origins when CORS_ORIGIN is not configured.
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
      return callback(isLocalhost ? null : new Error('CORS blocked'), isLocalhost)
    }

    const allowedOrigins = CORS_ORIGIN.split(',').map(v => v.trim()).filter(Boolean)
    const allowed = allowedOrigins.includes(origin)
    return callback(allowed ? null : new Error('CORS blocked'), allowed)
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.raw({ type: 'application/octet-stream', limit: '256mb' }))

// ─── Firebase Setup ─────────────────────────────────────────────────────────
function normalizeServiceAccount(raw) {
  const data = { ...(raw || {}) }

  // Env-based JSON often stores PEM with escaped newlines; convert them.
  if (typeof data.private_key === 'string') {
    data.private_key = data.private_key.replace(/\\n/g, '\n').trim()
  }

  if (typeof data.client_email === 'string') {
    data.client_email = data.client_email.trim()
  }

  return data
}

function loadFirebaseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (raw) {
    try {
      return normalizeServiceAccount(JSON.parse(raw))
    } catch (error) {
      console.warn('Invalid FIREBASE_SERVICE_ACCOUNT_JSON. Falling back to local key file.')
    }
  }

  const fromPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (fromPath && fs.existsSync(fromPath)) {
    return normalizeServiceAccount(JSON.parse(fs.readFileSync(fromPath, 'utf8')))
  }

  const localDefault = path.join(__dirname, 'firebase-key.json')
  if (fs.existsSync(localDefault)) {
    return normalizeServiceAccount(JSON.parse(fs.readFileSync(localDefault, 'utf8')))
  }

  const detected = fs
    .readdirSync(__dirname)
    .find(file => file.endsWith('.json') && file.includes('firebase-adminsdk'))

  if (detected) {
    const filePath = path.join(__dirname, detected)
    return normalizeServiceAccount(JSON.parse(fs.readFileSync(filePath, 'utf8')))
  }

  throw new Error('Firebase service account key not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.')
}

const serviceAccountJson = loadFirebaseServiceAccount()

initializeApp({
  credential: cert(serviceAccountJson),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
})
const adminAuth = getAuth()
const realtimeDb = getDatabase()

function nowTs() {
  return Date.now()
}

function rtdbRef(pathname) {
  return realtimeDb.ref(pathname)
}

// ─── Google Drive Setup ──────────────────────────────────────────────────────
const GDRIVE_SERVICE_ACCOUNT_JSON = process.env.GDRIVE_SERVICE_ACCOUNT_JSON
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || ''
const CHUNK_SIZE = 25 * 1024 * 1024 // 25 MiB chunks for 256 MB uploads

function makeServiceAccountAuth() {
  if (!GDRIVE_SERVICE_ACCOUNT_JSON) {
    throw new Error('GDRIVE_SERVICE_ACCOUNT_JSON is required for Google Drive access.')
  }
  const raw = GDRIVE_SERVICE_ACCOUNT_JSON.trim()
  if (!raw) {
    throw new Error('GDRIVE_SERVICE_ACCOUNT_JSON is empty.')
  }
  const credentials = JSON.parse(raw)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

async function getDriveAuth() {
  const svc = makeServiceAccountAuth()
  await svc.getAccessToken()
  return svc
}

async function getBearerToken(auth) {
  const at = await auth.getAccessToken()
  return typeof at === 'string' ? at : (at?.token || at)
}

function isDriveNotFoundError(err) {
  const code = Number(err?.code || err?.status || 0)
  return code === 404
}

function isDrivePermissionError(err) {
  const code = Number(err?.code || err?.status || 0)
  if (code === 401 || code === 403) return true

  const msg = String(err?.message || '').toLowerCase()
  return msg.includes('insufficient permissions') || msg.includes('permission')
}

function getBearerTokenFromRequest(req) {
  const raw = req.headers.authorization || ''
  if (!raw.startsWith('Bearer ')) return null
  return raw.slice('Bearer '.length).trim()
}

async function requireAuthUser(req, res) {
  const idToken = getBearerTokenFromRequest(req)
  if (!idToken) {
    res.status(401).json({ error: 'Authentication required.' })
    return null
  }

  try {
    return await adminAuth.verifyIdToken(idToken)
  } catch {
    res.status(401).json({ error: 'Invalid or expired token. Please login again.' })
    return null
  }
}

async function isAdminUser(uid) {
  if (!uid) return false

  try {
    const userRecord = await adminAuth.getUser(uid)
    if (userRecord?.customClaims?.admin === true) return true
  } catch {
    // Fall through to member-role check.
  }

  try {
    const memberSnap = await realtimeDb.ref(`members/${uid}`).get()
    if (!memberSnap.exists()) return false
    return String(memberSnap.val()?.role || '').toLowerCase() === 'admin'
  } catch {
    return false
  }
}

async function requireAdminUser(req, res) {
  const decoded = await requireAuthUser(req, res)
  if (!decoded) return null

  const admin = await isAdminUser(decoded.uid)
  if (!admin) {
    res.status(403).json({ error: 'Admin access required.' })
    return null
  }

  return decoded
}

function mapRtdbCollectionObject(raw) {
  return Object.entries(raw || {}).map(([id, data]) => ({ id, ...(data || {}) }))
}

function sortByCreatedAtDesc(items) {
  return items.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
}

function applyQueryFilters(items, query) {
  return items.filter(item => {
    if (query.category && item.category !== query.category) return false
    if (query.type && item.type !== query.type) return false
    if (query.status && item.status !== query.status) return false
    if (query.subject && item.subject !== query.subject) return false
    return true
  })
}

async function requireMember(req, res) {
  const idToken = getBearerTokenFromRequest(req)
  if (!idToken) {
    res.status(401).json({ error: 'Authentication required. Login as a member to upload.' })
    return null
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken)
    const memberSnap = await realtimeDb.ref(`members/${decoded.uid}`).get()
    if (!memberSnap.exists()) {
      res.status(403).json({ error: 'Member account not found. Please register first.' })
      return null
    }

    const member = memberSnap.val() || {}
    return { decoded, member }
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token. Please login again.' })
    return null
  }
}

// ─── Upload Routes ──────────────────────────────────────────────────────────

/**
 * POST /api/upload/init
 * Initialize upload session on Google Drive
 */
app.post('/api/upload/init', async (req, res) => {
  try {
    const memberContext = await requireMember(req, res)
    if (!memberContext) return

    const { fileName, mimeType, fileSize, category, type, title, description,
            subject, unit, uploaderName, fileType, displayNameOnSite } = req.body

    if (!fileName || !fileSize) {
      return res.status(400).json({ error: 'fileName and fileSize required' })
    }

    const auth = await getDriveAuth()
    const token = await getBearerToken(auth)

    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType || 'application/octet-stream',
          'X-Upload-Content-Length': String(fileSize),
        },
        body: JSON.stringify({ name: fileName, parents: [DRIVE_FOLDER_ID] }),
      }
    )

    if (!initRes.ok) {
      const err = await initRes.text()
      console.error('Drive resumable init failed:', initRes.status, err)
      return res.status(500).json({ error: 'Failed to create upload session' })
    }

    const resumableUri = initRes.headers.get('location')
    const resolvedUploaderName = (memberContext.member.fullName || uploaderName || '').trim() || (memberContext.decoded.email || 'Member')

    const sessionRef = rtdbRef('uploadSessions').push()
    await sessionRef.set({
      resumableUri,
      fileName,
      mimeType: mimeType || 'application/octet-stream',
      fileSize: Number(fileSize),
      category: (category || 'submission').toLowerCase(),
      type: (type || 'other').toLowerCase(),
      title: (title || '').trim(),
      description: (description || '').trim(),
      subject: (subject || '').trim(),
      unit: (unit || '').trim(),
      uploaderUid: memberContext.decoded.uid,
      uploaderEmail: memberContext.decoded.email || '',
      uploaderName: resolvedUploaderName,
      fileType: fileType || 'pdf',
      displayNameOnSite: Boolean(displayNameOnSite),
      createdAt: nowTs(),
    })

    res.json({ sessionId: sessionRef.key, chunkSize: CHUNK_SIZE })
  } catch (err) {
    console.error('initUpload error:', err)
    res.status(500).json({ error: String(err?.message || 'Init failed') })
  }
})

/**
 * POST /api/upload/chunk
 * Upload file chunk to Google Drive resumable session
 * Query: ?sessionId=...&start=0&end=20971519&total=106000000
 */
app.post('/api/upload/chunk', async (req, res) => {
  try {
    const memberContext = await requireMember(req, res)
    if (!memberContext) return

    const { sessionId, start, end, total } = req.query

    if (!sessionId || start == null || end == null || total == null) {
      return res.status(400).json({ error: 'Missing query: sessionId, start, end, total' })
    }

    const sessionSnap = await rtdbRef(`uploadSessions/${sessionId}`).get()
    if (!sessionSnap.exists()) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const session = sessionSnap.val()
    if (session.uploaderUid && session.uploaderUid !== memberContext.decoded.uid) {
      return res.status(403).json({ error: 'This upload session belongs to another user.' })
    }

    const chunkData = req.body

    if (!chunkData || chunkData.length === 0) {
      return res.status(400).json({ error: 'Empty chunk' })
    }

    // Forward chunk to Drive resumable URI
    const putRes = await fetch(session.resumableUri, {
      method: 'PUT',
      headers: {
        'Content-Length': String(chunkData.length),
        'Content-Range': `bytes ${start}-${end}/${total}`,
      },
      body: chunkData,
    })

    // 308 Resume Incomplete → more chunks needed
    if (putRes.status === 308) {
      return res.json({ done: false, uploaded: Number(end) + 1 })
    }

    // 200/201 → upload complete
    if (putRes.ok) {
      const driveData = await putRes.json()
      const fileId = driveData.id
      const fileSize = Number(driveData.size) || 0

      // Make publicly readable
      const auth = await getDriveAuth()
      const drive = google.drive({ version: 'v3', auth })
      await drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        requestBody: { role: 'reader', type: 'anyone' },
      })

      // Save submission in Realtime Database
      const submissionRef = rtdbRef('submissions').push()
      await submissionRef.set({
        category: session.category,
        type: session.type,
        title: session.title,
        description: session.description,
        subject: session.subject,
        unit: session.unit,
        uploaderUid: session.uploaderUid || memberContext.decoded.uid,
        uploaderEmail: session.uploaderEmail || memberContext.decoded.email || '',
        uploaderName: session.uploaderName,
        fileName: session.fileName,
        fileType: session.fileType,
        fileId,
        fileSize,
        status: 'pending',
        displayNameOnSite: session.displayNameOnSite || false,
        adminApprovedDisplay: false,
        createdAt: nowTs(),
      })

      // Clean up temp session
      await rtdbRef(`uploadSessions/${sessionId}`).remove()

      return res.json({ done: true, id: submissionRef.key })
    }

    // Unexpected Drive response
    const errText = await putRes.text()
    console.error('Drive chunk error:', putRes.status, errText)
    res.status(500).json({ error: `Drive error (${putRes.status})` })
  } catch (err) {
    console.error('uploadChunk error:', err)
    res.status(500).json({ error: err.message || 'Chunk failed' })
  }
})

// ─── Delete Routes ──────────────────────────────────────────────────────────

/**
 * DELETE /api/file/:fileId
 * Delete a file from Google Drive and Realtime Database (user/admin can delete)
 */
app.delete('/api/file/:fileId', async (req, res) => {
  try {
    const decoded = await requireAuthUser(req, res)
    if (!decoded) return

    const { fileId } = req.params
    const { docId } = req.body

    if (!fileId) return res.status(400).json({ error: 'fileId required' })
    if (!docId) return res.status(400).json({ error: 'docId required' })

    const auth = await getDriveAuth()
    const drive = google.drive({ version: 'v3', auth })

    const submissionRef = rtdbRef(`submissions/${docId}`)
    const submissionSnap = await submissionRef.get()
    if (!submissionSnap.exists()) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    const submission = submissionSnap.val() || {}
    const admin = await isAdminUser(decoded.uid)
    const owner = submission.uploaderUid === decoded.uid
    if (!admin && !owner) {
      return res.status(403).json({ error: 'Not authorized to delete this file.' })
    }

    let deletedFromDrive = true
    let driveDeleteWarning = ''
    try {
      await drive.files.delete({ fileId, supportsAllDrives: true })
    } catch (driveErr) {
      if (isDriveNotFoundError(driveErr)) {
        deletedFromDrive = false
        driveDeleteWarning = 'File was already missing on Drive.'
      } else if (isDrivePermissionError(driveErr)) {
        // Some legacy files may be owned outside service account scope.
        deletedFromDrive = false
        driveDeleteWarning = 'File could not be removed from Drive due to insufficient permissions.'
        console.warn('Drive permission denied during user delete:', driveErr?.message || driveErr)
      } else {
        throw driveErr
      }
    }

    await submissionRef.remove()
    res.json({ success: true, deletedFromDrive, driveDeleteWarning })
  } catch (err) {
    console.error('deleteFile error:', err.message)
    res.status(500).json({ error: err.message || 'Delete failed' })
  }
})

// ─── Admin Routes ───────────────────────────────────────────────────────────

/**
 * POST /api/admin/approve/:submissionId
 * Approve a pending submission
 */
app.post('/api/admin/approve/:submissionId', async (req, res) => {
  try {
    const decoded = await requireAdminUser(req, res)
    if (!decoded) return

    const { submissionId } = req.params

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId required' })
    }

    const submissionRef = rtdbRef(`submissions/${submissionId}`)
    const submissionSnap = await submissionRef.get()

    if (!submissionSnap.exists()) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    await submissionRef.update({
      status: 'approved',
      approvedAt: nowTs(),
    })

    res.json({ success: true, message: 'Submission approved' })
  } catch (err) {
    console.error('approve error:', err)
    res.status(500).json({ error: err.message || 'Approval failed' })
  }
})

/**
 * POST /api/admin/reject/:submissionId
 * Reject a pending submission
 */
app.post('/api/admin/reject/:submissionId', async (req, res) => {
  try {
    const decoded = await requireAdminUser(req, res)
    if (!decoded) return

    const { submissionId } = req.params
    const { reason } = req.body

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId required' })
    }

    const submissionRef = rtdbRef(`submissions/${submissionId}`)
    const submissionSnap = await submissionRef.get()

    if (!submissionSnap.exists()) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    await submissionRef.update({
      status: 'rejected',
      rejectionReason: reason || '',
      rejectedAt: nowTs(),
    })

    res.json({ success: true, message: 'Submission rejected' })
  } catch (err) {
    console.error('reject error:', err)
    res.status(500).json({ error: err.message || 'Rejection failed' })
  }
})

async function updateDisplayApproval(req, res) {
  try {
    const decoded = await requireAdminUser(req, res)
    if (!decoded) return

    const { submissionId } = req.params

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId required' })
    }

    const submissionRef = rtdbRef(`submissions/${submissionId}`)
    const submissionSnap = await submissionRef.get()

    if (!submissionSnap.exists()) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    const currentApprovedDisplay = submissionSnap.val().adminApprovedDisplay || false
    const requestedValue = req.body?.adminApprovedDisplay
    const nextApprovedDisplay = typeof requestedValue === 'boolean'
      ? requestedValue
      : !currentApprovedDisplay

    await submissionRef.update({
      adminApprovedDisplay: nextApprovedDisplay,
      displayDecisionAt: nowTs(),
    })

    res.json({
      success: true,
      message: `Display name ${nextApprovedDisplay ? 'approved' : 'removed'}`,
      adminApprovedDisplay: nextApprovedDisplay,
    })
  } catch (err) {
    console.error('toggleDisplay error:', err)
    res.status(500).json({ error: err.message || 'Toggle failed' })
  }
}

/**
 * PATCH /api/admin/toggle-display/:submissionId
 * Update whether uploader name is displayed on site
 * Optional body: { adminApprovedDisplay: boolean }
 */
app.patch('/api/admin/toggle-display/:submissionId', updateDisplayApproval)

/**
 * POST /api/admin/toggle-display/:submissionId
 * Backward-compatible toggle endpoint
 */
app.post('/api/admin/toggle-display/:submissionId', updateDisplayApproval)

/**
 * DELETE /api/admin/submission/:submissionId
 * Delete a submission (remove file and record)
 */
app.delete('/api/admin/submission/:submissionId', async (req, res) => {
  try {
    const decoded = await requireAdminUser(req, res)
    if (!decoded) return

    const { submissionId } = req.params

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId required' })
    }

    const submissionRef = rtdbRef(`submissions/${submissionId}`)
    const submissionSnap = await submissionRef.get()

    if (!submissionSnap.exists()) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    const data = submissionSnap.val()
    const { fileId } = data

    // Delete from Google Drive
    let deletedFromDrive = true
    let driveDeleteWarning = ''
    if (fileId) {
      const auth = await getDriveAuth()
      const drive = google.drive({ version: 'v3', auth })
      try {
        await drive.files.delete({ fileId, supportsAllDrives: true })
      } catch (driveErr) {
        if (isDriveNotFoundError(driveErr)) {
          deletedFromDrive = false
          driveDeleteWarning = 'File was already missing on Drive.'
        } else if (isDrivePermissionError(driveErr)) {
          // Keep moderation usable even if a legacy file is not deletable by service account.
          deletedFromDrive = false
          driveDeleteWarning = 'File could not be removed from Drive due to insufficient permissions.'
          console.warn('Drive permission denied during admin delete:', driveErr?.message || driveErr)
        } else {
          throw driveErr
        }
      }
    }

    // Delete from Realtime Database
    await submissionRef.remove()

    res.json({
      success: true,
      message: deletedFromDrive
        ? 'Submission deleted'
        : 'Submission removed from database with Drive delete warning',
      deletedFromDrive,
      driveDeleteWarning,
    })
  } catch (err) {
    console.error('deleteSubmission error:', err)
    res.status(500).json({ error: err.message || 'Delete failed' })
  }
})

/**
 * POST /api/admin/unpublish/:submissionId
 * Unpublish (revert to pending) an approved submission
 */
app.post('/api/admin/unpublish/:submissionId', async (req, res) => {
  try {
    const decoded = await requireAdminUser(req, res)
    if (!decoded) return

    const { submissionId } = req.params

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId required' })
    }

    const submissionRef = rtdbRef(`submissions/${submissionId}`)
    const submissionSnap = await submissionRef.get()

    if (!submissionSnap.exists()) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    await submissionRef.update({
      status: 'pending',
      unpublishedAt: nowTs(),
    })

    res.json({ success: true, message: 'Submission unpublished' })
  } catch (err) {
    console.error('unpublish error:', err)
    res.status(500).json({ error: err.message || 'Unpublish failed' })
  }
})

/**
 * PUT /api/admin/submission/:submissionId
 * Update submission details (title, description, etc.)
 */
app.put('/api/admin/submission/:submissionId', async (req, res) => {
  try {
    const decoded = await requireAdminUser(req, res)
    if (!decoded) return

    const { submissionId } = req.params
    const updates = req.body

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId required' })
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' })
    }

    const submissionRef = rtdbRef(`submissions/${submissionId}`)
    const submissionSnap = await submissionRef.get()

    if (!submissionSnap.exists()) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    // Only allow specific fields to be updated
    const allowedFields = ['title', 'description', 'subject']
    const safeUpdates = {}
    allowedFields.forEach(field => {
      if (field in updates) {
        safeUpdates[field] = updates[field]
      }
    })

    safeUpdates.updatedAt = nowTs()

    await submissionRef.update(safeUpdates)

    res.json({ success: true, message: 'Submission updated', updates: safeUpdates })
  } catch (err) {
    console.error('updateSubmission error:', err)
    res.status(500).json({ error: err.message || 'Update failed' })
  }
})

// ─── Health Check ───────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Check backend and Google Drive connectivity
 */
app.get('/api/health', async (req, res) => {
  try {
    const auth = await getDriveAuth()
    const drive = google.drive({ version: 'v3', auth })

    if (!DRIVE_FOLDER_ID) {
      return res.status(500).json({ ok: false, error: 'DRIVE_FOLDER_ID missing' })
    }

    await drive.files.get({
      fileId: DRIVE_FOLDER_ID,
      supportsAllDrives: true,
      fields: 'id,name',
    })

    // Validate upload capability
    const test = await drive.files.create({
      requestBody: {
        name: `health-${Date.now()}.txt`,
        parents: [DRIVE_FOLDER_ID],
        mimeType: 'text/plain',
      },
      media: {
        mimeType: 'text/plain',
        body: 'ok',
      },
      fields: 'id',
      supportsAllDrives: true,
    })

    if (test?.data?.id) {
      await drive.files.delete({ fileId: test.data.id, supportsAllDrives: true })
    }

    return res.json({ ok: true, backend: 'running' })
  } catch (err) {
    return res.status(503).json({ ok: false, error: String(err?.message || err) })
  }
})

/**
 * GET /api/public/static-files
 * Public list of static files from RTDB.
 */
app.get('/api/public/static-files', async (req, res) => {
  try {
    const snap = await rtdbRef('staticFiles').get()
    const docs = mapRtdbCollectionObject(snap.val())
    const filtered = applyQueryFilters(docs, req.query)
    res.json({ items: sortByCreatedAtDesc(filtered) })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load static files' })
  }
})

/**
 * GET /api/public/submissions
 * Public list of submissions from RTDB.
 */
app.get('/api/public/submissions', async (req, res) => {
  try {
    const snap = await rtdbRef('submissions').get()
    const docs = mapRtdbCollectionObject(snap.val())
    // Public feed must expose only approved submissions.
    const publicDocs = docs.filter(item => item.status === 'approved')
    const filtered = applyQueryFilters(publicDocs, req.query)
    res.json({ items: sortByCreatedAtDesc(filtered) })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load submissions' })
  }
})

/**
 * GET /api/admin/submissions
 * Admin list of all submissions.
 */
app.get('/api/admin/submissions', async (req, res) => {
  try {
    const decoded = await requireAdminUser(req, res)
    if (!decoded) return

    const snap = await rtdbRef('submissions').get()
    const docs = mapRtdbCollectionObject(snap.val())
    res.json({ items: sortByCreatedAtDesc(docs) })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load admin submissions' })
  }
})

/**
 * GET /api/member/profile
 * Authenticated member profile.
 */
app.get('/api/member/profile', async (req, res) => {
  try {
    const decoded = await requireAuthUser(req, res)
    if (!decoded) return

    const profileRef = rtdbRef(`members/${decoded.uid}`)
    const profileSnap = await profileRef.get()
    if (!profileSnap.exists()) {
      return res.status(404).json({ error: 'Member profile not found' })
    }

    res.json({ profile: profileSnap.val() })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load profile' })
  }
})

/**
 * POST /api/member/profile
 * Authenticated profile upsert.
 */
app.post('/api/member/profile', async (req, res) => {
  try {
    const decoded = await requireAuthUser(req, res)
    if (!decoded) return

    const profileRef = rtdbRef(`members/${decoded.uid}`)
    const existingSnap = await profileRef.get()
    const existing = existingSnap.exists() ? existingSnap.val() : {}
    const cleanName = String(req.body?.fullName || decoded.name || existing.fullName || decoded.email || 'Member')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 60)

    const now = nowTs()
    const profile = {
      uid: decoded.uid,
      email: decoded.email || existing.email || '',
      fullName: cleanName,
      role: existing.role || 'member',
      createdAt: existing.createdAt || now,
      updatedAt: now,
    }

    await profileRef.set(profile)
    res.json({ profile })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save profile' })
  }
})

/**
 * GET /api
 * API welcome message
 */
app.get('/api', (req, res) => {
  res.json({
    message: 'Syllabus Backend API',
    version: '1.0.0',
    endpoints: {
      upload: [
        'POST /api/upload/init',
        'POST /api/upload/chunk',
      ],
      delete: [
        'DELETE /api/file/:fileId',
      ],
      admin: [
        'GET /api/admin/submissions',
        'POST /api/admin/approve/:submissionId',
        'POST /api/admin/reject/:submissionId',
        'POST /api/admin/toggle-display/:submissionId',
        'DELETE /api/admin/submission/:submissionId',
        'POST /api/admin/unpublish/:submissionId',
        'PUT /api/admin/submission/:submissionId',
      ],
      public: [
        'GET /api/public/static-files',
        'GET /api/public/submissions',
      ],
      member: [
        'GET /api/member/profile',
        'POST /api/member/profile',
      ],
      health: [
        'GET /api/health',
      ],
    },
  })
})

// ─── 404 Handler ────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// ─── Error Handler ──────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ─── Start Server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`)
  console.log(`📚 API docs at http://localhost:${PORT}/api`)
})

module.exports = app
