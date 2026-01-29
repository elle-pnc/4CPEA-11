import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdLocationOn } from 'react-icons/md'
import { updateUserTerminal, updateUserRoute } from '../firebase/firestore'
import './SelectOriginPage.css'

const SelectOriginPage = ({ currentUser, userData, setUserData }) => {
  const navigate = useNavigate()
  const currentTerminal = userData?.currentTerminal || 1
  const [allTerminals] = useState([1, 2, 3, 4])
  const [selectedTerminal, setSelectedTerminal] = useState(null)
  const [showWarningModal, setShowWarningModal] = useState(false)

  const handleSelectOrigin = (terminal) => {
    setSelectedTerminal(terminal)
  }

  const handleConfirm = async () => {
    if (!selectedTerminal) return
    
    if (!currentUser || !currentUser.uid) {
      // Will be handled by auth redirect
      navigate('/login')
      return
    }

    try {
      // Update origin terminal in Firestore
      await updateUserTerminal(currentUser.uid, selectedTerminal)
      
      // Update route if origin changed (clear route if it doesn't match new origin)
      const newRoute = userData?.currentRoute && userData.currentRoute.from === selectedTerminal 
        ? userData.currentRoute 
        : null
      
      if (newRoute !== userData?.currentRoute) {
        await updateUserRoute(currentUser.uid, newRoute)
      }
      
      setUserData({
        ...userData,
        currentTerminal: selectedTerminal,
        currentRoute: newRoute
      })
      navigate('/dashboard')
    } catch (error) {
      console.error('Error updating terminal:', error)
      // Error will be handled by error boundary or user feedback
    }
  }

  const handleBack = () => {
    if (selectedTerminal) {
      setShowWarningModal(true)
    } else {
      navigate('/dashboard')
    }
  }

  const handleConfirmBack = () => {
    setShowWarningModal(false)
    setSelectedTerminal(null)
    navigate('/dashboard')
  }

  const handleCancelBack = () => {
    setShowWarningModal(false)
  }

  return (
    <div className="mobile-container">
      <div className="select-origin-page">
        <div className="origin-page-header">
          <h1 className="origin-page-title">
            Select Origin Terminal
          </h1>
        </div>

        <div className="current-location-display">
          Current Origin: <span className="terminal-highlight">Terminal {currentTerminal}</span>
        </div>

        <div className="terminals-container">
          <div className="current-terminal-section">
            <div className="current-terminal-label">Terminal {currentTerminal}</div>
          </div>

          <div className="action-buttons-section">
            <button className="back-button" onClick={handleBack}>
              ← Back
            </button>
          </div>

          <div className="available-terminals-list">
            {allTerminals.map((terminal) => (
              <button
                key={terminal}
                className={`terminal-item ${terminal === currentTerminal ? 'current' : ''} ${selectedTerminal === terminal ? 'selected' : ''}`}
                onClick={() => handleSelectOrigin(terminal)}
              >
                <div className="terminal-info">
                  <span className="terminal-name">Terminal {terminal}</span>
                  {terminal === currentTerminal && <span className="current-badge">Current</span>}
                  <MdLocationOn className="location-pin" />
                </div>
              </button>
            ))}
          </div>

          {selectedTerminal && (
            <div className="confirm-section">
              <button className="confirm-button" onClick={handleConfirm}>
                Confirm Selection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="custom-modal-overlay" onClick={handleCancelBack}>
          <div className="custom-modal warning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-wrapper warning-icon-wrapper">
              <div className="modal-icon warning-icon-circle">⚠️</div>
            </div>
            <h2 className="modal-title">Warning</h2>
            <p className="modal-message">
              You have a terminal selected. Are you sure you want to go back? Your selection will be lost.
            </p>
            <div className="modal-actions">
              <button className="modal-btn secondary-btn" onClick={handleCancelBack}>
                Cancel
              </button>
              <button className="modal-btn danger-btn" onClick={handleConfirmBack}>
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SelectOriginPage
