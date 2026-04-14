import { useState, useEffect } from 'react'
import { MdPerson, MdCheckCircle, MdSchedule, MdDirectionsBus, MdSwapHoriz, MdEdit } from 'react-icons/md'
import { getUsersByStatus, updateUserStatus, updateUserBalance, addTransaction, updateUserRoute, getJeepney, updateJeepney, updateJeepneySeatCount, updateJeepneyRoute, initializeJeepney } from '../firebase/firestore'
import { subscribeToTaps, RP4_DEVICE_ID } from '../firebase/rp4Taps'
import { getTranslations } from '../translations'
import { calculateFare } from '../utils/fareCalculator'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import './DriverSimulationPage.css'

const DriverSimulationPage = () => {
  const [waitingUsers, setWaitingUsers] = useState([])
  const [onboardedUsers, setOnboardedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successDetails, setSuccessDetails] = useState(null) // For storing trip details
  const [jeepney, setJeepney] = useState(null)
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [selectedFromTerminal, setSelectedFromTerminal] = useState(1)
  const [selectedToTerminal, setSelectedToTerminal] = useState(2)
  const [lastRp4Tap, setLastRp4Tap] = useState(null) // last RP4 card tap result for UI feedback
  const currentLanguage = 'English' // Driver view can be in English
  const t = getTranslations(currentLanguage)

  // Load users by status
  const loadUsers = async () => {
    try {
      setRefreshing(true)
      const [waiting, boarding, onboarded] = await Promise.all([
        getUsersByStatus('waiting'),
        getUsersByStatus('boarding'),
        getUsersByStatus('onboarded')
      ])
      setWaitingUsers([...(waiting || []), ...(boarding || [])])
      setOnboardedUsers(onboarded || [])
    } catch (error) {
      console.error('Error loading users:', error)
      // If index error, still show empty lists (won't crash)
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ Firestore index not created yet. Users list will be empty.')
      }
      setWaitingUsers([])
      setOnboardedUsers([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load jeepney data
  useEffect(() => {
    const loadJeepney = async () => {
      try {
        // Initialize jeepney if it doesn't exist
        await initializeJeepney('jeep1')
        
        // Set up real-time listener for jeepney
        const jeepneyRef = doc(db, 'jeepneys', 'jeep1')
        const unsubscribe = onSnapshot(jeepneyRef, (docSnap) => {
          if (docSnap.exists()) {
            setJeepney({ id: docSnap.id, ...docSnap.data() })
            // Update selected terminals when jeepney route changes
            const data = docSnap.data()
            if (data.fromTerminal) setSelectedFromTerminal(data.fromTerminal)
            if (data.toTerminal) setSelectedToTerminal(data.toTerminal)
          } else {
            // Initialize if doesn't exist
            initializeJeepney('jeep1').then(jeep => {
              setJeepney(jeep)
            })
          }
        }, (error) => {
          console.error('Error listening to jeepney:', error)
        })
        
        return () => unsubscribe()
      } catch (error) {
        console.error('Error loading jeepney:', error)
      }
    }
    
    loadJeepney()
  }, [])

  // RP4: refresh UI when new taps arrive. Do not call processTap here — processRp4Tap (Cloud Function) owns payment + boardingQueue (avoids double charge vs this client). Use Firebase emulators with functions enabled, or deploy functions, when testing taps.
  useEffect(() => {
    const unsubscribe = subscribeToTaps(RP4_DEVICE_ID, async (tapDocId, tapData) => {
      setLastRp4Tap({ tapDocId, ...tapData, at: new Date().toISOString() })
      await loadUsers()
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    loadUsers()
    
    // Refresh every 5 seconds to get real-time updates
    const interval = setInterval(loadUsers, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const handleTapIn = async (user) => {
    if (!user.id) return

    try {
      // Check if jeepney has available seats
      const currentSeatCount = jeepney?.seatCount || 0
      const maxSeats = jeepney?.maxSeats || 2
      
      if (currentSeatCount >= maxSeats) {
        setErrorMessage('Jeepney is full! Cannot tap in more passengers.')
        setShowErrorModal(true)
        return
      }
      
      // Calculate fare based on user's route
      const route = user.currentRoute || { from: user.currentTerminal || 1, to: user.currentTerminal || 1 }
      const fare = calculateFare(route.from, route.to)
      
      // Deduct fare from balance
      await updateUserBalance(user.id, -fare)
      const newBalance = Number(user.balance ?? 0) - fare

      // Match production: paid + boarding; seatCount increments on IR ir_occupied (Cloud Function).
      await updateUserStatus(user.id, 'boarding')

      // Create transaction record for regular route
      // Note: Extended routes are handled automatically when user extends (payment deducted immediately)
      await addTransaction(user.id, {
        type: 'trip',
        amount: -fare,
        description: `Trip: Terminal ${route.from} → Terminal ${route.to}`,
        route: route,
        balanceAfter: newBalance,
        jeepneyId: 'jeep1' // Store which jeepney was used
      })

      // Reload users
      await loadUsers()
      
      // Set success details for the modal
      setSuccessDetails({
        type: 'tap-in',
        userName: `${user.firstName} ${user.lastName}`,
        fare: fare,
        route: `Terminal ${route.from} → Terminal ${route.to}`,
        routeDetails: route
      })
      setSuccessMessage(`${user.firstName} ${user.lastName} tapped in successfully. Fare ₱${fare.toFixed(2)} deducted.`)
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error processing tap in:', error)
      setErrorMessage(`Failed to process tap in: ${error.message}`)
      setShowErrorModal(true)
    }
  }

  const handleTapOut = async (user) => {
    if (!user.id) return

    try {
      // Sim-only shortcut: production ends trips via seat IR (ir_available) + Cloud Function. This button clears the commuter and adjusts seatCount for local testing without firmware events.
      const completedRoute = user.currentRoute || null
      const routeInfo = completedRoute 
        ? `Terminal ${completedRoute.from} → Terminal ${completedRoute.to}`
        : 'No route'
      
      // Reset everything to default: clear status, clear route
      await updateUserStatus(user.id, null)
      await updateUserRoute(user.id, null)

      // Update jeepney seat count (decrease)
      const currentSeatCount = jeepney?.seatCount || 0
      if (currentSeatCount > 0) {
        await updateJeepneySeatCount('jeep1', currentSeatCount - 1)
      }

      // Reload users
      await loadUsers()
      
      // Set success details for the modal
      setSuccessDetails({
        type: 'tap-out',
        userName: `${user.firstName} ${user.lastName}`,
        route: routeInfo,
        routeDetails: completedRoute
      })
      setSuccessMessage(`${user.firstName} ${user.lastName} tapped out successfully. Trip completed!`)
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error processing tap out:', error)
      setErrorMessage(`Failed to process tap out: ${error.message}`)
      setShowErrorModal(true)
    }
  }

  const handleUpdateRoute = async () => {
    if (selectedFromTerminal === selectedToTerminal) {
      setErrorMessage('Origin and destination terminals must be different')
      setShowErrorModal(true)
      return
    }

    try {
      await updateJeepneyRoute('jeep1', selectedFromTerminal, selectedToTerminal)
      setShowRouteModal(false)
      setSuccessMessage('Jeepney route updated successfully!')
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error updating route:', error)
      setErrorMessage(`Failed to update route: ${error.message}`)
      setShowErrorModal(true)
    }
  }

  const getRouteDisplay = (user) => {
    if (!user.currentRoute) return 'No route selected'
    return `Terminal ${user.currentRoute.from} → Terminal ${user.currentRoute.to}`
  }

  if (loading) {
    return (
      <div className="mobile-container">
        <div className="driver-simulation-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-container">
      <div className="driver-simulation-page">
        <div className="driver-header">
          <div className="driver-title-section">
            <MdDirectionsBus className="driver-icon" />
            <h1 className="driver-title">Driver Simulation</h1>
          </div>
          <button 
            className="refresh-button"
            onClick={loadUsers}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Jeepney Controls Section */}
        {jeepney && (
          <div className="jeepney-controls-section">
            <div className="jeepney-info-card">
              <div className="jeepney-info-header">
                <h3 className="jeepney-info-title">{jeepney.name || 'Jeep 1'}</h3>
                <button 
                  className="edit-route-btn"
                  onClick={() => setShowRouteModal(true)}
                  title="Change Route"
                >
                  <MdEdit />
                </button>
              </div>
              <div className="jeepney-info-details">
                <div className="jeepney-info-item">
                  <span className="info-label">Current Route:</span>
                  <span className="info-value">
                    Terminal {jeepney.fromTerminal || 1} → Terminal {jeepney.toTerminal || 2}
                  </span>
                </div>
                <div className="jeepney-info-item">
                  <span className="info-label">Direction:</span>
                  <span className="info-value">{jeepney.direction === 'right' ? 'Forward' : 'Backward'}</span>
                </div>
                <div className="jeepney-info-item highlight">
                  <span className="info-label">Seats:</span>
                  <span className={`info-value ${jeepney.seatCount >= jeepney.maxSeats ? 'full' : ''}`}>
                    {jeepney.seatCount || 0}/{jeepney.maxSeats || 2}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Waiting Users Section */}
        <div className="users-section">
          <div className="section-header">
            <MdSchedule className="section-icon waiting" />
            <h2 className="section-title">Waiting for Boarding</h2>
            <span className="user-count">{waitingUsers.length}</span>
          </div>

          {waitingUsers.length === 0 ? (
            <div className="empty-state">
              <p>No users waiting</p>
            </div>
          ) : (
            <div className="users-list">
              {waitingUsers.map((user) => (
                <div key={user.id} className="user-card waiting-card">
                  <div className="user-info">
                    <div className="user-avatar">
                      <MdPerson />
                    </div>
                    <div className="user-details">
                      <div className="user-name">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="user-email">{user.email}</div>
                      <div className="user-route">
                        <span className="route-label">Route:</span> {getRouteDisplay(user)}
                      </div>
                      <div className="user-balance">
                        <span className="balance-label">Balance:</span> ₱{(user.balance || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <button
                    className="action-button tap-in-button"
                    onClick={() => handleTapIn(user)}
                  >
                    <MdCheckCircle />
                    <span>Tap In</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Onboarded Users Section */}
        <div className="users-section">
          <div className="section-header">
            <MdCheckCircle className="section-icon onboarded" />
            <h2 className="section-title">Onboarded</h2>
            <span className="user-count">{onboardedUsers.length}</span>
          </div>

          {onboardedUsers.length === 0 ? (
            <div className="empty-state">
              <p>No users onboarded</p>
            </div>
          ) : (
            <div className="users-list">
              {onboardedUsers.map((user) => (
                <div key={user.id} className="user-card onboarded-card">
                  <div className="user-info">
                    <div className="user-avatar onboarded">
                      <MdPerson />
                    </div>
                    <div className="user-details">
                      <div className="user-name">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="user-email">{user.email}</div>
                      <div className="user-route">
                        <span className="route-label">Route:</span> {getRouteDisplay(user)}
                      </div>
                      <div className="user-balance">
                        <span className="balance-label">Balance:</span> ₱{(user.balance || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <button
                    className="action-button tap-out-button"
                    onClick={() => handleTapOut(user)}
                  >
                    <MdCheckCircle />
                    <span>Tap Out</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Success Modal - Enhanced for Tap Out/In */}
        {showSuccessModal && (
          <div className="custom-modal-overlay" onClick={() => {
            setShowSuccessModal(false)
            setSuccessDetails(null)
          }}>
            <div className="custom-modal success-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon-wrapper success-icon-wrapper">
                <div className={`modal-icon success-icon-circle ${successDetails?.type === 'tap-out' ? 'trip-completed-icon' : ''}`}>
                  {successDetails?.type === 'tap-out' ? '✓' : '✓'}
                </div>
              </div>
              <h2 className="modal-title">
                {successDetails?.type === 'tap-out' ? 'Trip Completed!' : 'Tap In Successful'}
              </h2>
              <div className="modal-content">
                <p className="modal-message">{successMessage}</p>
                {successDetails && (
                  <div className="success-details-card">
                    {successDetails.type === 'tap-out' && (
                      <>
                        <div className="success-detail-item">
                          <span className="detail-label">Passenger:</span>
                          <span className="detail-value">{successDetails.userName}</span>
                        </div>
                        {successDetails.routeDetails && (
                          <div className="success-detail-item">
                            <span className="detail-label">Completed Route:</span>
                            <span className="detail-value highlight">{successDetails.route}</span>
                          </div>
                        )}
                        <div className="success-trip-badge">
                          <span className="trip-icon">🎉</span>
                          <span className="trip-text">Trip completed successfully</span>
                        </div>
                      </>
                    )}
                    {successDetails.type === 'tap-in' && (
                      <>
                        <div className="success-detail-item">
                          <span className="detail-label">Passenger:</span>
                          <span className="detail-value">{successDetails.userName}</span>
                        </div>
                        {successDetails.routeDetails && (
                          <div className="success-detail-item">
                            <span className="detail-label">Route:</span>
                            <span className="detail-value">{successDetails.route}</span>
                          </div>
                        )}
                        <div className="success-detail-item highlight">
                          <span className="detail-label">Fare Deducted:</span>
                          <span className="detail-value fare-highlight">₱{successDetails.fare?.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button 
                  className="modal-btn primary-btn" 
                  onClick={() => {
                    setShowSuccessModal(false)
                    setSuccessDetails(null)
                  }}
                >
                  OK
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
              <p className="modal-message">{errorMessage}</p>
              <div className="modal-actions">
                <button className="modal-btn primary-btn" onClick={() => setShowErrorModal(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Route Selection Modal */}
        {showRouteModal && (
          <div className="custom-modal-overlay" onClick={() => setShowRouteModal(false)}>
            <div className="custom-modal confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon-wrapper info-icon-wrapper">
                <div className="modal-icon info-icon-circle">
                  <MdSwapHoriz style={{ fontSize: '24px' }} />
                </div>
              </div>
              <h2 className="modal-title">Change Jeepney Route</h2>
              <div className="modal-content">
                <div className="route-selection-form">
                  <div className="form-group">
                    <label className="form-label">From Terminal:</label>
                    <select 
                      className="form-select"
                      value={selectedFromTerminal}
                      onChange={(e) => setSelectedFromTerminal(parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4].map(term => (
                        <option key={term} value={term}>Terminal {term}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Terminal:</label>
                    <select 
                      className="form-select"
                      value={selectedToTerminal}
                      onChange={(e) => setSelectedToTerminal(parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4].filter(term => term !== selectedFromTerminal).map(term => (
                        <option key={term} value={term}>Terminal {term}</option>
                      ))}
                    </select>
                  </div>
                  <div className="route-preview">
                    <span className="route-preview-label">New Route:</span>
                    <span className="route-preview-value">
                      Terminal {selectedFromTerminal} → Terminal {selectedToTerminal}
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="modal-btn secondary-btn" onClick={() => setShowRouteModal(false)}>
                  Cancel
                </button>
                <button className="modal-btn primary-btn" onClick={handleUpdateRoute}>
                  Update Route
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="driver-footer">
          <p className="footer-note">
            💡 This page auto-refreshes every 5 seconds. Click Refresh for immediate update.
          </p>
          <p className="footer-note rp4-note">
            📡 RP4 card reader: tap-in/tap-out is processed automatically. Result is written to <code>lastTap</code> for the device.
          </p>
          {lastRp4Tap && (
            <p className="footer-note last-tap-note">
              Last card tap: {lastRp4Tap.result?.active ? '✓' : '✗'} {lastRp4Tap.result?.reason} — {lastRp4Tap.result?.name || lastRp4Tap.uid}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DriverSimulationPage
