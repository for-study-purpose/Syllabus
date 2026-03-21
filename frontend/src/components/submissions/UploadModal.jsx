import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { SEMESTERS } from '@/constants/subjects'
import Spinner from '@/components/ui/Spinner'
import { getApiBaseUrl } from '@/services/apiClient'

const MAX_FILE_SIZE = 256 * 1024 * 1024

function getFileSizeLabel(bytes) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

function makeFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function uploadChunkWithProgress({ url, chunk, idToken, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.setRequestHeader('Authorization', `Bearer ${idToken}`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded, event.total)
      }
    }

    xhr.onerror = () => reject(new Error('Network error during chunk upload'))

    xhr.onload = () => {
      let parsed = null
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        parsed = null
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed || {})
        return
      }

      reject(new Error(parsed?.error || `Chunk upload failed (${xhr.status})`))
    }

    xhr.send(chunk)
  })
}

export default function UploadModal({ onClose, onSuccess, type = 'assignment', authUser, memberProfile }) {
  const resolvedName = (memberProfile?.fullName || authUser?.displayName || authUser?.email || '').trim()
  const initFormData = type === 'other'
    ? { subject: '', title: '', name: resolvedName, displayNameOnSite: false }
    : { semester: '', subject: '', title: '', unit: '', name: resolvedName, displayNameOnSite: false }

  const [formData, setFormData] = useState(initFormData)
  const [files, setFiles] = useState([])
  const [fileProgressMap, setFileProgressMap] = useState({})
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [showUploadLockToast, setShowUploadLockToast] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (!resolvedName) return
    setFormData(prev => ({ ...prev, name: resolvedName }))
  }, [resolvedName])

  const selectedSemester = type !== 'other' ? SEMESTERS.find(s => s.sem === formData.semester) : null
  const subjects = selectedSemester?.subjects || []
  const progressEntries = useMemo(() => Object.values(fileProgressMap), [fileProgressMap])

  const totalBytes = progressEntries.reduce((sum, item) => sum + (item.totalBytes || 0), 0)
  const totalUploadedBytes = progressEntries.reduce((sum, item) => sum + (item.uploadedBytes || 0), 0)
  const totalSpeedBytesPerSecond = progressEntries.reduce((sum, item) => sum + (item.speedBytesPerSecond || 0), 0)
  const uploadProgress = totalBytes ? Math.min(100, Math.round((totalUploadedBytes / totalBytes) * 100)) : 0
  const hasActiveUploads = progressEntries.some(item => item.status === 'queued' || item.status === 'uploading')
  const activeUploadCount = progressEntries.filter(item => item.status === 'queued' || item.status === 'uploading').length

  const submitCandidates = files.filter(item => {
    const status = fileProgressMap[makeFileKey(item)]?.status
    return !status || status === 'pending' || status === 'failed'
  })

  const isFormComplete = type === 'other'
    ? formData.subject && formData.title.trim() && formData.name.trim() && submitCandidates.length > 0
    : formData.semester && formData.subject && formData.title.trim() && formData.name.trim() && submitCandidates.length > 0

  useEffect(() => {
    if (!showUploadLockToast) return
    const timer = setTimeout(() => setShowUploadLockToast(false), 2200)
    return () => clearTimeout(timer)
  }, [showUploadLockToast])

  function handleAttemptClose() {
    if (hasActiveUploads) {
      setShowUploadLockToast(true)
      return
    }
    onClose()
  }

  function handleInputChange(e) {
    const { name, value, type: inputType, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value,
    }))
    if (name === 'semester') {
      setFormData(prev => ({ ...prev, subject: '' }))
    }
  }

  function addFiles(fileList) {
    const picked = Array.from(fileList || [])
    if (!picked.length) return

    const tooLarge = picked.find(item => item.size > MAX_FILE_SIZE)
    if (tooLarge) {
      setError(`"${tooLarge.name}" exceeds 256MB max size.`)
      return
    }

    setFiles(prev => {
      const existing = new Set(prev.map(makeFileKey))
      const unique = picked.filter(item => !existing.has(makeFileKey(item)))
      return [...prev, ...unique]
    })

    setFileProgressMap(prev => {
      const next = { ...prev }
      picked.forEach(item => {
        const key = makeFileKey(item)
        if (!next[key]) {
          next[key] = {
            uploadedBytes: 0,
            totalBytes: item.size,
            progress: 0,
            speedBytesPerSecond: 0,
            status: 'pending',
          }
        }
      })
      return next
    })

    setError('')
  }

  function handleFileChange(e) {
    addFiles(e.target.files)
  }

  function handleDrag(e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    addFiles(e.dataTransfer?.files)
  }

  function removeFile(targetKey) {
    const status = fileProgressMap[targetKey]?.status
    if (status === 'uploading' || status === 'queued') return

    setFiles(prev => prev.filter(item => makeFileKey(item) !== targetKey))
    setFileProgressMap(prev => {
      const next = { ...prev }
      delete next[targetKey]
      return next
    })
    setError('')
  }

  async function uploadSingleFile(file, idToken, apiBase, submissionMeta) {
    const key = makeFileKey(file)

    const requestBody = {
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      category: 'submission',
      type,
      title: submissionMeta.title,
      description: '',
      subject: submissionMeta.subject,
      uploaderName: submissionMeta.name,
      fileType: 'pdf',
      displayNameOnSite: submissionMeta.displayNameOnSite,
    }

    if (type === 'practical') {
      requestBody.unit = submissionMeta.unit || ''
    } else if (type !== 'other') {
      requestBody.unit = submissionMeta.unit || ''
    }

    const initRes = await fetch(`${apiBase}/upload/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!initRes.ok) {
      const errData = await initRes.json()
      throw new Error(errData.error || `Failed to initiate upload for ${file.name}`)
    }

    const { sessionId, chunkSize } = await initRes.json()
    const totalChunks = Math.ceil(file.size / chunkSize)
    let lastUploadedBytes = 0
    let lastSpeedTick = performance.now()
    let smoothedSpeed = 0
    let lastUiTick = 0

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)

      await uploadChunkWithProgress({
        url: `${apiBase}/upload/chunk?sessionId=${sessionId}&start=${start}&end=${end - 1}&total=${file.size}`,
        chunk,
        idToken,
        onProgress: (loaded) => {
          const uploadedBytes = Math.min(file.size, start + loaded)
          const now = performance.now()

          const deltaBytes = Math.max(0, uploadedBytes - lastUploadedBytes)
          const deltaMs = Math.max(1, now - lastSpeedTick)
          const instantSpeed = (deltaBytes * 1000) / deltaMs
          smoothedSpeed = smoothedSpeed === 0
            ? instantSpeed
            : (smoothedSpeed * 0.75) + (instantSpeed * 0.25)

          lastUploadedBytes = uploadedBytes
          lastSpeedTick = now

          // Keep UI updates near real-time while avoiding an excessive render storm.
          if ((now - lastUiTick) < 16 && loaded < chunk.size) return
          lastUiTick = now

          const progress = Math.min(100, Math.round((uploadedBytes / file.size) * 100))
          setFileProgressMap(prev => ({
            ...prev,
            [key]: {
              uploadedBytes,
              totalBytes: file.size,
              progress,
              speedBytesPerSecond: smoothedSpeed,
              status: 'uploading',
            },
          }))
        },
      })

      // Ensure final byte/state sync for this chunk completion.
      const uploadedBytes = end
      const progress = Math.min(100, Math.round((uploadedBytes / file.size) * 100))
      setFileProgressMap(prev => ({
        ...prev,
        [key]: {
          uploadedBytes,
          totalBytes: file.size,
          progress,
          speedBytesPerSecond: smoothedSpeed,
          status: 'uploading',
        },
      }))
    }

    setFileProgressMap(prev => ({
      ...prev,
      [key]: {
        uploadedBytes: file.size,
        totalBytes: file.size,
        progress: 100,
        speedBytesPerSecond: prev[key]?.speedBytesPerSecond || 0,
        status: 'done',
      },
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!authUser) {
      setError('Please login as a member to upload files.')
      return
    }
    if (type !== 'other' && !formData.semester) {
      setError('Semester is required')
      return
    }
    if (!formData.subject) {
      setError('Subject is required')
      return
    }
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    if (!formData.name.trim()) {
      setError('Your name is required')
      return
    }
    if (!submitCandidates.length) {
      setError('Add new files or retry failed ones before submitting.')
      return
    }

    const submissionMeta = {
      title: formData.title,
      subject: formData.subject,
      name: formData.name,
      unit: formData.unit,
      displayNameOnSite: formData.displayNameOnSite,
    }

    setFileProgressMap(prev => {
      const next = { ...prev }
      submitCandidates.forEach(item => {
        const key = makeFileKey(item)
        next[key] = {
          ...(next[key] || {}),
          uploadedBytes: next[key]?.uploadedBytes || 0,
          totalBytes: item.size,
          progress: next[key]?.progress || 0,
          speedBytesPerSecond: 0,
          status: 'queued',
        }
      })
      return next
    })

    try {
      const idToken = await authUser.getIdToken()
      const apiBase = getApiBaseUrl()

      const results = await Promise.allSettled(
        submitCandidates.map(item => uploadSingleFile(item, idToken, apiBase, submissionMeta))
      )

      const failed = results
        .map((result, index) => ({ result, index }))
        .filter(item => item.result.status === 'rejected')

      const failedKeySet = new Set(failed.map(item => makeFileKey(submitCandidates[item.index])))

      setFileProgressMap(prev => {
        const next = { ...prev }
        submitCandidates.forEach(item => {
          const key = makeFileKey(item)
          if (failedKeySet.has(key)) {
            next[key] = { ...(next[key] || {}), status: 'failed' }
          } else {
            delete next[key]
          }
        })
        return next
      })

      setFiles(prev => prev.filter(item => failedKeySet.has(makeFileKey(item))))

      if (failed.length) {
        setError(`${failed.length} file(s) failed. Please retry.`)
        return
      }

      setFormData(prev => ({ ...prev, title: '', unit: '' }))
      setShowSuccess(true)
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.')
    }
  }

  function handleSubmitMore() {
    setShowSuccess(false)
    setFormData(prev => ({ ...prev, title: '', unit: '' }))
    setFiles([])
    setFileProgressMap({})
    setError('')
  }

  function handleDone() {
    setShowSuccess(false)
    onSuccess?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-slide-up-modal">
        
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-4 sm:py-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Share Study Material</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">Help your classmates</p>
          </div>
          <button
            onClick={handleAttemptClose}
            aria-label="Close"
            className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-300 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        {hasActiveUploads && (
          <div className="px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Uploading {activeUploadCount} file(s)</span>
              <span>{getFileSizeLabel(totalUploadedBytes)} / {getFileSizeLabel(totalBytes)}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Overall {uploadProgress}%{totalSpeedBytesPerSecond > 0 ? `  |  ${getFileSizeLabel(Math.round(totalSpeedBytesPerSecond))}/s` : ''}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 sm:p-4 text-red-300 text-xs sm:text-sm font-medium flex items-start gap-2 sm:gap-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Course Information Section */}
          {type !== 'other' && (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider">Course</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="semester" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Semester *</label>
                  <select
                    id="semester"
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-50"
                  >
                    <option value="">Select...</option>
                    {SEMESTERS.map(sem => (
                      <option key={sem.sem} value={sem.sem}>{sem.sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Subject *</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    disabled={!formData.semester}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-50"
                  >
                    <option value="">Select...</option>
                    {subjects.map(subj => (
                      <option key={subj.value} value={subj.value}>{subj.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Subject Input for "Other" Type */}
          {type === 'other' && (
            <div className="space-y-2">
              <label htmlFor="subject" className="block text-xs font-semibold text-slate-400 uppercase">Subject *</label>
              <input
                id="subject"
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="e.g., Reference Material, Tutorial"
                maxLength={50}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-50"
              />
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="block text-xs font-semibold text-slate-400 uppercase">Title *</label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder={type === 'practical' ? 'e.g., Practical 1 Report' : 'e.g., Unit 1 Revision Notes'}
              maxLength={100}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-50"
            />
            <p className="text-xs text-slate-500">{formData.title.length}/100</p>
          </div>

          {/* Unit/Practical No. - Different labels based on type */}
          <div className="space-y-2">
            <label htmlFor="unit" className="block text-xs font-semibold text-slate-400 uppercase">
              {type === 'practical' ? 'Practical No.' : 'Unit Number'} <span className="text-slate-500">(optional)</span>
            </label>
            <input
              id="unit"
              type="number"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              placeholder={type === 'practical' ? '1' : '1'}
              min="1"
              max="20"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-50"
            />
          </div>

          {/* Your Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-xs font-semibold text-slate-400 uppercase">Your Name *</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Full name"
              disabled={Boolean(resolvedName)}
              maxLength={50}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-50"
            />
            {resolvedName && (
              <p className="text-xs text-slate-500">Using your member profile name.</p>
            )}
          </div>

          {/* Display Name Checkbox */}
          <div className="border border-slate-700 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <input
                id="displayNameOnSite"
                type="checkbox"
                name="displayNameOnSite"
                checked={formData.displayNameOnSite}
                onChange={handleInputChange}
                className="mt-1 w-5 h-5 accent-blue-500 cursor-pointer rounded disabled:opacity-50"
              />
              <div className="flex-1">
                <label htmlFor="displayNameOnSite" className="block text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer mb-1">
                  Display my name on the site
                </label>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Let others know who contributed. Admins will review before displaying.
                </p>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400 uppercase">File *</label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : files.length > 0
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-slate-600 bg-slate-800/20'
              }`}
            >
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="fileInput"
                accept=".pdf,.jpg,.jpeg,.png,.mp4,.webm"
                multiple
              />

              {files.length > 0 ? (
                <div className="space-y-2 text-left">
                  <p className="text-xs text-slate-400 text-center">{files.length} file(s) selected</p>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {files.map(item => {
                      const key = makeFileKey(item)
                      const state = fileProgressMap[key]
                      const uploadedBytes = state?.uploadedBytes || 0
                      const progress = state?.progress || 0
                      const speed = state?.speedBytesPerSecond || 0
                      const status = state?.status || 'pending'

                      return (
                        <div key={key} className="bg-slate-800/70 border border-slate-700 rounded-lg p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{item.name}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {getFileSizeLabel(uploadedBytes)} / {getFileSizeLabel(item.size)}
                                {status === 'uploading' && speed > 0 ? `  |  ${getFileSizeLabel(Math.round(speed))}/s` : ''}
                                {status === 'failed' ? '  |  failed' : ''}
                                {status === 'pending' ? '  |  ready' : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(key)}
                              disabled={status === 'uploading' || status === 'queued'}
                              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {!hasActiveUploads && (
                    <label htmlFor="fileInput" className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer block text-center">
                      Add more files
                    </label>
                  )}
                </div>
              ) : (
                <label htmlFor="fileInput" className="cursor-pointer block">
                  <div className="flex justify-center mb-2">
                    <svg className="w-8 h-8 sm:w-12 sm:h-12 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-300 mb-0.5">Drop file here</p>
                  <p className="text-xs text-slate-500">or tap to browse</p>
                </label>
              )}
            </div>
            <p className="text-xs text-slate-500 text-center">PDF, JPG, PNG, MP4 • Max 256MB</p>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="border-t border-slate-800 bg-slate-900 px-4 sm:px-6 py-3 sm:py-4 flex gap-3 sticky bottom-0">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="flex-1 px-4 py-2.5 sm:py-3 bg-slate-800 text-slate-300 rounded-lg text-xs sm:text-sm font-semibold transition-colors min-h-10 sm:min-h-11"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormComplete}
            className="flex-1 px-4 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-10 sm:min-h-11"
          >
            {hasActiveUploads && <Spinner className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span>{hasActiveUploads ? 'Submit More' : 'Submit'}</span>
          </button>
        </div>

        {showUploadLockToast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-16 sm:bottom-20 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs shadow-lg animate-fade-in pointer-events-none">
            Background upload running. Please wait for uploads to finish.
          </div>
        )}

        {/* Success Popup */}
        {showSuccess && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 z-10 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Submitted Successfully!</h3>
            <p className="text-sm text-slate-400 text-center leading-relaxed max-w-xs">
              Once the system reviews your submission, it will be live on the site shortly — usually within <span className="text-slate-200 font-medium">5 minutes</span>.
            </p>
            <div className="flex gap-3 mt-8 w-full max-w-xs">
              <button
                onClick={handleDone}
                className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors"
              >
                Done
              </button>
              <button
                onClick={handleSubmitMore}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Submit More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


UploadModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  type: PropTypes.oneOf(['assignment', 'practical', 'pyq', 'note', 'other']),
  authUser: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
    getIdToken: PropTypes.func,
  }),
  memberProfile: PropTypes.shape({
    fullName: PropTypes.string,
  }),
}
