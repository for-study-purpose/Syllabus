import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  databaseURL:       import.meta.env.VITE_FB_DATABASE_URL,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FB_APP_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
)

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
