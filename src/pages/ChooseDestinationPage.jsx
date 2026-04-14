import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MdLocationOn } from 'react-icons/md'
import { getTranslations } from '../translations'
import { updateUser, updateUserRoute, updateUserTerminal, addTransaction, updateUserBalance, updateUserStatus, getUserTransactions } from '../firebase/firestore'
import { calculateFare } from '../utils/fareCalculator'
import './ChooseDestinationPage.css'

const ChooseDestinationPage = ({ currentUser, userData, setUserData }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const mode = location.state?.mode || 'choose' // 'choose' or 'extend'
  const currentRoute = location.state?.currentRoute || null

  const currentLanguage = userData?.language || 'English'
  const t = getTranslations(currentLanguage)
  const [allTerminals] = useState([1, 2, 3, 4])
  /** Origin (choose mode only); destination selection */
  const [selectedOrigin, setSelectedOrigin] = useState(1)
  const initialOriginRef = useRef(1)
  const originHydratedRef = useRef(false)
  const [selectedTerminal, setSelectedTerminal] = useState(null)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showExtendConfirmModal, setShowExtendConfirmModal] = useState(false)
  const [pendingExtendTerminal, setPendingExtendTerminal] = useState(null)

  const [availableTerminals, setAvailableTerminals] = useState([])

  useEffect(() => {
    if (mode !== 'choose' || originHydratedRef.current) return
    const t0 = userData?.currentTerminal
    if (t0 != null) {
      setSelectedOrigin(t0)
      initialOriginRef.current = t0
      originHydratedRef.current = true
    }
  }, [mode, userData?.currentTerminal])

  // Calculate fare for selected terminal
  const getFareForTerminal = (terminal) => {
    if (mode === 'choose') {
      return calculateFare(selectedOrigin, terminal)
    } else if (mode === 'extend' && currentRoute) {
      // For extension, calculate fare from current destination to new terminal
      return calculateFare(currentRoute.to, terminal)
    }
    return 25.00
  }

  useEffect(() => {
    if (mode === 'choose') {
      setAvailableTerminals(allTerminals.filter((term) => term !== selectedOrigin))
    } else if (mode === 'extend' && currentRoute) {
      // For extend mode, show terminals that can be extended to
      // Logic: Extend in the same direction, but can't extend beyond end terminals
      const from = currentRoute.from
      const to = currentRoute.to
      
      if (to > from) {
        // Going forward (e.g., 1->2, 1->3, 2->4): can extend to terminals > to, but not if to is 4 (last terminal)
        if (to === 4) {
          // Already at terminal 4, cannot extend further
          setAvailableTerminals([])
        } else {
          // Can extend to terminals greater than current destination
          setAvailableTerminals(allTerminals.filter(t => t > to && t !== from))
        }
      } else if (to < from) {
        // Going backward (e.g., 4->3, 4->2, 3->1): can extend to terminals < to, but not if to is 1 (first terminal)
        if (to === 1) {
          // Already at terminal 1, cannot extend further
          setAvailableTerminals([])
        } else {
          // Can extend to terminals less than current destination
          setAvailableTerminals(allTerminals.filter(t => t < to && t !== from))
        }
      } else {
        // Same terminal (shouldn't happen, but handle it)
        setAvailableTerminals([])
      }
    }
  }, [mode, selectedOrigin, currentRoute, allTerminals])

  const handleSelectOrigin = (terminal) => {
    setSelectedOrigin(terminal)
    setSelectedTerminal((prev) => (prev === terminal ? null : prev))
  }

  const handleSelectDestination = (terminal) => {
    setSelectedTerminal(terminal)
  }

  const handleConfirm = async () => {
    if (!selectedTerminal) return
    
    if (!currentUser || !currentUser.uid) {
      setErrorMessage('User not authenticated. Please login again.')
      setShowErrorModal(true)
      setTimeout(() => navigate('/login'), 2000)
      return
    }

    const tDesc = getTranslations(userData?.language || 'English')
    const changeRoute = location.state?.changeRoute || false

    try {
      if (mode === 'choose') {
        const newRoute = {
          from: selectedOrigin,
          to: selectedTerminal
        }

        await updateUserTerminal(currentUser.uid, selectedOrigin)
        await updateUserRoute(currentUser.uid, newRoute)
        await updateUser(currentUser.uid, { currentRideExtended: false })

        // When changing route, always reset status to waiting for the new route
        // This ensures the new route requires a new tap in
        await updateUserStatus(currentUser.uid, 'waiting')
        
        // Don't deduct fare yet - will be deducted on tap in
        const newBalance = Number(userData?.balance ?? 0)
        
        // Don't create transaction yet - will be created on tap in
        
        setUserData({
          ...userData,
          currentTerminal: selectedOrigin,
          currentRoute: newRoute,
          currentRideExtended: false,
          balance: newBalance,
          status: changeRoute ? 'waiting' : (userData?.status || 'waiting')
        })
        navigate('/dashboard')
      } else if (mode === 'extend' && currentRoute) {
        // Store the selected terminal and show confirmation modal
        // The actual extension will happen in handleConfirmExtend
        setPendingExtendTerminal(selectedTerminal)
        setShowExtendConfirmModal(true)
        return
      }
    } catch (error) {
      console.error('Error confirming destination:', error)
      setErrorMessage('Failed to confirm destination. Please try again.')
      setShowErrorModal(true)
    }
  }

  const handleConfirmExtend = async () => {
    if (!pendingExtendTerminal || !currentRoute || !currentUser) {
      setShowExtendConfirmModal(false)
      return
    }

    const tDesc = getTranslations(userData?.language || 'English')
    const fare = calculateFare(currentRoute.to, pendingExtendTerminal)

    try {
      const extendedRoute = {
        from: currentRoute.to,
        to: pendingExtendTerminal
      }
      const fullExtendedRoute = {
        from: currentRoute.from,
        to: pendingExtendTerminal
      }
      
      await updateUserRoute(currentUser.uid, fullExtendedRoute)
      await updateUserBalance(currentUser.uid, -fare)
      await updateUser(currentUser.uid, { currentRideExtended: true })
      const newBalance = Number(userData?.balance ?? 0) - fare

      const extendedTransactionId = await addTransaction(currentUser.uid, {
        type: 'trip',
        amount: -fare,
        description: `${tDesc.extendTo} ${tDesc.terminal} ${extendedRoute.from} → ${tDesc.terminal} ${extendedRoute.to}`,
        route: extendedRoute,
        balanceAfter: newBalance,
        jeepneyId: 'jeep1', // Store which jeepney was used
        routeExtension: true,
      })
      
      let allTransactions = []
      try {
        allTransactions = await getUserTransactions(currentUser.uid) || []
      } catch (error) {
        console.error('Error reloading transactions:', error)
        const extendedTransaction = {
          id: extendedTransactionId,
          type: 'trip',
          route: extendedRoute,
          amount: -fare,
          timestamp: new Date(),
          createdAt: new Date(),
          description: `${tDesc.extendTo} ${tDesc.terminal} ${extendedRoute.from} → ${tDesc.terminal} ${extendedRoute.to}`,
          balanceAfter: newBalance
        }
        allTransactions = [extendedTransaction, ...(userData.transactions || [])]
      }
      
      setUserData({
        ...userData,
        currentRoute: fullExtendedRoute,
        currentRideExtended: true,
        balance: newBalance,
        status: 'onboarded',
        transactions: allTransactions
      })
      
      setShowExtendConfirmModal(false)
      setPendingExtendTerminal(null)
      navigate('/dashboard')
    } catch (error) {
      console.error('Error extending route:', error)
      setErrorMessage('Failed to extend route. Please try again.')
      setShowErrorModal(true)
      setShowExtendConfirmModal(false)
    }
  }

  const handleCancelExtend = () => {
    setShowExtendConfirmModal(false)
    setPendingExtendTerminal(null)
    setSelectedTerminal(null)
  }

  const handleBack = () => {
    if (mode === 'extend') {
      if (selectedTerminal) setShowWarningModal(true)
      else navigate('/dashboard')
      return
    }
    const originChanged = selectedOrigin !== initialOriginRef.current
    if (selectedTerminal != null || originChanged) {
      setShowWarningModal(true)
    } else {
      navigate('/dashboard')
    }
  }

  const handleConfirmBack = () => {
    setShowWarningModal(false)
    setSelectedTerminal(null)
    setSelectedOrigin(initialOriginRef.current)
    navigate('/dashboard')
  }

  const handleCancelBack = () => {
    setShowWarningModal(false)
  }

  return (
    <div className="mobile-container">
      <div className="choose-destination-page">
        <div className="destination-page-header">
          <h1 className="destination-page-title">
            {t.chooseDestinationTerminal}
          </h1>
        </div>

        {mode === 'choose' && (
          <div className="current-location-display route-plan-summary">
            <span className="route-plan-from">
              {t.from}: <span className="terminal-highlight">{t.terminal} {selectedOrigin}</span>
            </span>
            <span className="route-plan-arrow" aria-hidden>
              →
            </span>
            <span className="route-plan-to">
              {selectedTerminal != null ? (
                <>
                  {t.terminal} <span className="terminal-highlight">{selectedTerminal}</span>
                </>
              ) : (
                <span className="route-plan-placeholder">{t.chooseDestination}</span>
              )}
            </span>
          </div>
        )}

        {mode === 'extend' && currentRoute && (
          <div className="current-location-display">
            {t.currentLocation}:{' '}
            <span className="terminal-highlight">
              {t.terminal} {currentRoute.to}
            </span>
          </div>
        )}

        <div className="terminals-container">
          <div className="action-buttons-section">
            {mode === 'choose' && (
              <button type="button" className="back-button" onClick={handleBack}>
                ← {t.back}
              </button>
            )}
            {mode === 'extend' && currentRoute && (
              <button type="button" className="extend-button" onClick={() => navigate('/dashboard')}>
                ← {t.back}
              </button>
            )}
          </div>

          {mode === 'choose' && (
            <>
              <h2 className="route-section-heading">{t.selectOriginTerminal}</h2>
              <div className="available-terminals-list route-section-list">
                {allTerminals.map((terminal) => (
                  <button
                    key={`origin-${terminal}`}
                    type="button"
                    className={`terminal-item terminal-item--origin ${selectedOrigin === terminal ? 'selected' : ''}`}
                    onClick={() => handleSelectOrigin(terminal)}
                  >
                    <div className="terminal-info">
                      <div className="terminal-main-info">
                        <span className="terminal-name">
                          {t.terminal} {terminal}
                        </span>
                        {terminal === initialOriginRef.current && (
                          <span className="current-badge">{t.currentOrigin}</span>
                        )}
                      </div>
                      <MdLocationOn className="location-pin" />
                    </div>
                  </button>
                ))}
              </div>

              <h2 className="route-section-heading route-section-heading--destination">{t.chooseDestination}</h2>
            </>
          )}

          <div className="available-terminals-list">
            {availableTerminals.length > 0 ? (
              availableTerminals.map((terminal) => {
                const fare = getFareForTerminal(terminal)
                return (
                  <button
                    key={terminal}
                    type="button"
                    className={`terminal-item ${selectedTerminal === terminal ? 'selected' : ''}`}
                    onClick={() => handleSelectDestination(terminal)}
                  >
                    <div className="terminal-info">
                      <div className="terminal-main-info">
                        <span className="terminal-name">{t.terminal} {terminal}</span>
                        <span className="terminal-fare">₱{fare.toFixed(2)}</span>
                      </div>
                      <MdLocationOn className="location-pin" />
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="no-terminals">
                No available terminals to {mode === 'extend' ? 'extend to' : 'select'}
              </div>
            )}
          </div>

          {selectedTerminal && (
            <div className="confirm-section">
              <div className="fare-summary">
                <div className="fare-summary-item">
                  <span className="fare-label">Fare:</span>
                  <span className="fare-amount">₱{getFareForTerminal(selectedTerminal).toFixed(2)}</span>
                </div>
              </div>
              <button type="button" className="confirm-button" onClick={handleConfirm}>
                {t.confirmSelection}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Warning Modal - Back Button */}
      {showWarningModal && (
        <div className="custom-modal-overlay" onClick={handleCancelBack}>
          <div className="custom-modal warning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-wrapper warning-icon-wrapper">
              <div className="modal-icon warning-icon-circle">⚠️</div>
            </div>
            <h2 className="modal-title">{t.warning}</h2>
            <p className="modal-message">
              {t.warningMessage}
            </p>
            <div className="modal-actions">
              <button className="modal-btn secondary-btn" onClick={handleCancelBack}>
                {t.cancel}
              </button>
              <button className="modal-btn danger-btn" onClick={handleConfirmBack}>
                {t.goBack}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Confirmation Modal */}
      {showExtendConfirmModal && currentRoute && pendingExtendTerminal && (
        <div className="custom-modal-overlay" onClick={handleCancelExtend}>
          <div className="custom-modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-wrapper info-icon-wrapper">
              <div className="modal-icon info-icon-circle">ℹ️</div>
            </div>
            <h2 className="modal-title">Extend Route</h2>
            <div className="modal-content">
              <p className="modal-message">
                Extending your route will deduct an additional <strong>₱{calculateFare(currentRoute.to, pendingExtendTerminal).toFixed(2)}</strong> from your balance.
              </p>
              <div className="route-info-box">
                <div className="route-info-item">
                  <span className="route-info-label">Current Route:</span>
                  <span className="route-info-value">Terminal {currentRoute.from} → Terminal {currentRoute.to}</span>
                </div>
                <div className="route-info-item">
                  <span className="route-info-label">Extended To:</span>
                  <span className="route-info-value">Terminal {currentRoute.to} → Terminal {pendingExtendTerminal}</span>
                </div>
                <div className="route-info-item highlight">
                  <span className="route-info-label">Additional Payment:</span>
                  <span className="route-info-value">₱{calculateFare(currentRoute.to, pendingExtendTerminal).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn secondary-btn" onClick={handleCancelExtend}>
                {t.cancel}
              </button>
              <button className="modal-btn primary-btn" onClick={handleConfirmExtend}>
                Confirm Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="custom-modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="custom-modal error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-wrapper error-icon-wrapper">
              <div className="modal-icon error-icon-circle">✕</div>
            </div>
            <h2 className="modal-title">Error</h2>
            <p className="modal-message">
              {errorMessage}
            </p>
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

export default ChooseDestinationPage
