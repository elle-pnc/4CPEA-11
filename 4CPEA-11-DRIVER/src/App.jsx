import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import TwoStepVerification from './pages/TwoStepVerification'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { onAuthStateChange, logOut } from './firebase/auth'
import { getUserRole } from './firebase/firestore'
import { ROUTES } from './constants'

const ACCESS_DENIED_MSG = 'Your account does not have access to the Driver app.'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      const pendingVerification = sessionStorage.getItem('pendingVerificationEmail')
      if (pendingVerification) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }
      if (!user) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }
      const role = await getUserRole(user.uid)
      if (role === 'commuter') {
        sessionStorage.removeItem('pendingVerificationEmail')
        sessionStorage.removeItem('pendingVerificationPassword')
        setAccessDeniedMessage(ACCESS_DENIED_MSG)
        await logOut()
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }
      setAccessDeniedMessage(null)
      setIsAuthenticated(true)
      setIsLoading(false)
    })
    return () => unsubscribe?.()
  }, [])

  const clearAccessDenied = () => setAccessDeniedMessage(null)

  return (
    <Router basename="/Driver">
      <Routes>
        <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
        <Route
          path="/login"
          element={
            !isLoading && isAuthenticated ? (
              <Navigate to={ROUTES.DASHBOARD} replace />
            ) : (
              <Login
                accessDeniedMessage={accessDeniedMessage}
                onClearAccessDenied={clearAccessDenied}
              />
            )
          }
        />
        <Route
          path="/verify"
          element={
            sessionStorage.getItem('pendingVerificationEmail') ? (
              <TwoStepVerification />
            ) : isAuthenticated ? (
              <Navigate to={ROUTES.DASHBOARD} replace />
            ) : (
              <Navigate to={ROUTES.LOGIN} replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
