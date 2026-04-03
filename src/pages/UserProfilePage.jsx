import { useState, useEffect } from 'react'
import { MdPerson, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md'
import FooterNav from '../components/FooterNav'
import { updateUserProfile, signIn } from '../firebase/auth'
import { getUser } from '../firebase/firestore'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getTranslations } from '../translations'
import './UserProfilePage.css'

const UserProfilePage = ({ currentUser, userData, setUserData, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const currentLanguage = userData?.language || 'English'
  const t = getTranslations(currentLanguage)
  
  const [formData, setFormData] = useState({
    lastName: userData?.lastName || '',
    firstName: userData?.firstName || '',
    email: userData?.email || '',
    phoneNumber: userData?.phoneNumber || '',
    cardNumber: userData?.cardNumber || '0000 0000 0000'
  })
  
  // Fetch fresh data from Firestore on mount and set up real-time listener
  useEffect(() => {
    if (!currentUser || !currentUser.uid) return

    // Fetch fresh data from Firestore
    const fetchUserData = async () => {
      try {
        const freshUserData = await getUser(currentUser.uid)
        if (freshUserData) {
          setUserData(prev => ({
            ...prev,
            ...freshUserData
          }))
          setFormData({
            lastName: freshUserData.lastName || '',
            firstName: freshUserData.firstName || '',
            email: freshUserData.email || currentUser.email || '',
            phoneNumber: freshUserData.phoneNumber || '',
            cardNumber: freshUserData.cardNumber || '0000 0000 0000'
          })
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    fetchUserData()

    // Set up real-time listener for user data updates
    const userRef = doc(db, 'users', currentUser.uid)
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const updatedData = docSnap.data()
        setUserData(prev => ({
          ...prev,
          ...updatedData
        }))
        setFormData({
          lastName: updatedData.lastName || '',
          firstName: updatedData.firstName || '',
          email: updatedData.email || currentUser.email || '',
          phoneNumber: updatedData.phoneNumber || '',
          cardNumber: updatedData.cardNumber || '0000 0000 0000'
        })
      }
    }, (error) => {
      console.error('Error listening to user updates:', error)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])

  // Update form data when userData changes (fallback)
  useEffect(() => {
    if (userData) {
      setFormData(prev => ({
        lastName: userData.lastName || prev.lastName,
        firstName: userData.firstName || prev.firstName,
        email: userData.email || prev.email || currentUser?.email || '',
        phoneNumber: userData.phoneNumber || prev.phoneNumber,
        cardNumber: userData.cardNumber || prev.cardNumber || '0000 0000 0000'
      }))
    }
  }, [userData, currentUser])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSave = async () => {
    if (!currentUser || !currentUser.uid) {
      setErrorMessage('User not authenticated. Please login again.')
      setShowErrorModal(true)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Update profile in Firebase Auth and Firestore
      await updateUserProfile(currentUser.uid, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber
      })
      
      // Update local state
      setUserData({
        ...userData,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber
      })
      
      setIsEditing(false)
      setError('')
    } catch (error) {
      console.error('Error updating profile:', error)
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use by another account.')
      } else if (error.code === 'auth/requires-recent-login') {
        setError('Please login again to update your email.')
      } else {
        setError(error.message || 'Failed to update profile. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to original userData
    setFormData({
      lastName: userData?.lastName || '',
      firstName: userData?.firstName || '',
      email: userData?.email || '',
      phoneNumber: userData?.phoneNumber || '',
      cardNumber: userData?.cardNumber || '0000 0000 0000'
    })
    setIsEditing(false)
    setShowPasswordModal(false)
    setPassword('')
    setPasswordError('')
    setError('')
  }

  const handleEditClick = () => {
    setShowPasswordModal(true)
    setPassword('')
    setPasswordError('')
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    
    if (!currentUser || !currentUser.email) {
      setPasswordError('User not authenticated')
      return
    }

    if (password.trim() === '') {
      setPasswordError('Password is required')
      return
    }

    setLoading(true)
    setPasswordError('')

    try {
      // Verify password by attempting to sign in
      // This is a simple verification - in production, you might want a different approach
      await signIn(currentUser.email, password)
      
      // Password is correct, allow editing
      setShowPasswordModal(false)
      setIsEditing(true)
      setPassword('')
      setPasswordError('')
    } catch (error) {
      console.error('Password verification error:', error)
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setPasswordError('Incorrect password. Please try again.')
      } else {
        setPasswordError('Failed to verify password. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordCancel = () => {
    setShowPasswordModal(false)
    setPassword('')
    setPasswordError('')
  }

  return (
    <div className="mobile-container page-with-footer">
      <div className="profile-page">
        <div className="profile-header">
          <div className="logo-text">
            <img src={`${import.meta.env.BASE_URL || '/'}Logo.png`} alt="CPE11-AFCS Logo" className="logo-image-inline" />
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-title-section">
            <MdPerson className="profile-icon" />
            <h1 className="profile-title">{t.userProfile}</h1>
          </div>

          {error && (
            <div className="error-message" style={{
              backgroundColor: 'var(--accent-error)',
              color: '#ffffff',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <div className="profile-card">
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">{t.lastName}</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="form-input"
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label htmlFor="firstName" className="form-label">{t.firstName}</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="form-input"
                disabled={!isEditing || loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">{t.email}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-input"
                disabled={!isEditing || loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber" className="form-label">{t.phoneNumber}</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="form-input"
                disabled={!isEditing || loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="cardNumber" className="form-label">{t.cardNumber}</label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                value={userData?.cardNumber || formData.cardNumber || '0000 0000 0000'}
                className="form-input card-number-input"
                disabled
                readOnly
              />
            </div>

            {isEditing ? (
              <div className="profile-actions">
                <button 
                  className="save-button" 
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : t.save}
                </button>
                <button 
                  className="cancel-button" 
                  onClick={handleCancel}
                  disabled={loading}
                >
                  {t.cancel}
                </button>
              </div>
            ) : (
              <button 
                className="edit-button" 
                onClick={handleEditClick}
                disabled={loading}
              >
                {t.editProfile}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Password Verification Modal */}
      {showPasswordModal && (
        <div className="password-modal-overlay" onClick={handlePasswordCancel}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="password-modal-title">{t.verifyPassword}</h2>
            <p className="password-modal-subtitle">{t.verifyPasswordSubtitle}</p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="password-input-group">
                <MdLock className="password-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="password-modal-input"
                  placeholder={t.enterPassword}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError('')
                  }}
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
                </button>
              </div>
              {passwordError && (
                <div className="password-error">{passwordError}</div>
              )}
              <div className="password-modal-actions">
                <button 
                  type="button" 
                  className="password-cancel-btn" 
                  onClick={handlePasswordCancel}
                  disabled={loading}
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit" 
                  className="password-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : t.verify}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <FooterNav />

      {/* Error Modal */}
      {showErrorModal && (
        <div className="custom-modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="custom-modal error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-wrapper error-icon-wrapper">
              <div className="modal-icon error-icon-circle">✕</div>
            </div>
            <h2 className="modal-title">Error</h2>
            <p className="modal-message">{errorMessage}</p>
            <div className="modal-actions">
              <button className="modal-btn primary-btn" onClick={() => setShowErrorModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserProfilePage
