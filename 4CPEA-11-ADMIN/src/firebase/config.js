import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: 'AIzaSyBEL5bdqeTnZrzflBXgZx0gEmLx0j7ogWE',
  authDomain: 'cpe11-48f3f.firebaseapp.com',
  databaseURL: 'https://cpe11-48f3f-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'cpe11-48f3f',
  storageBucket: 'cpe11-48f3f.firebasestorage.app',
  messagingSenderId: '747480448864',
  appId: '1:747480448864:web:99b8b1d7657cf326826805',
  measurementId: 'G-FYYNR9PKL3',
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
