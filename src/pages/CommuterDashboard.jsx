import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdPerson, MdEdit, MdArrowForward, MdMap, MdAdd, MdCreditCard, MdAccountBalance, MdLocationOn } from 'react-icons/md'
import { FaMobileAlt, FaCoins } from 'react-icons/fa'
import { SiGrab } from 'react-icons/si'
import { HiCreditCard } from 'react-icons/hi'
import FooterNav from '../components/FooterNav'
import { getTranslations } from '../translations'
import { 
  updateUserBalance, 
  addTransaction, 
  updateUserTerminal, 
  updateUserRoute,
  getUserTransactions,
  getJeepneys,
  initializeJeepney
} from '../firebase/firestore'
import { doc, onSnapshot, collection } from 'firebase/firestore'
import { db } from '../firebase/config'
import './CommuterDashboard.css'

const CommuterDashboard = ({ currentUser, userData, setUserData, onLogout }) => {
  const navigate = useNavigate()
  
  // Use refs to track previous values for comparison
  const prevStatusRef = useRef(null)
  const prevRouteRef = useRef(null)
  
  // Real-time listener for user data updates (status, balance, etc.)
  useEffect(() => {
    if (!currentUser || !currentUser.uid) return

    const userRef = doc(db, 'users', currentUser.uid)
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const updatedData = docSnap.data()
        const newStatus = updatedData.status || null
        const newRoute = updatedData.currentRoute || null
        
        // Detect tap-in: status changed from 'waiting' to 'onboarded'
        if (prevStatusRef.current === 'waiting' && newStatus === 'onboarded') {
          setShowTapInNotification(true)
          // Auto-dismiss after 5 seconds
          setTimeout(() => {
            setShowTapInNotification(false)
          }, 5000)
        }
        
        // Detect tap-out: status changed from 'onboarded' to null AND route was cleared
        if (prevStatusRef.current === 'onboarded' && newStatus === null && newRoute === null && prevRouteRef.current) {
          // Store the route that was just cleared
          setCompletedTripRoute({
            from: prevRouteRef.current.from,
            to: prevRouteRef.current.to
          })
          setShowSuccessModal(true)
        }
        
        // Update refs with new values
        prevStatusRef.current = newStatus
        prevRouteRef.current = newRoute
        
        setUserData(prev => ({
          ...prev,
          ...updatedData,
          id: docSnap.id
        }))
      }
    }, (error) => {
      console.error('Error listening to user updates:', error)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])
  
  // Initialize refs when userData changes (for initial load)
  useEffect(() => {
    if (userData?.status !== undefined && prevStatusRef.current === null) {
      prevStatusRef.current = userData.status || null
    }
    if (userData?.currentRoute !== undefined && prevRouteRef.current === null) {
      prevRouteRef.current = userData.currentRoute || null
    }
  }, [userData?.status, userData?.currentRoute])

  // Load jeepneys from Firestore
  useEffect(() => {
    const loadJeepneys = async () => {
      try {
        // Initialize default jeepneys if they don't exist
        await initializeJeepney('jeep1')
        
        // Set up real-time listener for jeepneys
        const jeepneysRef = collection(db, 'jeepneys')
        const unsubscribe = onSnapshot(jeepneysRef, (snapshot) => {
          const jeepneysList = []
          snapshot.forEach((doc) => {
            jeepneysList.push({ id: doc.id, ...doc.data() })
          })
          
          // Ensure we have all 4 jeepneys (add inactive ones if missing)
          const jeepneyIds = jeepneysList.map(j => j.id)
          const defaultJeepneys = [
            { id: 'jeep1', name: 'Jeep 1', seatCount: 0, maxSeats: 2, direction: 'right', fromTerminal: 1, toTerminal: 2, isActive: true },
            { id: 'jeep2', name: 'Jeep 2', seatCount: 0, maxSeats: 2, direction: 'left', fromTerminal: 2, toTerminal: 1, isActive: false },
            { id: 'jeep3', name: 'Jeep 3', seatCount: 0, maxSeats: 2, direction: 'left', fromTerminal: 2, toTerminal: 1, isActive: false },
            { id: 'jeep4', name: 'Jeep 4', seatCount: 0, maxSeats: 2, direction: 'right', fromTerminal: 1, toTerminal: 2, isActive: false },
          ]
          
          defaultJeepneys.forEach(defaultJeep => {
            if (!jeepneyIds.includes(defaultJeep.id)) {
              jeepneysList.push(defaultJeep)
            } else {
              // Update with actual data, but keep inactive status for jeep2-4
              const existing = jeepneysList.find(j => j.id === defaultJeep.id)
              if (existing && defaultJeep.id !== 'jeep1') {
                existing.isActive = false
              }
            }
          })
          
          // Sort by id to maintain order
          jeepneysList.sort((a, b) => a.id.localeCompare(b.id))
          setJeepneys(jeepneysList)
        }, (error) => {
          console.error('Error listening to jeepneys:', error)
        })
        
        return () => unsubscribe()
      } catch (error) {
        console.error('Error loading jeepneys:', error)
      }
    }
    
    loadJeepneys()
  }, [])

  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [topUpStep, setTopUpStep] = useState('amount') // 'amount', 'payment', 'review', 'processing', 'success'
  const [topUpAmount, setTopUpAmount] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)
  const [transactionId, setTransactionId] = useState('')
  const [newBalanceAfterTopUp, setNewBalanceAfterTopUp] = useState(null) // Store the new balance after top-up for success modal
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [completedTripRoute, setCompletedTripRoute] = useState(null)
  const [showTapInNotification, setShowTapInNotification] = useState(false)
  const [jeepneys, setJeepneys] = useState([
    { id: 'jeep1', name: 'Jeep 1', seatCount: 0, maxSeats: 2, direction: 'right', fromTerminal: 1, toTerminal: 2, isActive: true },
    { id: 'jeep2', name: 'Jeep 2', seatCount: 0, maxSeats: 2, direction: 'left', fromTerminal: 2, toTerminal: 1, isActive: false },
    { id: 'jeep3', name: 'Jeep 3', seatCount: 0, maxSeats: 2, direction: 'left', fromTerminal: 2, toTerminal: 1, isActive: false },
    { id: 'jeep4', name: 'Jeep 4', seatCount: 0, maxSeats: 2, direction: 'right', fromTerminal: 1, toTerminal: 2, isActive: false },
  ])

  const currentTerminal = userData?.currentTerminal || 1
  const balance = userData?.balance || 250.00
  const currentRoute = userData?.currentRoute || null // { from: 1, to: 2 }
  const userStatus = userData?.status || null // 'waiting', 'onboarded', or null
  const currentLanguage = userData?.language || 'English'
  const t = getTranslations(currentLanguage)

  const getDirectionArrows = (jeepney) => {
    const fromTerminal = jeepney.fromTerminal || jeepney.fromTerminal
    const toTerminal = jeepney.toTerminal || jeepney.toTerminal
    if (jeepney.direction === 'right') {
      return `${fromTerminal} ►►► ${toTerminal}`
    } else {
      return `${fromTerminal} ◄◄◄ ${toTerminal}`
    }
  }

  const getPassengerColor = (seatCount, maxSeats) => {
    return seatCount >= maxSeats ? '#f44336' : '#4caf50'
  }

  // Save scroll position before navigating away
  const saveScrollPosition = () => {
    const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
    sessionStorage.setItem('dashboardScrollPosition', scrollY.toString())
    sessionStorage.setItem('dashboardScrollTimestamp', Date.now().toString())
  }

  // Restore scroll position synchronously before paint to prevent glitch
  useLayoutEffect(() => {
    // Check if we're coming back from another page
    const savedScrollPosition = sessionStorage.getItem('dashboardScrollPosition')
    const savedTimestamp = sessionStorage.getItem('dashboardScrollTimestamp')
    
    if (savedScrollPosition && savedTimestamp) {
      const timeDiff = Date.now() - parseInt(savedTimestamp, 10)
      // Only restore if scroll was saved within the last 30 seconds (likely from navigation)
      if (timeDiff < 30000) {
        const scrollY = parseInt(savedScrollPosition, 10)
        
        // Restore scroll position immediately before paint
        // This prevents the visible jump from top to saved position
        if (document.documentElement.scrollHeight > scrollY) {
          // Set scroll position immediately using both methods for compatibility
          document.documentElement.scrollTop = scrollY
          document.body.scrollTop = scrollY
          window.scrollTo(0, scrollY)
        }
        
        // Clear the saved position after restoring
        sessionStorage.removeItem('dashboardScrollPosition')
        sessionStorage.removeItem('dashboardScrollTimestamp')
      } else {
        // Clear old saved positions
        sessionStorage.removeItem('dashboardScrollPosition')
        sessionStorage.removeItem('dashboardScrollTimestamp')
      }
    }
  }, []) // Only run once when component mounts

  const handleChooseDestination = () => {
    // Only allow choosing destination if origin is selected
    if (!currentTerminal) {
      setInfoMessage('Please select your origin terminal first')
      setShowInfoModal(true)
      setTimeout(() => {
        saveScrollPosition()
        navigate('/select-origin')
      }, 1500)
      return
    }
    saveScrollPosition()
    navigate('/choose-destination', { state: { mode: 'choose' } })
  }

  const handleExtendTo = () => {
    // Only allow extending if user is onboarded
    if (userStatus !== 'onboarded') {
      return
    }
    if (!currentRoute) {
      setInfoMessage(t.chooseDestination)
      setShowInfoModal(true)
      return
    }
    
    // Check if extension is possible based on route direction and end terminals
    const from = currentRoute.from
    const to = currentRoute.to
    
    // Cannot extend if already at end terminals:
    // - Terminal 1→4 (forward, reached end at 4)
    // - Terminal 4→1 (backward, reached end at 1)
    if ((to > from && to === 4) || (to < from && to === 1)) {
      setInfoMessage('Cannot extend route: You have reached the end terminal.')
      setShowInfoModal(true)
      return
    }
    
    saveScrollPosition()
    navigate('/choose-destination', { state: { mode: 'extend', currentRoute } })
  }
  
  // Helper function to check if route can be extended
  const canExtendRoute = () => {
    if (!currentRoute || userStatus !== 'onboarded') {
      return false
    }
    
    const from = currentRoute.from
    const to = currentRoute.to
    
    // Cannot extend if already at end terminals
    if ((to > from && to === 4) || (to < from && to === 1)) {
      return false
    }
    
    return true
  }

  const handleChangeRoute = () => {
    // Change route - navigate to destination page with 'choose' mode
    saveScrollPosition()
    navigate('/choose-destination', { state: { mode: 'choose', changeRoute: true } })
  }

  const handleSelectOrigin = () => {
    saveScrollPosition()
    navigate('/select-origin')
  }

  const handleTopUp = () => {
    setShowTopUpModal(true)
    setTopUpStep('amount')
    setTopUpAmount('')
    setSelectedPaymentMethod(null)
    setTransactionId('')
  }

  const handleAmountContinue = () => {
    const amount = parseInt(topUpAmount)
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Please enter a valid amount (whole numbers only)')
      setShowErrorModal(true)
      return
    }
    if (amount > 10000) {
      setErrorMessage('Maximum top-up amount is ₱10,000 per transaction')
      setShowErrorModal(true)
      return
    }
    setTopUpStep('payment')
  }

  const handlePaymentContinue = () => {
    if (!selectedPaymentMethod) {
      setErrorMessage('Please select a payment method')
      setShowErrorModal(true)
      return
    }
    setTopUpStep('review')
  }

  const handleTopUpConfirm = async () => {
    if (!currentUser || !currentUser.uid) {
      setErrorMessage('User not authenticated. Please login again.')
      setShowErrorModal(true)
      return
    }

    const amount = parseInt(topUpAmount)
    
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Please enter a valid amount (whole numbers only)')
      setShowErrorModal(true)
      return
    }
    if (amount > 10000) {
      setErrorMessage('Maximum top-up amount is ₱10,000 per transaction')
      setShowErrorModal(true)
      return
    }
    
    // Move to processing step
    setTopUpStep('processing')
    
    try {
      // Update balance in Firestore
      await updateUserBalance(currentUser.uid, amount)
      
      // Get updated balance
      const newBalance = balance + amount
      
      // Add transaction to Firestore
      const transactionId = await addTransaction(currentUser.uid, {
        type: 'top-up',
        amount: amount,
        paymentMethod: selectedPaymentMethod,
        description: `${t.topUp} via ${getPaymentMethodName(selectedPaymentMethod)}`,
        balanceAfter: newBalance
      })
      
      // Create transaction object for local state
      const newTransaction = {
        id: transactionId,
        type: 'top-up',
        amount: amount,
        paymentMethod: selectedPaymentMethod,
        timestamp: new Date(),
        createdAt: new Date(),
        description: `${t.topUp} via ${getPaymentMethodName(selectedPaymentMethod)}`,
        balanceAfter: newBalance
      }
      
      // Update local state
      setUserData({
        ...userData,
        balance: newBalance,
        transactions: [newTransaction, ...(userData.transactions || [])]
      })
      
      // Store new balance for success modal display
      setNewBalanceAfterTopUp(newBalance)
      setTransactionId(transactionId)
      setTopUpStep('success')
    } catch (error) {
      console.error('Top-up error:', error)
      setErrorMessage('Failed to process top-up. Please try again.')
      setShowErrorModal(true)
      setTopUpStep('review') // Go back to review step
    }
  }

  const handleTopUpClose = () => {
    setShowTopUpModal(false)
    setTopUpStep('amount')
    setTopUpAmount('')
    setSelectedPaymentMethod(null)
    setTransactionId('')
    setNewBalanceAfterTopUp(null) // Reset new balance
  }

  const handleBackStep = () => {
    if (topUpStep === 'payment') {
      setTopUpStep('amount')
    } else if (topUpStep === 'review') {
      setTopUpStep('payment')
    }
  }

  const presetAmounts = [100, 200, 500, 1000]
  
  // Payment methods grouped by category (matching Codashop Philippines)
  // Using provided SVG files for icons
  const paymentMethods = {
    eWallets: [
      { id: 'gcash', name: 'GCash', iconPath: '/Gcash.svg', color: '#0070BA' },
      { id: 'maya', name: 'Maya', iconPath: '/Maya.svg', color: '#00A859' },
      { id: 'grabpay', name: 'GrabPay', icon: SiGrab, color: '#00B14F' }, // No SVG provided, keep react-icon
      { id: 'coinsph', name: 'Coins.ph', icon: FaCoins, color: '#F7931E' } // No SVG provided, keep react-icon
    ],
    banks: [
      { id: 'bdo', name: 'BDO', iconPath: '/BDO.svg', color: '#E62129' },
      { id: 'bpi', name: 'BPI', iconPath: '/BPI.svg', color: '#E51837' },
      { id: 'metrobank', name: 'Metrobank', iconPath: '/Metrobank.svg', color: '#E1192E' },
      { id: 'rcbc', name: 'RCBC', iconPath: '/RCBC.svg', color: '#EE3124' }
    ],
    cards: [
      { id: 'visa', name: 'Visa', iconPath: '/Visa.svg', color: '#1434CB' },
      { id: 'mastercard', name: 'Mastercard', iconPath: '/Mastercard.svg', color: '#EB001B' }
    ]
  }
  
  const getPaymentMethodName = (method) => {
    const allMethods = [
      ...paymentMethods.eWallets,
      ...paymentMethods.banks,
      ...paymentMethods.cards
    ]
    const found = allMethods.find(m => m.id === method)
    return found ? found.name : method
  }
  
  const getPaymentMethodIcon = (method) => {
    const allMethods = [
      ...paymentMethods.eWallets,
      ...paymentMethods.banks,
      ...paymentMethods.cards
    ]
    const found = allMethods.find(m => m.id === method)
    return found ? found.icon : null
  }
  
  const getPaymentMethodIconPath = (method) => {
    const allMethods = [
      ...paymentMethods.eWallets,
      ...paymentMethods.banks,
      ...paymentMethods.cards
    ]
    const found = allMethods.find(m => m.id === method)
    return found ? found.iconPath : null
  }
  
  const getPaymentMethodColor = (method) => {
    const allMethods = [
      ...paymentMethods.eWallets,
      ...paymentMethods.banks,
      ...paymentMethods.cards
    ]
    const found = allMethods.find(m => m.id === method)
    return found ? found.color : '#1e88e5'
  }

  return (
    <div className="mobile-container page-with-footer">
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div className="logo-text">
            <span className="logo-blue">CPE11-</span>
            <span className="logo-green">AFCS</span>
          </div>
        </div>

        <div className="card-balance-section">
          <div className="balance-card">
            <div className="balance-header">
              <span className="balance-label">{t.cardBalance}</span>
              <button 
                className="topup-button"
                onClick={handleTopUp}
                title={t.topUpBalance}
              >
                <MdAdd />
              </button>
            </div>
            <div className="balance-amount">
              <span className="currency">₱</span>
              <span className="amount">{balance.toFixed(2)}</span>
            </div>
            <div className="card-number">
              {t.cardNumber}: {(() => {
                const cardNum = userData?.cardNumber || '0000 0000 0000 1234'
                // Extract last 4 digits
                const last4 = cardNum.replace(/\s/g, '').slice(-4)
                return `**** ${last4}`
              })()}
            </div>
          </div>
        </div>

        <div className="jeepneys-section">
          <div className="section-header">
            <h2 className="section-title">{t.availableModernJeepneys}</h2>
            <MdMap className="map-icon" />
          </div>
          <div className="map-background">
            <div className="jeepneys-grid">
              {jeepneys.map((jeepney) => {
                const isActive = jeepney.isActive === true
                const seatCount = jeepney.seatCount || 0
                const maxSeats = jeepney.maxSeats || 2
                const isFull = seatCount >= maxSeats
                return (
                <div 
                  key={jeepney.id} 
                  className={`jeepney-card ${isFull ? 'full' : ''} ${!isActive ? 'inactive' : ''}`}
                >
                  <div className="jeepney-name">{jeepney.name}</div>
                  <div className="jeepney-middle-row">
                    <img src="/AvailableModernJeepneysSymbol.png" alt="Jeepney" className="jeepney-icon" />
                    <div className="passenger-count">
                      <MdPerson 
                        className="passenger-icon"
                        style={{ color: getPassengerColor(seatCount, maxSeats) }}
                      />
                      <span 
                        className="passenger-text"
                        style={{ color: getPassengerColor(seatCount, maxSeats) }}
                      >
                        {seatCount}/{maxSeats}
                      </span>
                    </div>
                  </div>
                  <div className="direction-arrows" style={{ minHeight: isActive ? 'auto' : '24px' }}>
                    {isActive && getDirectionArrows(jeepney)}
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Route Planning Section - Advanced Design */}
        <div className="route-section-advanced">
          <div className="route-section-header-modern">
            <div className="header-content">
              <div className="header-icon-wrapper">
                <MdMap className="header-icon" />
              </div>
              <div className="header-text">
                <h3 className="route-section-title-modern">
                  {currentRoute ? t.yourRoute : t.chooseDestinationTerminal}
                </h3>
                {currentRoute && (
                  <p className="route-subtitle">Your selected journey</p>
                )}
              </div>
            </div>
          </div>

          {/* Modern Route Card */}
          <div className="route-card-modern">
            {/* Current Location Section */}
            <div className="location-section-modern">
              <div className="location-pin-container">
                <div className="location-pin-pulse"></div>
                <div className="location-icon-modern">
                  <MdLocationOn />
                </div>
              </div>
              <div className="location-info-modern">
                <div className="location-label-modern">{t.currentLocation}</div>
                <div className="terminal-info-group">
                  <span className="terminal-badge-modern">
                    <span className="terminal-prefix">{t.terminal}</span>
                    <span className="terminal-number-text">{currentTerminal}</span>
                  </span>
                  {userStatus !== 'onboarded' && (
                    <button 
                      className="edit-origin-btn-modern"
                      onClick={handleSelectOrigin}
                      title={t.changeOrigin}
                    >
                      <MdEdit />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Route Visualization */}
            {currentRoute && (
              <>
                <div className="route-visualization-modern">
                  <div className="route-connector-line"></div>
                  <div className="route-terminals-modern">
                    <div className="terminal-node start">
                      <div className="terminal-circle">
                        <span className="terminal-node-number">{currentRoute.from}</span>
                      </div>
                      <div className="terminal-label-modern">Origin</div>
                    </div>
                    <div className="route-progress-modern">
                      <div className="route-line-active"></div>
                      <div className="route-arrow-modern">
                        <MdArrowForward />
                      </div>
                    </div>
                    <div className="terminal-node end">
                      <div className="terminal-circle">
                        <span className="terminal-node-number">{currentRoute.to}</span>
                      </div>
                      <div className="terminal-label-modern">Destination</div>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  {userStatus && (
                    <div className={`route-status-modern ${userStatus}`}>
                      <div className="status-indicator"></div>
                      <div className="status-content">
                        <span className="status-icon-modern">
                          {userStatus === 'waiting' ? '⏳' : '✅'}
                        </span>
                        <span className="status-text-modern">
                          {userStatus === 'waiting' ? 'Waiting for boarding' : 'Currently onboarded'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Second Card: Route Details with Extension Status */}
                <div className="route-details-card">
                  <div className="route-details-content">
                    {/* Passenger Count */}
                    <div className="passenger-count-section">
                      <MdPerson className="passenger-icon" />
                      <span className="passenger-number">1</span>
                    </div>
                    
                    {/* Separator */}
                    <div className="route-details-separator"></div>
                    
                    {/* Route Info */}
                    <div className="route-info-section">
                      <div className="route-from-section">
                        <span className="route-from-label">{t.from}</span>
                        <span className="route-terminal-text">Terminal {currentRoute.from}</span>
                      </div>
                      
                      <div className="route-arrow-green">
                        <MdArrowForward />
                      </div>
                      
                      <div className="route-to-section">
                        <MdLocationOn className="route-destination-pin" />
                        <span className="route-terminal-text">Terminal {currentRoute.to}</span>
                      </div>
                    </div>
                    
                    {/* Extension Section */}
                    <div className="route-extension-section">
                      <div className="route-arrow-gray">
                        <MdArrowForward />
                      </div>
                      <span className="route-extension-label">{t.extendTo}</span>
                      <span className="route-extension-placeholder">---</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons - Modern Design */}
            <div className="route-actions-modern">
              {currentTerminal && !currentRoute && (
                <button 
                  className="action-btn-modern primary-modern"
                  onClick={handleChooseDestination}
                >
                  <div className="btn-glow"></div>
                  <MdMap className="btn-icon-modern" />
                  <span className="btn-text-modern">{t.chooseDestination}</span>
                  <div className="btn-shine"></div>
                </button>
              )}
              
              {currentRoute && userStatus === 'waiting' && (
                <button 
                  className="action-btn-modern secondary-modern"
                  onClick={handleChangeRoute}
                >
                  <MdEdit className="btn-icon-modern" />
                  <span className="btn-text-modern">Change Route</span>
                </button>
              )}
              
              {currentRoute && userStatus === 'onboarded' && canExtendRoute() && (
                <button 
                  className="action-btn-modern extend-modern"
                  onClick={handleExtendTo}
                >
                  <div className="btn-glow-extend"></div>
                  <MdArrowForward className="btn-icon-modern" />
                  <span className="btn-text-modern">{t.extendTo}</span>
                  <div className="btn-shine"></div>
                </button>
              )}

              {currentRoute && userStatus === 'onboarded' && !canExtendRoute() && (
                <div className="info-badge-modern">
                  <div className="info-icon-wrapper">
                    <span>ℹ️</span>
                  </div>
                  <span className="info-text-modern">End terminal reached. Cannot extend further.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <FooterNav language={currentLanguage} />

      {/* Tap In Notification Toast */}
      {showTapInNotification && (
        <div className="tap-in-notification">
          <div className="tap-in-notification-content">
            <div className="tap-in-notification-icon">✅</div>
            <div className="tap-in-notification-text">
              <div className="tap-in-notification-title">{t.tappedIn || "You're tapped in!"}</div>
              <div className="tap-in-notification-message">{t.enjoyRide || "Enjoy your ride"}</div>
            </div>
            <button 
              className="tap-in-notification-close"
              onClick={() => setShowTapInNotification(false)}
            >
              ×
            </button>
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

      {/* Info Modal */}
      {showInfoModal && (
        <div className="custom-modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="custom-modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-wrapper info-icon-wrapper">
              <div className="modal-icon info-icon-circle">ℹ️</div>
            </div>
            <h2 className="modal-title">Information</h2>
            <p className="modal-message">{infoMessage}</p>
            <div className="modal-actions">
              <button className="modal-btn primary-btn" onClick={() => setShowInfoModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal - Trip Completed (Tap Out) */}
      {showSuccessModal && completedTripRoute && (
        <div className="custom-modal-overlay" onClick={() => {
          setShowSuccessModal(false)
          setCompletedTripRoute(null)
        }}>
          <div className="custom-modal success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-wrapper success-icon-wrapper">
              <div className="modal-icon success-icon-circle trip-completed-icon">✓</div>
            </div>
            <h2 className="modal-title">Trip Completed!</h2>
            <div className="modal-content">
              <p className="modal-message">You have successfully completed your trip!</p>
              <div className="success-details-card">
                <div className="success-detail-item">
                  <span className="detail-label">Completed Route:</span>
                  <span className="detail-value highlight">
                    Terminal {completedTripRoute.from} → Terminal {completedTripRoute.to}
                  </span>
                </div>
                <div className="success-trip-badge">
                  <span className="trip-icon">🎉</span>
                  <span className="trip-text">Trip completed successfully</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn primary-btn" 
                onClick={() => {
                  setShowSuccessModal(false)
                  setCompletedTripRoute(null)
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-Up Modal */}
      {showTopUpModal && (
        <div className="topup-modal-overlay" onClick={topUpStep === 'success' || topUpStep === 'processing' ? undefined : handleTopUpClose}>
          <div className="topup-modal" onClick={(e) => e.stopPropagation()}>
            {/* Step Indicator */}
            <div className="topup-steps">
              <div className={`step ${['amount', 'payment', 'review', 'processing', 'success'].indexOf(topUpStep) >= 0 ? 'active' : ''}`}>
                <div className="step-number">1</div>
                <div className="step-label">Amount</div>
              </div>
              <div className={`step ${['payment', 'review', 'processing', 'success'].indexOf(topUpStep) >= 0 ? 'active' : ''}`}>
                <div className="step-number">2</div>
                <div className="step-label">Payment</div>
              </div>
              <div className={`step ${['review', 'processing', 'success'].indexOf(topUpStep) >= 0 ? 'active' : ''}`}>
                <div className="step-number">3</div>
                <div className="step-label">Review</div>
              </div>
            </div>

            {/* Step 1: Amount Selection */}
            {topUpStep === 'amount' && (
              <>
                <h2 className="topup-modal-title">{t.topUpBalance}</h2>
                <div className="topup-amount-section">
                  <label className="topup-label">{t.enterAmount}</label>
                  <div className="topup-input-group">
                    <span className="topup-currency">₱</span>
                    <input
                      type="number"
                      className="topup-amount-input"
                      placeholder="0"
                      value={topUpAmount}
                      onChange={(e) => {
                        const value = e.target.value
                        // Only allow positive integers (or empty string)
                        if (value === '' || /^\d+$/.test(value)) {
                          const numValue = parseInt(value) || 0
                          // Limit to maximum of 10,000
                          if (value === '' || numValue <= 10000) {
                            setTopUpAmount(value)
                          }
                        }
                      }}
                      min="1"
                      max="10000"
                      step="1"
                      autoFocus
                    />
                  </div>
                  
                  <div className="preset-amounts">
                    {presetAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        className={`preset-amount-btn ${topUpAmount === amount.toString() ? 'selected' : ''}`}
                        onClick={() => setTopUpAmount(amount.toString())}
                      >
                        ₱{amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="topup-modal-actions">
                  <button className="topup-cancel-btn" onClick={handleTopUpClose}>
                    {t.cancel}
                  </button>
                  <button 
                    className="topup-continue-btn" 
                    onClick={handleAmountContinue}
                    disabled={!topUpAmount || parseInt(topUpAmount) <= 0 || parseInt(topUpAmount) > 10000 || isNaN(parseInt(topUpAmount))}
                  >
                    {t.continue} →
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Payment Method Selection */}
            {topUpStep === 'payment' && (
              <>
                <h2 className="topup-modal-title">{t.paymentMethod}</h2>
                <div className="topup-payment-section">
                  {/* E-Wallets Section */}
                  <div className="payment-category">
                    <h3 className="payment-category-title">E-Wallets</h3>
                    <div className="payment-methods">
                      {paymentMethods.eWallets.map((method) => {
                        return (
                          <button
                            key={method.id}
                            type="button"
                            className={`payment-method ${selectedPaymentMethod === method.id ? 'selected' : ''}`}
                            onClick={() => setSelectedPaymentMethod(method.id)}
                            style={{
                              '--payment-color': method.color
                            }}
                          >
                            {method.iconPath ? (
                              <img src={method.iconPath} alt={method.name} className="payment-icon payment-icon-svg" />
                            ) : method.icon ? (
                              <method.icon className="payment-icon" />
                            ) : null}
                            <span className="payment-name">{method.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Banks Section */}
                  <div className="payment-category">
                    <h3 className="payment-category-title">Banks</h3>
                    <div className="payment-methods">
                      {paymentMethods.banks.map((method) => {
                        return (
                          <button
                            key={method.id}
                            type="button"
                            className={`payment-method ${selectedPaymentMethod === method.id ? 'selected' : ''}`}
                            onClick={() => setSelectedPaymentMethod(method.id)}
                            style={{
                              '--payment-color': method.color
                            }}
                          >
                            {method.iconPath ? (
                              <img src={method.iconPath} alt={method.name} className="payment-icon payment-icon-svg" />
                            ) : method.icon ? (
                              <method.icon className="payment-icon" />
                            ) : null}
                            <span className="payment-name">{method.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Credit/Debit Cards Section */}
                  <div className="payment-category">
                    <h3 className="payment-category-title">Credit/Debit Cards</h3>
                    <div className="payment-methods">
                      {paymentMethods.cards.map((method) => {
                        return (
                          <button
                            key={method.id}
                            type="button"
                            className={`payment-method ${selectedPaymentMethod === method.id ? 'selected' : ''}`}
                            onClick={() => setSelectedPaymentMethod(method.id)}
                            style={{
                              '--payment-color': method.color
                            }}
                          >
                            {method.iconPath ? (
                              <img src={method.iconPath} alt={method.name} className="payment-icon payment-icon-svg" />
                            ) : method.icon ? (
                              <method.icon className="payment-icon" />
                            ) : null}
                            <span className="payment-name">{method.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="topup-modal-actions">
                  <button className="topup-back-btn" onClick={handleBackStep}>
                    ← {t.back}
                  </button>
                  <button 
                    className="topup-continue-btn" 
                    onClick={handlePaymentContinue}
                    disabled={!selectedPaymentMethod}
                  >
                    {t.continue} →
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Review & Confirm */}
            {topUpStep === 'review' && (
              <>
                <h2 className="topup-modal-title">{t.reviewPayment}</h2>
                
                <div className="review-section">
                  <div className="review-item">
                    <span className="review-label">{t.topUpAmount}</span>
                    <span className="review-value">₱{parseInt(topUpAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">{t.paymentMethod}</span>
                    <span className="review-value payment-method-review">
                      {(() => {
                        const iconPath = getPaymentMethodIconPath(selectedPaymentMethod)
                        const PaymentIcon = getPaymentMethodIcon(selectedPaymentMethod)
                        const paymentColor = getPaymentMethodColor(selectedPaymentMethod)
                        return (
                          <>
                            {iconPath ? (
                              <img src={iconPath} alt={getPaymentMethodName(selectedPaymentMethod)} className="review-payment-icon" style={{ marginRight: '8px', width: '24px', height: '24px' }} />
                            ) : PaymentIcon ? (
                              <PaymentIcon style={{ color: paymentColor, marginRight: '8px' }} />
                            ) : null}
                            {getPaymentMethodName(selectedPaymentMethod)}
                          </>
                        )
                      })()}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">{t.serviceFee}</span>
                    <span className="review-value">₱0.00</span>
                  </div>
                  <div className="review-divider"></div>
                  <div className="review-item total">
                    <span className="review-label">{t.totalAmount}</span>
                    <span className="review-value">₱{parseInt(topUpAmount || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="topup-modal-actions">
                  <button className="topup-back-btn" onClick={handleBackStep}>
                    ← {t.back}
                  </button>
                  <button 
                    className="topup-confirm-btn" 
                    onClick={handleTopUpConfirm}
                  >
                    {t.confirmPayment}
                  </button>
                </div>
              </>
            )}

            {/* Step 4: Processing */}
            {topUpStep === 'processing' && (
              <>
                <div className="processing-section">
                  <div className="processing-spinner"></div>
                  <h2 className="processing-title">{t.processingPayment}</h2>
                  <p className="processing-message">{t.processingMessage}</p>
                </div>
              </>
            )}

            {/* Step 5: Success */}
            {topUpStep === 'success' && (
              <>
                <div className="success-section">
                  <div className="success-icon">✓</div>
                  <h2 className="success-title">{t.topUpSuccessful}</h2>
                  <div className="success-details">
                    <div className="success-item">
                      <span className="success-label">{t.amountAdded}</span>
                      <span className="success-value">₱{parseInt(topUpAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="success-item">
                      <span className="success-label">{t.transactionId}</span>
                      <span className="success-value small">{transactionId}</span>
                    </div>
                    <div className="success-item">
                      <span className="success-label">{t.newBalance}</span>
                      <span className="success-value">₱{(newBalanceAfterTopUp !== null ? newBalanceAfterTopUp : ((balance || 0) + parseInt(topUpAmount || 0))).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="topup-modal-actions">
                  <button 
                    className="topup-confirm-btn" 
                    onClick={handleTopUpClose}
                    style={{ width: '100%' }}
                  >
                    {t.done}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CommuterDashboard
