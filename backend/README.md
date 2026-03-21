# Syllabus Backend API

Express.js backend for uploads, moderation, and public data.

## Features
- Resumable chunked uploads to Google Drive
- Submission moderation (approve, reject, unpublish, delete)
- Firebase Auth verification and admin role checks
- Realtime Database metadata for members, sessions, submissions

## Setup
1. Copy `.env.example` to `.env`
2. Fill Firebase Admin credentials
3. Fill Google Drive service account credentials
4. Set `DRIVE_FOLDER_ID`
5. Share the target Drive folder with the service account email

### Required environment variables
- `PORT`
- `CORS_ORIGIN`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_DATABASE_URL`
- `GDRIVE_SERVICE_ACCOUNT_JSON`
- `DRIVE_FOLDER_ID`

## Run
```bash
cd backend
npm install
npm run dev
```

## API
### Upload
- `POST /api/upload/init`
- `POST /api/upload/chunk`

### Admin
- `GET /api/admin/submissions`
- `POST /api/admin/approve/:submissionId`
- `POST /api/admin/reject/:submissionId`
- `PATCH /api/admin/toggle-display/:submissionId`
- `POST /api/admin/toggle-display/:submissionId` (backward compatible)
- `DELETE /api/admin/submission/:submissionId`
- `POST /api/admin/unpublish/:submissionId`
- `PUT /api/admin/submission/:submissionId`

### Public
- `GET /api/public/static-files`
- `GET /api/public/submissions`

### Member
- `GET /api/member/profile`
- `POST /api/member/profile`

### Utility
- `GET /api/health`
- `GET /api`

## Notes
- Admin bootstrap endpoint and setup token flow were removed.
- Google Drive OAuth refresh-token flow was removed.
- Backend now uses service-account-only Drive auth for production stability.
