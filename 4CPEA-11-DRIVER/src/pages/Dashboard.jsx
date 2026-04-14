import { useEffect, useMemo, useRef, useState } from 'react'
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
import { subscribeUsersByStatus, subscribeUsersByStatuses, subscribeActiveShift, startShift, endShift, subscribeDailyPassengerCount, subscribeDailyRevenue, subscribeDailyExpenses, saveDailyExpenses, subscribeJeepney, updateJeepneyRoute, subscribeCurrentTerminal, updateCurrentTerminal, subscribeTerminalSourcePreference, updateTerminalSourcePreference } from '../firebase/firestore'
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

/**
 * True when the vehicle is strictly past the passenger's booked drop-off on terminals 1–4,
 * using the jeep's service direction (from < to → increasing = 'right', else 'left').
 */
function isVehiclePastPassengerDropOff(vehicleTerminal, dropOff, direction) {
  const v = Number(vehicleTerminal)
  const d = Number(dropOff)
  if (!Number.isFinite(v) || !Number.isFinite(d) || v < 1 || v > 4 || d < 1 || d > 4) return false
  if (v === d) return false
  if (direction === 'left') return v < d
  return v > d
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
  const [passengerArrivalModal, setPassengerArrivalModal] = useState(null) // { items: Array } | null
  const [passengerArrivalCountdown, setPassengerArrivalCountdown] = useState(0)

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
    const unsubscribe = subscribeUsersByStatuses(['waiting', 'boarding'], (users) => {
      setWaitingUsers(users || [])
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeUsersByStatus('onboarded', (users) => {
      setOnboardedUsers(users || [])
    })
    return () => unsubscribe()
  }, [])

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

  /** While GPS/manual flickers to unknown, keep "at destination" so Extended green does not return */
  const atDestLatchRef = useRef(new Map())
  /** Once true: jeep reached this passenger's booked To; used to detect leaving without alighting */
  const visitedBookedStopRef = useRef(new Map())
  /** Last seen booked `to` per user — reset visit tracking when their destination changes (e.g. extend) */
  const lastBookedToRef = useRef(new Map())
  /** Sticky until passenger leaves the vehicle (removed from onboarded) */
  const violatorPassengerIdsRef = useRef(new Set())
  const [violatorRenderKey, setViolatorRenderKey] = useState(0)

  const onboardedDisplay = useMemo(() => {
    const slots = 2
    const filled = onboardedUsers.slice(0, slots)
    const placeholders = Array.from({ length: slots - filled.length }, () => null)
    return [...filled, ...placeholders]
  }, [onboardedUsers])

  /** Vehicle live terminal matches booked destination; latched through brief invalid terminal reads */
  const { atDestinationPassengerIds, atDestinationPassengerKey } = useMemo(() => {
    const latch = atDestLatchRef.current
    const valid =
      typeof currentTerminal === 'number' && currentTerminal >= 1 && currentTerminal <= 4
    const onboardedIds = new Set(onboardedUsers.map((u) => u.id).filter(Boolean))
    for (const uid of [...latch.keys()]) {
      if (!onboardedIds.has(uid)) latch.delete(uid)
    }

    const ids = new Set()
    for (const u of onboardedUsers) {
      if (!u?.id) continue
      const dest = Number(u.currentRoute?.to ?? u.currentTerminal)
      if (!Number.isFinite(dest) || dest < 1 || dest > 4) {
        latch.delete(u.id)
        continue
      }
      if (valid) {
        if (currentTerminal === dest) {
          latch.set(u.id, true)
          ids.add(u.id)
        } else {
          latch.set(u.id, false)
        }
      } else if (latch.get(u.id) === true) {
        ids.add(u.id)
      }
    }
    const idKey = [...ids].sort().join('|')
    return { atDestinationPassengerIds: ids, atDestinationPassengerKey: idKey }
  }, [onboardedUsers, currentTerminal])

  const serviceDirection = jeepneyRoute.direction === 'left' ? 'left' : 'right'

  useEffect(() => {
    const violators = violatorPassengerIdsRef.current
    const visited = visitedBookedStopRef.current
    const lastTo = lastBookedToRef.current
    const onboardedIds = new Set(onboardedUsers.map((u) => u.id).filter(Boolean))
    const valid =
      typeof currentTerminal === 'number' && currentTerminal >= 1 && currentTerminal <= 4

    const beforeViolators = new Set(violators)

    for (const uid of [...violators]) {
      if (!onboardedIds.has(uid)) violators.delete(uid)
    }
    for (const uid of [...visited.keys()]) {
      if (!onboardedIds.has(uid)) {
        visited.delete(uid)
        lastTo.delete(uid)
      }
    }

    for (const u of onboardedUsers) {
      if (!u?.id) continue
      if (violators.has(u.id)) continue

      const dest = Number(u.currentRoute?.to ?? u.currentTerminal)
      if (!Number.isFinite(dest) || dest < 1 || dest > 4) continue

      const prevTo = lastTo.get(u.id)
      if (prevTo !== dest) {
        lastTo.set(u.id, dest)
        visited.delete(u.id)
      }

      if (!valid) continue

      if (currentTerminal === dest) {
        visited.set(u.id, true)
        continue
      }

      const past = isVehiclePastPassengerDropOff(currentTerminal, dest, serviceDirection)
      const leftAfterReachingBookedStop = visited.get(u.id) === true
      if (past || leftAfterReachingBookedStop) {
        violators.add(u.id)
      }
    }

    const changed =
      beforeViolators.size !== violators.size ||
      [...beforeViolators].some((id) => !violators.has(id)) ||
      [...violators].some((id) => !beforeViolators.has(id))
    if (changed) setViolatorRenderKey((k) => k + 1)
  }, [onboardedUsers, currentTerminal, serviceDirection])

  const PASSENGER_ARRIVAL_AUTO_DISMISS_MS = 5000
  const arrivalNotifiedRef = useRef(new Set())

  useEffect(() => {
    const atIds = atDestinationPassengerIds
    for (const uid of [...arrivalNotifiedRef.current]) {
      if (!atIds.has(uid)) arrivalNotifiedRef.current.delete(uid)
    }
    if (passengerArrivalModal != null) return

    const seated = onboardedUsers.slice(0, 2)
    const newcomers = []
    for (let i = 0; i < seated.length; i++) {
      const u = seated[i]
      if (!u?.id || !atIds.has(u.id)) continue
      if (arrivalNotifiedRef.current.has(u.id)) continue
      const dest = Number(u.currentRoute?.to ?? u.currentTerminal)
      newcomers.push({
        userId: u.id,
        slotNumber: i + 1,
        destination: Number.isFinite(dest) ? dest : '—',
      })
    }
    if (newcomers.length === 0) return
    newcomers.forEach((n) => arrivalNotifiedRef.current.add(n.userId))
    setPassengerArrivalModal({ items: newcomers })
  }, [atDestinationPassengerKey, onboardedUsers, passengerArrivalModal])

  useEffect(() => {
    if (!passengerArrivalModal) {
      setPassengerArrivalCountdown(0)
      return
    }
    const seconds = Math.max(1, Math.ceil(PASSENGER_ARRIVAL_AUTO_DISMISS_MS / 1000))
    setPassengerArrivalCountdown(seconds)
    const intervalId = window.setInterval(() => {
      setPassengerArrivalCountdown((s) => {
        if (s <= 1) {
          window.clearInterval(intervalId)
          setPassengerArrivalModal(null)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [passengerArrivalModal])

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
                      void violatorRenderKey
                      const isOnboarded = !!passenger
                      const fromTerminalValue = passenger?.currentRoute?.from ?? passenger?.currentTerminal
                      const toTerminalValue = passenger?.currentRoute?.to ?? passenger?.currentTerminal
                      const hasExtended = passenger?.currentRideExtended === true
                      const atDestination =
                        isOnboarded && passenger?.id && atDestinationPassengerIds.has(passenger.id)
                      const isViolator =
                        isOnboarded &&
                        passenger?.id &&
                        violatorPassengerIdsRef.current.has(passenger.id)
                      // Violator is sticky and overrides in destination / extended
                      const showViolator = isViolator
                      const showInDestination = atDestination && !isViolator
                      const showExtendedTrip =
                        !!hasExtended && !showInDestination && !showViolator
                      const passengerCardModifier = showViolator
                        ? ' passenger-card--violator'
                        : showInDestination
                          ? ' passenger-card--in-destination'
                          : showExtendedTrip
                            ? ' passenger-card--extended-trip'
                            : ''

                      const fromTerminal = isOnboarded ? `Terminal ${fromTerminalValue}` : '—'
                      const toTerminal = isOnboarded ? `Terminal ${toTerminalValue}` : '—'

                      return (
                        <div
                          key={passenger?.id || `placeholder-${index}`}
                          className={`passenger-card${passengerCardModifier}`}
                        >
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
                                {showViolator && <span className="violator-badge">Violator</span>}
                                {showInDestination && (
                                  <span className="in-destination-badge">In destination</span>
                                )}
                                {showExtendedTrip && (
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

      {/* Passenger reached booked stop — auto-dismiss after a few seconds */}
      {passengerArrivalModal?.items?.length > 0 && (
        <div className="passenger-arrival-modal-overlay" role="presentation">
          <div
            className="passenger-arrival-modal"
            role="dialog"
            aria-labelledby="passenger-arrival-title"
            aria-modal="true"
          >
            <div className="passenger-arrival-modal-icon-wrap" aria-hidden>
              <MapPin size={34} strokeWidth={2.2} />
            </div>
            <h3 id="passenger-arrival-title" className="passenger-arrival-modal-title">
              Passenger at their booked stop
            </h3>
            <div className="passenger-arrival-modal-body">
              {passengerArrivalModal.items.map((p) => (
                <p key={p.userId} className="passenger-arrival-line">
                  The passenger in <strong>seat {p.slotNumber}</strong> has reached <strong>Terminal {p.destination}</strong>,
                  which is where they booked to get off.
                </p>
              ))}
              <p className="passenger-arrival-hint">
                Please <strong>wait until they have left the vehicle safely</strong> before you drive away.
              </p>
              <p className="passenger-arrival-hint">
                If they <strong>want to extend the trip</strong> in the commuter app, they do that <strong>while still sitting down</strong>.
                Wait until they are <strong>finished in the app</strong> and it is <strong>okay for you to move</strong>.
              </p>
            </div>
            <p
              className="passenger-arrival-countdown"
              aria-live="polite"
              aria-atomic="true"
            >
              Closes in <span className="passenger-arrival-countdown-value">{passengerArrivalCountdown}</span>s
            </p>
          </div>
        </div>
      )}

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