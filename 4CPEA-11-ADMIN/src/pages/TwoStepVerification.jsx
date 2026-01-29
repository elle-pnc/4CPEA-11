import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { ROUTES } from '../constants'
import Logo from '../components/Logo'
import { verifyCode, deleteVerificationCode, saveTrustedDevice } from '../firebase/firestore'
import { signIn } from '../firebase/auth'
import './TwoStepVerification.css'

function TwoStepVerification() {
  const [codes, setCodes] = useState(['', '', '', '', '', ''])
  const [rememberDevice, setRememberDevice] = useState(false)
  const [error, setError] = useState('')
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
