import { X, Home, LogOut } from 'lucide-react'
import Logo from '../Logo'
import './Sidebar.css'

function Sidebar({ isOpen, onClose, onLogout }) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <button
          onClick={onClose}
          className="sidebar-close-button"
          aria-label="Close sidebar"
        >
          <X className="sidebar-close-icon" />
        </button>

        <div className="sidebar-logo-container">
          <Logo />
        </div>

        <nav className="sidebar-nav">
          <button className="sidebar-nav-button">
            <Home className="sidebar-nav-icon" />
            Dashboard
          </button>

          <button
            onClick={onLogout}
            className="sidebar-nav-button logout"
          >
            <LogOut className="sidebar-nav-icon" />
            Logout
          </button>
        </nav>
      </div>
    </>
  )
}

export default Sidebar
