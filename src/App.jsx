import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import TwoStepVerificationPage from './pages/TwoStepVerificationPage'
import CommuterDashboard from './pages/CommuterDashboard'
import ChooseDestinationPage from './pages/ChooseDestinationPage'
import SelectOriginPage from './pages/SelectOriginPage'
import UserProfilePage from './pages/UserProfilePage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import DriverSimulationPage from './pages/DriverSimulationPage'
import { onAuthStateChange, logOut } from './firebase/auth'
import { getUserTransactions } from './firebase/firestore'
import { TranslationProvider } from './contexts/TranslationContext'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  
  // Get initial theme from localStorage or system preference
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) return savedTheme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  }
  
  const [userData, setUserData] = useState({ 
    currentTerminal: 1, 
    balance: 250.00, 
    currentRoute: null,
    transactions: [], // Array to store all transactions (top-ups, trips, etc.)
    language: 'English', // Default language
    theme: getInitialTheme(), // Theme preference
    firstName: '',
    lastName: '',
    email: '',
    cardNumber: '0000 0000 0000',
    status: null
  })
  
  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser) => {
      // Check if we're in the middle of a 2FA flow
      // If so, don't authenticate the user yet - they need to complete 2FA first
      const pendingVerification = sessionStorage.getItem('pendingVerificationEmail')
      
      if (pendingVerification) {
        // During 2FA flow, prevent authentication state changes
        // Keep user unauthenticated until 2FA is complete
        setCurrentUser(null)
        setIsAuthenticated(false)
        setLoading(false)
        return
      }
      
      setLoading(true)
      
      if (authUser && authUser.user) {
        // User is authenticated (and 2FA is complete)
        setCurrentUser(authUser.user)
        setIsAuthenticated(true)
        
        // If userData is available, use it; otherwise use defaults
        if (authUser.userData) {
          // Load transactions from Firestore asynchronously
          getUserTransactions(authUser.user.uid)
            .then((transactions) => {
              setUserData({
                ...authUser.userData,
                transactions: transactions || [],
                language: authUser.userData.language || 'English',
                theme: authUser.userData.theme || getInitialTheme(),
                firstName: authUser.userData.firstName || '',
                lastName: authUser.userData.lastName || '',
                email: authUser.userData.email || authUser.user.email || '',
                cardNumber: authUser.userData.cardNumber || '0000 0000 0000'
              })
              setLoading(false)
            })
            .catch((error) => {
              // Error is already handled in getUserTransactions, just set empty transactions
              setUserData({
                ...authUser.userData,
                transactions: [],
                language: authUser.userData.language || 'English',
                theme: authUser.userData.theme || getInitialTheme(),
                firstName: authUser.userData.firstName || '',
                lastName: authUser.userData.lastName || '',
                email: authUser.userData.email || authUser.user.email || '',
                cardNumber: authUser.userData.cardNumber || '0000 0000 0000',
                status: authUser.userData.status || null
              })
              setLoading(false)
            })
        } else {
          // No userData yet, use defaults
          setUserData({
            currentTerminal: 1,
            balance: 250.00,
            currentRoute: null,
            transactions: [],
            language: 'English',
            theme: getInitialTheme(),
            firstName: '',
            lastName: '',
            email: authUser.user.email || '',
            cardNumber: '0000 0000 0000',
            status: null
          })
          setLoading(false)
        }
      } else {
        // User is not authenticated
        setCurrentUser(null)
        setIsAuthenticated(false)
        const currentTheme = userData?.theme || getInitialTheme()
        setUserData({ 
          currentTerminal: 1, 
          balance: 250.00, 
          currentRoute: null, 
          transactions: [], 
          language: 'English', 
          theme: currentTheme,
          firstName: '',
          lastName: '',
          email: '',
          cardNumber: '0000 0000 0000',
          status: null
        })
        setLoading(false)
      }
    })

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])
  
  // Apply theme to document root when theme changes
  useEffect(() => {
    const theme = userData?.theme || 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [userData?.theme])

  // Disable automatic scroll restoration to handle it manually
  // Must be called before any conditional returns
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  const handleLogout = async () => {
    try {
      await logOut()
      setIsAuthenticated(false)
      setCurrentUser(null)
      const currentTheme = userData?.theme || getInitialTheme()
      setUserData({ 
        currentTerminal: 1, 
        balance: 250.00, 
        currentRoute: null, 
        transactions: [], 
        language: 'English', 
        theme: currentTheme,
        firstName: '',
        lastName: '',
        email: '',
        cardNumber: '0000 0000 0000'
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <div className="app" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--border-color)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <TranslationProvider language={userData?.language || 'English'}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="app">
          <Routes>
            <Route 
              path="/login" 
              element={
                !isAuthenticated ? (
                  <LoginPage currentUser={currentUser} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />
            <Route 
              path="/verify" 
              element={
                // Allow access if there's a pending verification in sessionStorage
                // This ensures we can access the verify page during 2FA flow
                sessionStorage.getItem('pendingVerificationEmail') ? (
                  <TwoStepVerificationPage />
                ) : (
                  // If authenticated and no pending verification, go to dashboard
                  // Otherwise, go back to login
                  isAuthenticated && currentUser ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                )
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                // Only allow access if authenticated AND there's no pending verification
                // This prevents access during the 2FA flow
                isAuthenticated && currentUser && !sessionStorage.getItem('pendingVerificationEmail') ? (
                  <CommuterDashboard 
                    currentUser={currentUser}
                    userData={userData}
                    setUserData={setUserData}
                    onLogout={handleLogout}
                  />
                ) : (
                  sessionStorage.getItem('pendingVerificationEmail') ? (
                    <Navigate to="/verify" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                )
              } 
            />
            <Route 
              path="/profile" 
              element={
                isAuthenticated && currentUser ? (
                  <UserProfilePage 
                    currentUser={currentUser}
                    userData={userData}
                    setUserData={setUserData}
                    onLogout={handleLogout}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/choose-destination" 
              element={
                isAuthenticated && currentUser ? (
                  <ChooseDestinationPage 
                    currentUser={currentUser}
                    userData={userData}
                    setUserData={setUserData}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/select-origin" 
              element={
                isAuthenticated && currentUser ? (
                  <SelectOriginPage 
                    currentUser={currentUser}
                    userData={userData}
                    setUserData={setUserData}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/history" 
              element={
                isAuthenticated && currentUser ? (
                  <HistoryPage 
                    currentUser={currentUser}
                    userData={userData}
                    setUserData={setUserData}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/settings" 
              element={
                isAuthenticated && currentUser ? (
                  <SettingsPage 
                    currentUser={currentUser}
                    userData={userData}
                    setUserData={setUserData}
                    onLogout={handleLogout}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/driver-simulation" 
              element={<DriverSimulationPage />} 
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </TranslationProvider>
  )
}

export default App
