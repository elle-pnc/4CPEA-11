import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdCheck } from 'react-icons/md'
import { signOut } from 'firebase/auth'
import { auth, functions } from '../firebase/config'
import { httpsCallable } from 'firebase/functions'
import { verifyCode, deleteVerificationCode, saveTrustedDevice, getUserRole } from '../firebase/firestore'
import { signIn } from '../firebase/auth'
import { useTranslation } from '../contexts/TranslationContext'
import './TwoStepVerificationPage.css'

const RESEND_COOLDOWN_SECONDS = 60

const TwoStepVerificationPage = () => {
  const [codes, setCodes] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasError, setHasError] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const inputRefs = useRef([])
  const navigate = useNavigate()
  const t = useTranslation()

  useEffect(() => {
    // Check if email exists in sessionStorage (from login page)
    const email = sessionStorage.getItem('pendingVerificationEmail')
    if (!email) {
      // No email found, redirect to login
      navigate('/login')
    } else {
      inputRefs.current[0]?.focus()
    }
  }, [navigate])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleResend = async () => {
    const email = sessionStorage.getItem('pendingVerificationEmail')
    if (!email || resendCooldown > 0 || resendLoading) return

    setResendLoading(true)
    setError('')
    setResendSuccess(false)

    try {
      const sendVerificationCode = httpsCallable(functions, 'sendVerificationCode')
      await sendVerificationCode({ email })
      setResendSuccess(true)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setTimeout(() => setResendSuccess(false), 4000)
    } catch (err) {
      console.error('Resend verification code error:', err)
      setError(err.message || 'Failed to resend code. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleChange = (index, value) => {
    if (value.length > 1) return
    if (!/^\d*$/.test(value)) return // Only allow digits
    
    const newCodes = [...codes]
    newCodes[index] = value
    setCodes(newCodes)
    setError('')
    setHasError(false) // Clear error state when user types

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-verify when all fields are filled (disable for manual verification)
    // if (newCodes.every(code => code !== '') && newCodes.length === 6) {
    //   setTimeout(() => {
    //     handleVerify()
    //   }, 300)
    // }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    const newCodes = [...codes]
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newCodes[i] = pastedData[i]
    }
    setCodes(newCodes)
    const nextEmptyIndex = newCodes.findIndex(code => code === '')
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus()
    } else {
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    if (!codes.every(code => code !== '')) {
      setError('Please enter the complete verification code')
      return
    }

    const enteredCode = codes.join('')
    const email = sessionStorage.getItem('pendingVerificationEmail')
    const password = sessionStorage.getItem('pendingVerificationPassword')

    if (!email) {
      setError('Session expired. Please login again.')
      navigate('/login')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Verify code in Firestore
      const verificationResult = await verifyCode(email, enteredCode)

      if (!verificationResult.valid) {
        // Set error state to trigger red styling and shake animation
        setHasError(true)
        setError('') // Don't show error message text
        setCodes(['', '', '', '', '', ''])
        
        // Remove shake class after animation completes
        setTimeout(() => {
          setHasError(false)
          inputRefs.current[0]?.focus()
        }, 600)
        
        setLoading(false)
        return
      }

      // Code is valid, now sign in with Firebase Auth
      if (password) {
        try {
          // Clear pending verification flags BEFORE signing in
          // This allows the auth state listener to properly authenticate
          sessionStorage.removeItem('pendingVerificationEmail')
          sessionStorage.removeItem('pendingVerificationPassword')
          
          // Now sign in - the auth state listener will handle the rest
          const authResult = await signIn(email, password)
          const role = await getUserRole(authResult?.user?.uid)
          if (role === 'driver') {
            await signOut(auth)
            sessionStorage.setItem('accessDeniedMessage', 'Your account does not have access to the Commuter app.')
            setLoading(false)
            navigate('/login')
            return
          }
          
          // Save trusted device if "remember device" was checked
          if (rememberDevice && authResult?.user?.uid) {
            try {
              const deviceToken = await saveTrustedDevice(authResult.user.uid)
              localStorage.setItem(`deviceToken_${authResult.user.uid}`, deviceToken)
              console.log('Device token saved successfully')
            } catch (deviceError) {
              console.warn('Failed to save trusted device:', deviceError)
              // Don't block login if device saving fails
            }
          }
          
          await deleteVerificationCode(email)

          // Navigate to dashboard (App.jsx will handle auth state change)
          navigate('/dashboard')
        } catch (authError) {
          console.error('Sign in error:', authError)
          // Handle Firebase Auth errors
          if (authError.code === 'auth/user-not-found') {
            setError('User account not found. Please sign up first.')
          } else if (authError.code === 'auth/wrong-password') {
            setError('Incorrect password. Please try again.')
          } else if (authError.code === 'auth/invalid-email') {
            setError('Invalid email address.')
          } else {
            setError(authError.message || 'Sign in failed. Please try again.')
          }
          setCodes(['', '', '', '', '', ''])
          inputRefs.current[0]?.focus()
          setLoading(false)
        }
      } else {
        // No password stored, just verify and proceed (for cases where password isn't required)
        sessionStorage.removeItem('pendingVerificationEmail')
        await deleteVerificationCode(email)
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setError('Verification failed. Please try again.')
      setCodes(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      setLoading(false)
    }
  }

  return (
    <div className="mobile-container">
      <div className="verification-page">
        <div className="verification-header">
          <div className="logo-placeholder-verify">
            <img src={`${import.meta.env.BASE_URL || '/'}Logo.png`} alt="CPE11-AFCS Logo" className="logo-image" />
          </div>
        </div>

        <h1 className="verification-title">{t.twoStepVerification}</h1>
        <p className="verification-subtitle">{t.verificationSubtitle}</p>

        {error && <p className="verification-error" role="alert">{error}</p>}

        <div className={`code-inputs-container ${hasError ? 'shake' : ''}`}>
          <div className="code-inputs-row">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={codes[index]}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`code-input ${hasError ? 'error' : ''}`}
                disabled={loading}
              />
            ))}
          </div>
        </div>

        <div className="remember-device-container">
          <label className="remember-device-checkbox">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              disabled={loading}
            />
            <span className="checkmark"></span>
            <div className="remember-device-label">
              <span className="remember-device-text">{t.rememberDevice}</span>
              <span className="remember-device-desc">{t.rememberDeviceDesc}</span>
            </div>
          </label>
        </div>

        <button 
          onClick={handleVerify} 
          className="verify-button"
          disabled={!codes.every(code => code !== '') || loading}
        >
          {loading ? (
            <span>Verifying...</span>
          ) : (
            <>
              <MdCheck />
              <span>{t.verify}</span>
            </>
          )}
        </button>

        <div className="resend-container">
          {resendSuccess && (
            <p className="resend-success" role="status">{t.resendCodeSent}</p>
          )}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading || loading}
            className="resend-button"
            aria-label={resendCooldown > 0 ? t.resendCodeWait?.replace('{{seconds}}', resendCooldown) : t.resendCode}
          >
            {resendLoading
              ? t.resendSending
              : resendCooldown > 0
                ? t.resendCodeWait?.replace('{{seconds}}', resendCooldown)
                : t.resendCode}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TwoStepVerificationPage
