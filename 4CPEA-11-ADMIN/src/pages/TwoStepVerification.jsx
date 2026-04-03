import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { ROUTES } from '../constants'
import Logo from '../components/Logo'
import { signOut } from 'firebase/auth'
import { auth, functions } from '../firebase/config'
import { verifyCode, deleteVerificationCode, saveTrustedDevice, getUserRole } from '../firebase/firestore'
import { signIn } from '../firebase/auth'
import './TwoStepVerification.css'

const RESEND_COOLDOWN_SECONDS = 60

function TwoStepVerification() {
  const [codes, setCodes] = useState(['', '', '', '', '', ''])
  const [rememberDevice, setRememberDevice] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const inputRefs = useRef([])
  const navigate = useNavigate()

  useEffect(() => {
    const email = sessionStorage.getItem('pendingVerificationEmail')
    if (!email) {
      navigate(ROUTES.LOGIN)
      return
    }
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
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
    // Only allow single digit
    if (value.length > 1) return
    if (!/^\d*$/.test(value)) return
    
    const newCodes = [...codes]
    newCodes[index] = value
    setCodes(newCodes)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('')
    const newCodes = [...codes]
    pastedData.forEach((char, i) => {
      if (i < 6 && /^\d$/.test(char)) {
        newCodes[i] = char
      }
    })
    setCodes(newCodes)
    // Focus the next empty input or last input
    const nextIndex = Math.min(pastedData.length, 5)
    inputRefs.current[nextIndex]?.focus()
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!codes.every(code => code !== '')) {
      setError('Please enter the full verification code.')
      return
    }

    const enteredCode = codes.join('')
    const email = sessionStorage.getItem('pendingVerificationEmail')
    const password = sessionStorage.getItem('pendingVerificationPassword')

    if (!email) {
      setError('Session expired. Please login again.')
      navigate(ROUTES.LOGIN)
      return
    }

    setError('')

    const verificationResult = await verifyCode(email, enteredCode)
    if (!verificationResult.valid) {
      setError(verificationResult.error || 'Invalid verification code.')
      setCodes(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      return
    }

    try {
      sessionStorage.removeItem('pendingVerificationEmail')
      sessionStorage.removeItem('pendingVerificationPassword')

      const authResult = await signIn(email, password)
      const role = await getUserRole(authResult?.user?.uid)
      if (role !== 'admin' && role !== null) {
        await signOut(auth)
        sessionStorage.setItem('accessDeniedMessage', 'Your account does not have access to the Admin app.')
        navigate(ROUTES.LOGIN)
        return
      }
      if (rememberDevice && authResult?.user?.uid) {
        try {
          const token = await saveTrustedDevice(authResult.user.uid)
          localStorage.setItem(`deviceToken_${authResult.user.uid}`, token)
        } catch (deviceError) {
          // Do not block login if device save fails
        }
      }

      await deleteVerificationCode(email)
      navigate(ROUTES.DASHBOARD)
    } catch (authError) {
      setError('Unable to complete sign in. Please try again.')
      setCodes(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }

  const isComplete = codes.every(code => code !== '')

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button onClick={() => navigate(ROUTES.LOGIN)} className="auth-back">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="auth-header">
          <Logo />
          <h1 className="auth-title">Two-Step Verification</h1>
          <p className="auth-subtitle">Enter the verification code sent to your email/phone</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleVerify} className="verification-form">
          <div className="code-grid">
            {codes.slice(0, 5).map((code, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={code}
                onChange={(e) => handleChange(index, e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="code-input"
              />
            ))}
          </div>
          <div className="code-grid single">
            <input
              ref={(el) => (inputRefs.current[5] = el)}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={codes[5]}
              onChange={(e) => handleChange(5, e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => handleKeyDown(5, e)}
              onPaste={handlePaste}
              className="code-input"
            />
          </div>

          <button type="submit" disabled={!isComplete} className="primary-button">
            <Check className="w-5 h-5" />
            Verify
          </button>

          <div className="resend-container">
            {resendSuccess && (
              <p className="resend-success" role="status">Code sent. Check your email.</p>
            )}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              className="resend-button"
              aria-label={resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            >
              {resendLoading
                ? 'Sending...'
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend code'}
            </button>
          </div>

          <label className="remember-device">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            <span>Remember this device</span>
          </label>
        </form>
      </div>
    </div>
  )
}

export default TwoStepVerification
