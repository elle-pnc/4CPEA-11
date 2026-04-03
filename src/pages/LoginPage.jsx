import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdArrowForward } from 'react-icons/md'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, functions } from '../firebase/config'
import { httpsCallable } from 'firebase/functions'
import { useTranslation } from '../contexts/TranslationContext'
import { checkTrustedDevice, getUserRole } from '../firebase/firestore'
import { signIn } from '../firebase/auth'
import './LoginPage.css'

const LoginPage = ({ currentUser, accessDeniedMessage, onClearAccessDenied }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const t = useTranslation()

  useEffect(() => {
    const msg = sessionStorage.getItem('accessDeniedMessage')
    if (msg) {
      setError(msg)
      sessionStorage.removeItem('accessDeniedMessage')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Set immediately so auth listener never redirects to dashboard during this flow
    sessionStorage.setItem('pendingVerificationEmail', email)
    sessionStorage.setItem('pendingVerificationPassword', password)

    setError('')
    onClearAccessDenied?.()
    setLoading(true)

    try {
      if (!email || !password) {
        sessionStorage.removeItem('pendingVerificationEmail')
        sessionStorage.removeItem('pendingVerificationPassword')
        setError('Please enter both email and password')
        setLoading(false)
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        sessionStorage.removeItem('pendingVerificationEmail')
        sessionStorage.removeItem('pendingVerificationPassword')
        setError('Please enter a valid email address')
        setLoading(false)
        return
      }

      // Check for trusted device token first
      // We need to validate credentials first to get userId, then check for device token
      let deviceToken = null
      let userId = null
      
      // First, validate credentials to get userId
      try {
        const testCredential = await signInWithEmailAndPassword(auth, email, password)
        userId = testCredential.user.uid

        const role = await getUserRole(userId)
        if (role === 'driver') {
          sessionStorage.removeItem('pendingVerificationEmail')
          sessionStorage.removeItem('pendingVerificationPassword')
          await signOut(auth)
          setError('Your account does not have access to the Commuter app.')
          setLoading(false)
          return
        }
        
        // Temporarily keep signed in to check device token (rules require authentication)
        // Check for device token using userId
        deviceToken = localStorage.getItem(`deviceToken_${userId}`)
        
        if (deviceToken) {
          // Check if device token is valid (user is authenticated at this point)
          try {
            const trustedDevice = await checkTrustedDevice(userId, deviceToken)
            
            if (trustedDevice) {
              // Trusted device found - skip 2FA and sign in directly
              sessionStorage.removeItem('pendingVerificationEmail')
              sessionStorage.removeItem('pendingVerificationPassword')
              setLoading(false)
              navigate('/dashboard')
              return
            } else {
              // Token invalid or expired, remove it
              localStorage.removeItem(`deviceToken_${userId}`)
              // Sign out to proceed with 2FA
              await signOut(auth)
            }
          } catch (deviceError) {
            // Permission error or other error - continue with 2FA
            console.warn('Error checking trusted device:', deviceError)
            // Sign out to proceed with 2FA
            await signOut(auth)
          }
        } else {
          // No device token found, sign out to proceed with 2FA
          await signOut(auth)
        }
      } catch (err) {
        // If validation fails, clear sessionStorage and handle error
        sessionStorage.removeItem('pendingVerificationEmail')
        sessionStorage.removeItem('pendingVerificationPassword')
        console.log('Credentials invalid, proceeding with 2FA')
        // Make sure we're signed out
        try {
          await signOut(auth)
        } catch (signOutErr) {
          // Ignore sign out errors
        }
      }

      // sessionStorage already set above (or set again if first try failed)
      if (!sessionStorage.getItem('pendingVerificationEmail')) {
        sessionStorage.setItem('pendingVerificationEmail', email)
        sessionStorage.setItem('pendingVerificationPassword', password)
      }
      // Attempt to sign in to validate email and password (for the second path when first try fails)
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        
        // Credentials are valid! Now sign out immediately to prevent auto-login
        // This happens before the auth state listener can redirect to dashboard
        // The pendingVerificationEmail flag prevents dashboard access during 2FA
        await signOut(auth)
        
        // Wait a moment to ensure sign out completes and auth state updates
        // This prevents the dashboard from briefly appearing
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Call Cloud Function to send verification code via email
        try {
          const sendVerificationCode = httpsCallable(functions, 'sendVerificationCode')
          const result = await sendVerificationCode({ email })

          // httpsCallable wraps the response in result.data
          if (!result?.data) {
            console.warn('Unexpected response format, but navigating anyway (email is working)')
          }

          // Ensure sessionStorage is set before navigation
          sessionStorage.setItem('pendingVerificationEmail', email)
          sessionStorage.setItem('pendingVerificationPassword', password)

          setLoading(false)

          // Use full page navigation to avoid auth-listener / React Router race.
          // navigate() can race with auth state updates; window.location guarantees
          // sessionStorage is present when the verify page loads.
          const base = (import.meta.env.BASE_URL || '/Commuter/').replace(/\/$/, '') || ''
          const verifyPath = base ? `${base}/verify` : '/verify'
          window.location.href = verifyPath
          
        } catch (codeError) {
          console.error('Error sending verification code:', codeError)
          console.error('Error details:', {
            code: codeError.code,
            message: codeError.message,
            details: codeError.details
          })
          
          // Handle specific error codes
          if (codeError.code === 'functions/failed-precondition') {
            setError('Email service not configured. Please contact support.')
            setLoading(false)
            sessionStorage.removeItem('pendingVerificationEmail')
            sessionStorage.removeItem('pendingVerificationPassword')
            return
          }
          
          // For other errors, if user confirmed email is being sent, still navigate
          // (sometimes errors happen after email is sent, or response is malformed)
          sessionStorage.setItem('pendingVerificationEmail', email)
          sessionStorage.setItem('pendingVerificationPassword', password)
          setLoading(false)
          const base = (import.meta.env.BASE_URL || '/Commuter/').replace(/\/$/, '') || ''
          window.location.href = base ? `${base}/verify` : '/verify'
        }
      } catch (authError) {
        // Handle Firebase Auth errors
        // Clear pending verification on error
        sessionStorage.removeItem('pendingVerificationEmail')
        sessionStorage.removeItem('pendingVerificationPassword')
        
        console.error('Authentication error:', authError)
        
        // Check for specific error codes
        if (authError.code === 'auth/user-not-found') {
          setError('No account found with this email address. Please check your email or sign up.')
        } else if (authError.code === 'auth/wrong-password') {
          setError('Incorrect password. Please try again.')
        } else if (authError.code === 'auth/invalid-email') {
          setError('Invalid email address format.')
        } else if (authError.code === 'auth/invalid-credential') {
          setError('Invalid email or password. Please try again.')
        } else if (authError.code === 'auth/too-many-requests') {
          setError('Too many failed login attempts. Please try again later.')
        } else {
          setError(authError.message || 'Invalid email or password. Please try again.')
        }
        setLoading(false)
        return
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error.message || 'Failed to process login. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="mobile-container">
      <div className="login-page">
        <div className="login-header">
          <div className="logo-placeholder">
            <img src={`${import.meta.env.BASE_URL || '/'}Logo.png`} alt="CPE11-AFCS Logo" className="logo-image" />
          </div>
        </div>

        <h1 className="login-title">{t.login}</h1>

        {(error || accessDeniedMessage) && (
          <div className="error-message" style={{
            backgroundColor: 'var(--accent-error)',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error || accessDeniedMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <MdEmail className="input-icon" />
            <input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              required
              disabled={loading}
              className="login-input"
            />
          </div>

          <div className="input-group">
            <MdLock className="input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t.password}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              required
              disabled={loading}
              className="login-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              disabled={loading}
            >
              {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
            </button>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <span>Loading...</span>
            ) : (
              <>
                <MdArrowForward />
                <span>{t.loginButton}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
