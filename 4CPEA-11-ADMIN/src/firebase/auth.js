import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from './config'

export const signIn = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential
}

export const logOut = async () => {
  await signOut(auth)
}

export const onAuthStateChange = (callback) =>
  onAuthStateChanged(auth, (firebaseUser) => {
    let pendingVerification = false
    try {
      if (typeof sessionStorage !== 'undefined') {
        pendingVerification = !!sessionStorage.getItem('pendingVerificationEmail')
      }
    } catch (err) {
      // Ignore sessionStorage errors
    }

    if (pendingVerification) {
      callback(null)
      return
    }

    callback(firebaseUser || null)
  })
