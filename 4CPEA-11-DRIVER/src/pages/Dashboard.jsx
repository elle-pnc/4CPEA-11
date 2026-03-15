import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UsersRound, ArrowRight, DollarSign, TrendingUp, FileText, Compass, MapPin } from 'lucide-react'
import { useSidebar } from '../hooks/useSidebar'
import {
  SAMPLE_TERMINALS,
  SAMPLE_CURRENT_PASSENGERS,
  SAMPLE_STATS,
  ROUTES,
  APP_NAME,
  ASSIGNED_VEHICLE,
} from '../constants'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import Sidebar from '../components/dashboard/Sidebar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Terminal from '../components/Terminal'
import Seat from '../components/Seat'
import UserActive from '../components/UserActive'
import UserInactive from '../components/UserInactive'
import UserOnline from '../components/UserOnline'
import { auth } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { subscribeUsersByStatus, subscribeActiveShift, startShift, endShift, subscribeDailyPassengerCount, subscribeDailyRevenue, subscribeDailyExpenses, saveDailyExpenses, subscribeJeepney, syncJeepneySeatCount, subscribeUserTripTransactions, updateJeepneyRoute, subscribeCurrentTerminal, updateCurrentTerminal, subscribeTerminalSourcePreference, updateTerminalSourcePreference } from '../firebase/firestore'
import './Dashboard.css'

// Icon mapping for stats
const iconMap = {
  Users,
  UsersRound,
  DollarSign,
  TrendingUp,
  FileText,
}

const colorMap = {
  blue: 'Blue',
  green: 'Green',
  yellow: 'Yellow',
  gray: 'Gray',
}

function Dashboard() {
  const navigate = useNavigate()
  const { isOpen: sidebarOpen, toggle: toggleSidebar, close: closeSidebar } = useSidebar(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [waitingUsers, setWaitingUsers] = useState([])
  const [onboardedUsers, setOnboardedUsers] = useState([])
  const [dailyPassengers, setDailyPassengers] = useState(0)
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [dailyExpenses, setDailyExpenses] = useState(0)
  const [passengerExtensions, setPassengerExtensions] = useState(new Set()) // Track which passengers have extended
  const [showExpensesModal, setShowExpensesModal] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [isSavingExpense, setIsSavingExpense] = useState(false)
  const [shiftId, setShiftId] = useState(null)
  const [shiftStartText, setShiftStartText] = useState('—')
  const [jeepneySeatCount, setJeepneySeatCount] = useState(0)
  const [jeepneyMaxSeats, setJeepneyMaxSeats] = useState(2)
  const [jeepneyRoute, setJeepneyRoute] = useState({ fromTerminal: 1, toTerminal: 2, direction: 'right' })
  const [selectedFromTerminal, setSelectedFromTerminal] = useState(1)
  const [selectedToTerminal, setSelectedToTerminal] = useState(2)
  const [isUpdatingRoute, setIsUpdatingRoute] = useState(false)
  const [currentTerminal, setCurrentTerminal] = useState(null)
  const [isUpdatingTerminal, setIsUpdatingTerminal] = useState(false)
  const [terminalSourcePreference, setTerminalSourcePreference] = useState('manual') // 'manual' | 'gps'

  const getPhilippinesTimeString = (date = new Date()) => {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  const handleLogout = () => {
    navigate(ROUTES.LOGIN)
  }

  const handleExpensesClick = () => {
    setShowExpensesModal(true)
  }

  const handleCloseExpensesModal = () => {
    setShowExpensesModal(false)
    setExpenseAmount('')
    setExpenseDescription('')
  }

  const handleSaveExpense = async () => {
    if (!currentUser) {
      return
    }

    const amount = parseFloat(expenseAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid expense amount')
      return
    }

    setIsSavingExpense(true)
    try {
      await saveDailyExpenses(currentUser.uid, amount, expenseDescription)
      handleCloseExpensesModal()
    } catch (error) {
      console.error('Error saving expense:', error.message)
      alert('Failed to save expense. Please try again.')
    } finally {
      setIsSavingExpense(false)
    }
  }

  const handleShiftToggle = () => {
    if (!shiftId) {
      if (!currentUser) {
        navigate(ROUTES.LOGIN)
        return
      }
      const startAtLocal = getPhilippinesTimeString()
      startShift(currentUser.uid, startAtLocal)
        .then((newShiftId) => {
          setShiftId(newShiftId)
          setShiftStartText(startAtLocal)
        })
        .catch(() => {
          // keep UI unchanged on failure
        })
      return
    }

    const endAtLocal = getPhilippinesTimeString()
    endShift(shiftId, endAtLocal)
      .then(() => {
        setShiftId(null)
        setShiftStartText('—')
      })
      .catch(() => {
        // keep UI unchanged on failure
      })
  }

  useEffect(() => {
    const unsubscribe = subscribeUsersByStatus('waiting', (users) => {
      setWaitingUsers(users || [])
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeUsersByStatus('onboarded', (users) => {
      setOnboardedUsers(users || [])
      // Sync seatCount whenever onboarded users change to ensure accuracy
      syncJeepneySeatCount('jeep1').catch((error) => {
        console.error('Failed to sync jeepney seatCount:', error.message)
      })
    })
    return () => unsubscribe()
  }, [])

  // Subscribe to trip transactions for each onboarded user to detect extensions
  useEffect(() => {
    if (!onboardedUsers || onboardedUsers.length === 0) {
      setPassengerExtensions(new Set())
      return
    }

    const unsubscribes = []
    const extendedSet = new Set()

    onboardedUsers.forEach((user) => {
      if (user.id) {
        const unsubscribe = subscribeUserTripTransactions(user.id, (transactionCount) => {
          // If user has 2+ trip transactions, they've extended
          setPassengerExtensions((prev) => {
            const newSet = new Set(prev)
            if (transactionCount >= 2) {
              newSet.add(user.id)
            } else {
              newSet.delete(user.id)
            }
            return newSet
          })
        })
        unsubscribes.push(unsubscribe)
      }
    })

    return () => {
      unsubscribes.forEach((unsub) => unsub())
    }
  }, [onboardedUsers])

  useEffect(() => {
    const unsubscribe = subscribeDailyPassengerCount((count) => {
      setDailyPassengers(count || 0)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeDailyRevenue((revenue) => {
      setDailyRevenue(revenue || 0)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setDailyExpenses(0)
      return
    }
    
    const unsubscribe = subscribeDailyExpenses(currentUser.uid, (expenses) => {
      setDailyExpenses(expenses || 0)
    })
    return () => unsubscribe()
  }, [currentUser])

  useEffect(() => {
    // Sync seatCount on mount to fix any discrepancies
    syncJeepneySeatCount('jeep1').catch((error) => {
      console.error('Failed to sync jeepney seatCount:', error.message)
    })
    
    const unsubscribe = subscribeJeepney('jeep1', (jeepney) => {
      setJeepneySeatCount(jeepney.seatCount || 0)
      setJeepneyMaxSeats(jeepney.maxSeats || 2)
      if (jeepney.fromTerminal && jeepney.toTerminal) {
        setJeepneyRoute({
          fromTerminal: jeepney.fromTerminal,
          toTerminal: jeepney.toTerminal,
          direction: jeepney.direction || (jeepney.fromTerminal < jeepney.toTerminal ? 'right' : 'left'),
        })
        setSelectedFromTerminal(jeepney.fromTerminal)
        setSelectedToTerminal(jeepney.toTerminal)
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeCurrentTerminal((terminal) => {
      setCurrentTerminal(terminal)
    })
    return () => unsubscribe()
  }, [])

  // Listen to driver's preferred terminal source (GPS vs manual)
  useEffect(() => {
    const unsubscribe = subscribeTerminalSourcePreference((source) => {
      setTerminalSourcePreference(source === 'gps' ? 'gps' : 'manual')
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null)
    })
    return () => unsubscribe()
  }, [])

  // Listen to active shift from Firebase so state persists when app is reopened
  useEffect(() => {
    if (!currentUser) {
      setShiftId(null)
      setShiftStartText('—')
      return
    }

    const unsubscribe = subscribeActiveShift(currentUser.uid, (activeShift) => {
      if (activeShift) {
        setShiftId(activeShift.id)
        if (activeShift.startAtLocal) {
          setShiftStartText(activeShift.startAtLocal)
        } else {
          const startAt = activeShift.startAt?.toDate?.() || new Date(activeShift.startAt)
          if (startAt) {
            setShiftStartText(getPhilippinesTimeString(startAt))
          }
        }
      } else {
        setShiftId(null)
        setShiftStartText('—')
      }
    })

    return () => unsubscribe()
  }, [currentUser])

  const terminalCounts = useMemo(() => {
    const counts = SAMPLE_TERMINALS.reduce((acc, terminal) => {
      acc[terminal.id] = 0
      return acc
    }, {})

    waitingUsers.forEach((user) => {
      const origin = user?.currentRoute?.from ?? user?.currentTerminal
      if (origin && counts[origin] !== undefined) {
        counts[origin] += 1
      }
    })

    return SAMPLE_TERMINALS.map((terminal) => ({
      ...terminal,
      passengers: counts[terminal.id] || 0,
      active: (counts[terminal.id] || 0) > 0,
    }))
  }, [waitingUsers])

  const onboardedDisplay = useMemo(() => {
    const slots = 2
    const filled = onboardedUsers.slice(0, slots)
    const placeholders = Array.from({ length: slots - filled.length }, () => null)
    return [...filled, ...placeholders]
  }, [onboardedUsers])

  const currentPassengerCount = useMemo(() => {
    // Use jeepney seatCount from Firestore instead of counting onboarded users
    return jeepneySeatCount
  }, [jeepneySeatCount])

  const statsDisplay = useMemo(() => {
    return SAMPLE_STATS.map((stat) => {
      if (stat.label === 'Current Passengers') {
        return {
          ...stat,
          value: String(currentPassengerCount),
        }
      }
      if (stat.label === 'Total Passengers Today') {
        return {
          ...stat,
          value: String(dailyPassengers),
        }
      }
      if (stat.label === 'Revenue') {
        // Format revenue with comma separators (e.g., ₱1,234.56)
        const formattedRevenue = dailyRevenue.toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        return {
          ...stat,
          value: `₱${formattedRevenue}`,
        }
      }
      if (stat.label === 'Expenses') {
        // Format expenses with comma separators (e.g., ₱1,234.56)
        const formattedExpenses = dailyExpenses.toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        return {
          ...stat,
          value: `₱${formattedExpenses}`,
        }
      }
      if (stat.label === 'Profit') {
        // Calculate profit: Revenue - Expenses
        const profit = dailyRevenue - dailyExpenses
        // Format profit with comma separators (e.g., ₱1,234.56)
        const formattedProfit = profit.toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        return {
          ...stat,
          value: `₱${formattedProfit}`,
        }
      }
      return stat
    })
  }, [currentPassengerCount, dailyPassengers, dailyRevenue, dailyExpenses])

  const terminalOptions = [1, 2, 3, 4]
  const toTerminalOptions = terminalOptions.filter((term) => term !== selectedFromTerminal)

  const handleCurrentTerminalChange = async (e) => {
    const value = e.target.value
    const terminal = value === 'unknown' ? 'unknown' : parseInt(value, 10)
    setIsUpdatingTerminal(true)
    try {
      await updateCurrentTerminal(terminal)
    } catch (err) {
      console.error('Failed to update current terminal:', err)
      alert('Failed to update current terminal. Please try again.')
    } finally {
      setIsUpdatingTerminal(false)
    }
  }

  const handleTerminalSourceChange = async (e) => {
    const value = e.target.value === 'gps' ? 'gps' : 'manual'
    setTerminalSourcePreference(value)
    try {
      await updateTerminalSourcePreference(value)
    } catch (err) {
      console.error('Failed to update terminal source preference:', err)
      alert('Failed to update terminal source. Please try again.')
    }
  }

  const handleRouteUpdate = async () => {
    if (selectedFromTerminal === selectedToTerminal) {
      alert('Origin and destination terminals must be different')
      return
    }

    setIsUpdatingRoute(true)
    try {
      await updateJeepneyRoute('jeep1', selectedFromTerminal, selectedToTerminal)
    } catch (error) {
      console.error('Error updating jeepney route:', error.message)
      alert('Failed to update route. Please try again.')
    } finally {
      setIsUpdatingRoute(false)
    }
  }

  return (
    <div className="dashboard-page">
      {/* Main Content */}
      <div className={`dashboard-main-content ${sidebarOpen ? 'with-sidebar' : ''}`}>
        <div className="dashboard-content-wrapper">
          <DashboardHeader onMenuClick={toggleSidebar} />

          <div className="dashboard-grid-layout">
            {/* Left Column - Active Passenger Status */}
            <div>
              <Card className="dashboard-section terminals-section animation-delay-200">
                <div className="dashboard-section-header">
                  <div className="dashboard-section-icon">
                    <UserOnline />
                  </div>
                  <h3 className="dashboard-section-title">Users Waiting to Onboard</h3>
                </div>
                <div className="terminals-list">
                  {terminalCounts.map((terminal, index) => (
                    <div
                      key={terminal.id}
                      className={`terminal-card ${terminal.active ? 'active' : 'inactive'}`}
                      style={{ animationDelay: `${(index + 1) * 100}ms` }}
                    >
                      <div className={`status-indicator ${terminal.active ? 'active' : 'inactive'}`} />
                      <div className="terminal-card-content">
                        <div className="terminal-left-section">
                          <div className="terminal-icon-container">
                            <Terminal />
                          </div>
                          <span className="terminal-name">{terminal.name}</span>
                        </div>
                        <div className="terminal-passenger-info">
                          <div className={`passenger-icon-container ${terminal.active ? 'active' : 'inactive'}`}>
                            {terminal.active ? <UserActive /> : <UserInactive />}
                          </div>
                          <span className={`passenger-count ${terminal.active ? 'active' : 'inactive'}`}>
                            {terminal.passengers}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column - Main Dashboard Content */}
            <div className="dashboard-right-column">
              {/* Your Current Passenger */}
              <Card className="dashboard-section large animation-delay-400">
                <div className="current-passengers-header">
                  <h3 className="passenger-count-title">Your Current Passenger</h3>
                </div>
                <div className="current-passengers-content">
                  {/* Left Section: Passenger Count */}
                  <div className="passenger-count-section">
                    <div className="passenger-count-display">
                      <Seat />
                      <span className="passenger-count-text">{jeepneySeatCount}/{jeepneyMaxSeats}</span>
                    </div>
                  </div>
                  
                  {/* Vertical Divider */}
                  <div className="current-passengers-divider"></div>
                  
                  {/* Right Section: Passenger List */}
                  <div className="passengers-list">
                    {onboardedDisplay.map((passenger, index) => {
                      const isOnboarded = !!passenger
                      const fromTerminalValue = passenger?.currentRoute?.from ?? passenger?.currentTerminal
                      const toTerminalValue = passenger?.currentRoute?.to ?? passenger?.currentTerminal
                      const hasExtended = passenger?.id && passengerExtensions.has(passenger.id)

                      const fromTerminal = isOnboarded ? `Terminal ${fromTerminalValue}` : '—'
                      const toTerminal = isOnboarded ? `Terminal ${toTerminalValue}` : '—'

                      return (
                        <div key={passenger?.id || `placeholder-${index}`} className="passenger-card">
                          {/* Left Section: User Icon + Number */}
                          <div className="passenger-card-left">
                            <div className="passenger-icon-wrapper">
                              <UserOnline />
                            </div>
                            <span className="passenger-number">{index + 1}</span>
                          </div>
                          
                          {/* Right Section: Route Information */}
                          <div className="passenger-card-right">
                            <div className="route-segment">
                              <div className="route-main-content">
                                {/* From Terminal */}
                                <div className="route-stop">
                                  <span className="route-label">From</span>
                                  <span className="route-terminal">{fromTerminal}</span>
                                </div>

                                <ArrowRight className="route-arrow route-arrow-main" />

                                {/* To Terminal */}
                                <div className="route-stop">
                                  <span className="route-label">To</span>
                                  <span className="route-terminal">{toTerminal}</span>
                                </div>
                              </div>

                              <div className="route-badge-wrap">
                                {hasExtended && (
                                  <span className="extended-badge">Extended</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Card>

              {/* Shift Status */}
              <Card className="dashboard-section large animation-delay-600">
                <div className="shift-status-card">
                  <div className="shift-status-text">
                    <h3 className="shift-status-title">Shift Status</h3>
                    <p className="shift-status-subtitle">
                      Shift started at <span className="shift-time-highlight">{shiftStartText}</span>
                    </p>
                  </div>
                  <Button
                    variant={shiftId ? 'danger' : 'primary'}
                    onClick={handleShiftToggle}
                    className="shift-status-button"
                  >
                    <span className="shift-status-button-icon" />
                    {shiftId ? 'End Shift' : 'Start Shift'}
                  </Button>
                </div>
              </Card>

              {/* Statistics */}
              <div className="stats-grid">
                {statsDisplay.map((stat, index) => {
                  const IconComponent = iconMap[stat.icon]
                  const colorClass = stat.color || 'gray'
                  const isExpenses = stat.label === 'Expenses'
                  return (
                    <div
                      key={stat.id || index}
                      className={`stat-card ${isExpenses ? 'stat-card-clickable' : ''}`}
                      style={{ animationDelay: `${(index + 1) * 100}ms` }}
                      onClick={isExpenses ? handleExpensesClick : undefined}
                      role={isExpenses ? 'button' : undefined}
                      tabIndex={isExpenses ? 0 : undefined}
                      onKeyDown={isExpenses ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleExpensesClick()
                        }
                      } : undefined}
                    >
                      <div className={`stat-value ${colorClass}`}>
                        {stat.value}
                      </div>
                      <div className="stat-label">
                        <IconComponent className={`stat-icon ${colorClass}`} />
                        <span className="stat-label-text">{stat.label}</span>
                        {isExpenses && <span className="stat-edit-hint">Click to add</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Route Selection - compact inline layout */}
              <Card className="dashboard-section route-selection-section animation-delay-600">
                <div className="route-selection-inline">
                  <div className="route-selection-header-compact">
                    <Compass size={18} className="route-selection-icon-inline" />
                    <span className="route-selection-title-compact">Route</span>
                  </div>
                  <div className="route-selection-controls">
                    <div className="route-control-group">
                      <span className="route-control-label">Current</span>
                      <select
                        className="route-control-select"
                        value={currentTerminal !== null && currentTerminal !== undefined
                          ? (currentTerminal === 'unknown' ? 'unknown' : String(currentTerminal))
                          : 'unknown'}
                        onChange={handleCurrentTerminalChange}
                        disabled={isUpdatingTerminal}
                        title="Manual terminal to use when source is set to Manual"
                      >
                        <option value="unknown">—</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>
                    </div>
                    <div className="route-control-group">
                      <span className="route-control-label">Source</span>
                      <select
                        className="route-control-select"
                        value={terminalSourcePreference}
                        onChange={handleTerminalSourceChange}
                        title="Choose whether to use GPS or your manual selection"
                      >
                        <option value="manual">Manual</option>
                        <option value="gps">GPS</option>
                      </select>
                    </div>
                    <div className="route-control-divider" aria-hidden="true" />
                    <div className="route-control-group">
                      <span className="route-control-label">From</span>
                      <select
                        className="route-control-select"
                        value={selectedFromTerminal}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10)
                          setSelectedFromTerminal(value)
                          if (value === selectedToTerminal) {
                            const fallback = terminalOptions.find((term) => term !== value) || 1
                            setSelectedToTerminal(fallback)
                          }
                        }}
                      >
                        {terminalOptions.map((term) => (
                          <option key={term} value={term}>{term}</option>
                        ))}
                      </select>
                    </div>
                    <ArrowRight size={18} className="route-control-arrow" aria-hidden="true" />
                    <div className="route-control-group">
                      <span className="route-control-label">To</span>
                      <select
                        className="route-control-select"
                        value={selectedToTerminal}
                        onChange={(e) => setSelectedToTerminal(parseInt(e.target.value, 10))}
                      >
                        {toTerminalOptions.map((term) => (
                          <option key={term} value={term}>{term}</option>
                        ))}
                      </select>
                    </div>
                    <div className="route-control-divider" aria-hidden="true" />
                    <Button
                      variant="primary"
                      onClick={handleRouteUpdate}
                      className="route-selection-button-compact"
                      disabled={isUpdatingRoute}
                    >
                      {isUpdatingRoute ? '…' : 'Update'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} onLogout={handleLogout} />

      {/* Expenses Modal */}
      {showExpensesModal && (
        <div className="expenses-modal-overlay" onClick={handleCloseExpensesModal}>
          <div className="expenses-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="expenses-modal-header">
              <h3 className="expenses-modal-title">Add Expense</h3>
              <button
                className="expenses-modal-close"
                onClick={handleCloseExpensesModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="expenses-modal-body">
              <div className="expenses-input-group">
                <label htmlFor="expense-amount" className="expenses-label">
                  Amount (₱)
                </label>
                <div className="expenses-input-wrapper">
                  <span className="expenses-currency-prefix">₱</span>
                  <input
                    id="expense-amount"
                    type="number"
                    className="expenses-input expenses-input-with-prefix"
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow only numbers and one decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setExpenseAmount(value)
                      }
                    }}
                    min="0"
                    step="0.01"
                    disabled={isSavingExpense}
                    autoFocus
                  />
                </div>
              </div>
              <div className="expenses-input-group">
                <label htmlFor="expense-description" className="expenses-label">
                  Description (Optional)
                </label>
                <input
                  id="expense-description"
                  type="text"
                  className="expenses-input"
                  placeholder="e.g., Fuel, Maintenance, etc."
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  disabled={isSavingExpense}
                />
              </div>
            </div>
            <div className="expenses-modal-footer">
              <Button
                variant="secondary"
                size="medium"
                onClick={handleCloseExpensesModal}
                disabled={isSavingExpense}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="medium"
                onClick={handleSaveExpense}
                disabled={isSavingExpense || !expenseAmount}
              >
                {isSavingExpense ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard