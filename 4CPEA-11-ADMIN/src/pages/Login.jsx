import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { ROUTES, APP_ROLES } from '../constants'
import Logo from '../components/Logo'
import { auth, functions } from '../firebase/config'
import { checkTrustedDevice, getUserRole } from '../firebase/firestore'
import './Login.css'

function Login({ accessDeniedMessage, onClearAccessDenied }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const msg = sessionStorage.getItem('accessDeniedMessage')
    if (msg) {
      setError(msg)
      sessionStorage.removeItem('accessDeniedMessage')
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    onClearAccessDenied?.()

    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)

    const runLogin = async () => {
      try {
        // Validate credentials and get userId
        const credential = await signInWithEmailAndPassword(auth, email, password)
        const userId = credential.user.uid

        const role = await getUserRole(userId)
        if (role !== 'admin' && role !== null) {
          await signOut(auth)
          setError('Your account does not have access to the Admin app.')
          setLoading(false)
          return
        }

        // Check trusted device token
        const deviceToken = localStorage.getItem(`deviceToken_${userId}`)
        if (deviceToken) {
          const trustedDevice = await checkTrustedDevice(userId, deviceToken)
          if (trustedDevice) {
            setLoading(false)
            navigate(ROUTES.DASHBOARD)
            return
          }
          localStorage.removeItem(`deviceToken_${userId}`)
        }

        // Not a trusted device, sign out before 2FA
        await signOut(auth)

        sessionStorage.setItem('pendingVerificationEmail', email)
        sessionStorage.setItem('pendingVerificationPassword', password)

        // Call Cloud Function to send verification code
        const sendVerificationCode = httpsCallable(functions, 'sendVerificationCode')
        await sendVerificationCode({ email })

        setLoading(false)
        navigate(ROUTES.VERIFY, { replace: true })
      } catch (err) {
        sessionStorage.removeItem('pendingVerificationEmail')
        sessionStorage.removeItem('pendingVerificationPassword')

        if (err.code === 'auth/user-not-found') {
          setError('No account found with this email.')
        } else if (err.code === 'auth/wrong-password') {
          setError('Incorrect password. Please try again.')
        } else if (err.code === 'auth/too-many-requests') {
          setError('Too many attempts. Please try again later.')
        } else if (err.code === 'functions/failed-precondition') {
          setError('Email service not configured. Please contact support.')
        } else {
          setError('Login failed. Please try again.')
        }
        setLoading(false)
      }
    }

    runLogin()
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Logo />
          </div>
          <div className="role-pill">
            <User className="w-4 h-4" />
            <span>{APP_ROLES.ADMIN}</span>
          </div>
          <h1 className="auth-title">Login</h1>
          <p className="auth-subtitle">Welcome back! Please sign in to continue.</p>
        </div>

        {(error || accessDeniedMessage) && (
          <div className="auth-error">{error || accessDeniedMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <Mail className="input-icon w-5 h-5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="text-input"
              required
            />
          </div>

          <div className="input-group">
            <Lock className="input-icon w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="text-input"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="toggle-password"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button type="submit" className="primary-button" disabled={loading}>
            <span>{loading ? 'Signing in...' : 'Login'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
