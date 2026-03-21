# Syllabus Frontend

React + Vite frontend application for the Syllabus PDF library. Features material submission, admin management, and user-friendly browsing interface.

Metadata is loaded from Firebase Realtime Database. Uploaded files are stored on Google Drive (not Firebase Storage).

## Features

- 📚 **Material Browser**: Browse organized course materials
- 📤 **Material Submission**: Upload study materials (assignments, notes, practicals, PYQs)
- 👨‍💼 **Admin Dashboard**: Manage submissions and approvals
- 🎨 **Responsive Design**: Mobile-optimized with Tailwind CSS
- 💫 **Modern UI**: React hooks, smooth interactions

## Installation

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

The app will run at `http://localhost:5173`

### Environment

Create a `.env` file in the frontend directory:

```env
VITE_FB_API_KEY=your_api_key
VITE_FB_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FB_PROJECT_ID=your_project_id
VITE_FB_DATABASE_URL=https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FB_STORAGE_BUCKET=your_project.appspot.com
VITE_FB_MESSAGING_SENDER_ID=your_sender_id
VITE_FB_APP_ID=your_app_id
VITE_API_BASE_URL=http://localhost:5000/api
```

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   ├── constants/      # App constants
│   ├── App.jsx         # Root component
│   └── main.jsx        # Entry point
├── public/             # Static assets
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind CSS config
└── package.json        # Dependencies
```

## API Integration

The frontend communicates with the backend at `http://localhost:5000/api`:

```javascript
// Upload initialization
await fetch(`${API_URL}/upload/init`, { method: 'POST', body: JSON.stringify(...) })

// Chunk upload
await fetch(`${API_URL}/upload/chunk?sessionId=...&start=...&end=...&total=...`, {
  method: 'POST',
  body: chunk
})

// Admin operations
await fetch(`${API_URL}/admin/approve/${submissionId}`, { method: 'POST' })
```

## Pages

- **Home** - Featured materials
- **Assignments** - Assignment submissions
- **Practicals** - Practical reports
- **Notes** - Study notes
- **PYQs** - Past year questions
- **Others** - Miscellaneous materials
- **Admin** - Admin dashboard

## Components

- `UploadModal` - Material submission form
- `PDFCard` - Material card display
- `SubmissionTypePage` - Category page layout
- `Layout` - Main page wrapper
- `FilterButton` - Filter UI component

## Styling

Built with **Tailwind CSS** for utility-first styling. Dark theme with slate colors.

## Dependencies

- `react` - UI framework
- `react-router-dom` - Routing
- `firebase` - Backend services
- `prop-types` - Runtime type checking
- `tailwindcss` - Styling
- `vite` - Build tool
