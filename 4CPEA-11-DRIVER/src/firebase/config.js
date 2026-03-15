import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBEL5bdqeTnZrzflBXgZx0gEmLx0j7ogWE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cpe11-48f3f.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://cpe11-48f3f-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cpe11-48f3f',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'cpe11-48f3f.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '747480448864',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:747480448864:web:99b8b1d7657cf326826805',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-FYYNR9PKL3',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const realtimeDb = getDatabase(app)
export const functions = getFunctions(app)

let analytics = null
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app)
}

export { analytics }
export default app
