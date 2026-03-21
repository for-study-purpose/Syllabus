# Syllabus - Course Materials Management System

A full-stack application for sharing and managing course materials. Students upload materials (notes, assignments, practicals, PYQs), admins approve them, and everyone can browse organized by subject.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase project
- Google Drive API credentials

### Install & Run

```bash
# Install all dependencies
npm install

# Terminal 1: Backend API
npm run dev:backend          # http://localhost:5000

# Terminal 2: Frontend SPA
npm run dev:frontend         # http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

## 📁 Project Structure

```
frontend/                 # React + Vite SPA (http://localhost:5173)
├── src/
│   ├── components/      # UI components & features
│   ├── pages/           # Lazy-loaded route pages
│   ├── services/        # Firebase, storage APIs
│   ├── utils/           # Utilities & helpers
│   └── constants/       # Data (semesters, subjects)
│
backend/                  # Express API server (http://localhost:5000)
├── index.js            # All routes (upload, admin, health)
└── ...
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for complete details.

## ✨ Features

### Students
- 📤 Upload study materials with metadata
- ✍️ Optionally display their name publicly
- 📚 Browse approved materials by category
- 🔍 Search and filter materials

### Admins
- ✅ Approve/reject submissions
- 👤 Toggle uploader name display
- 🗑️ Delete materials
- ↩️ Unpublish if needed
- ✏️ Edit submission details

## 🔌 API Endpoints

### Upload
- `POST /api/upload/init` - Start upload session
- `POST /api/upload/chunk` - Upload file chunk

### Admin
- `POST /api/admin/approve/:id` - Approve
- `POST /api/admin/reject/:id` - Reject
- `POST /api/admin/toggle-display/:id` - Toggle name display
- `DELETE /api/admin/submission/:id` - Delete
- `POST /api/admin/unpublish/:id` - Unpublish

### Utility
- `GET /api/health` - Health check
- `GET /api` - API documentation

See [backend/README.md](backend/README.md) for full API docs.

## 🛠️ Setup

### 1. Frontend Environment

Create `frontend/.env`:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_FUNCTION_URL=http://localhost:5000/api
```

### 2. Backend Environment

Create `backend/.env`:
```env
PORT=5000
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GDRIVE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
DRIVE_FOLDER_ID=xxx
```

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router |
| **Backend** | Express.js, Firebase Admin SDK, Google APIs |
| **Storage** | Google Drive (files), Firebase Realtime Database (metadata) |
| **Auth** | Firebase Authentication |

## 📚 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System design & data flow
- [backend/README.md](backend/README.md) - Backend API details
- [frontend/README.md](frontend/README.md) - Frontend structure

## 🚀 Deployment

### Frontend
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel/Netlify
```

### Backend
```bash
# Deploy to Railway/Render/Heroku
# Set environment variables there
npm start
```

## 📝 License

MIT

## 🤝 Contributing

1. Keep frontend and backend separate
2. Follow existing code organization
3. Update docs for new features
4. Test locally before pushing


> A production-grade PDF library built for **SPPU Electronics & Telecommunication** students — fast, dark-themed, mobile-first.

🔗 **Live:** https://entcsppu.web.app

---

## What it does

Students can browse and instantly open official syllabus PDFs, previous year question papers, notes, assignments, and practicals — with a **direct page-jump** feature. Anyone can contribute by uploading files, which go live after admin approval.

---

## Highlights

- **Background uploads** — modal closes immediately; a floating toast tracks chunked upload progress, speed, and ETA in real time
- **Semester → Subject cascade** — upload form dynamically loads subjects based on selected semester
- **Lazy loading + prefetch on hover** — every page is a separate JS chunk; chunks start downloading when you hover a nav link
- **Skeleton loaders** — content placeholders match the actual card layout (no spinners)
- **Page transitions** — smooth fade-in on every route change, zero white flash
- **Admin dashboard** — Auth-protected; approve / reject / delete community submissions with live Realtime Database sync
- **Accessible** — `aria-label`, `role="dialog"`, `aria-live`, keyboard navigation, proper `<label>` associations throughout

---

## Tech Stack

| | |
|---|---|
| **Frontend** | React 18 · Vite 6 · Tailwind CSS 3 · React Router 6 |
| **Backend** | Pending (to be rebuilt) |
| **Database** | Firebase Realtime Database (real-time `onValue`) |
| **Auth** | Firebase Authentication |
| **Hosting** | Firebase Hosting · CDN-cached assets |

---

## Architecture

```
Browser → Firebase Hosting (React SPA)
             │
             └── Frontend-only baseline (backend to be rebuilt)
```

---

## Project Structure

```
src/
├── app/            # Router (lazy pages + prefetch exports) · Providers
├── components/
│   ├── layout/     # App shell — sticky nav, page header, footer
│   ├── submissions/# PDFCard · SubmissionTypePage · UploadModal
│   └── ui/         # Button · Badge · FilterButton · EmptyState · Spinner · UploadToast
├── constants/      # All SPPU subjects (Sem V–VIII) with accent colours
├── context/        # Global UploadContext
├── features/admin/ # Login · Dashboard · SubmissionCard
├── hooks/          # useFirestoreQuery
├── pages/          # Home · PYQs · Notes · Assignments · Practicals · Others · Admin
└── services/       # Firebase init · helpers
```

---

## License

[MIT](LICENSE)
