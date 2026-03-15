import { Menu } from 'lucide-react'
import { APP_NAME } from '../../constants'
import './DashboardHeader.css'

function DashboardHeader({ onMenuClick }) {
  return (
    <div className="dashboard-header">
      <div className="dashboard-header-left">
        <h2 className="dashboard-app-name">
          {APP_NAME}
        </h2>
        <h1 className="dashboard-title">
          Admin Dashboard
        </h1>
      </div>
      <button
        onClick={onMenuClick}
        className="dashboard-menu-button"
        aria-label="Toggle menu"
      >
        <Menu className="dashboard-menu-icon" />
      </button>
    </div>
  )
}

export default DashboardHeader
