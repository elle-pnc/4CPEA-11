import { Car, Menu } from 'lucide-react'
import { APP_NAME, ASSIGNED_VEHICLE } from '../../constants'
import './DashboardHeader.css'

function DashboardHeader({ onMenuClick }) {
  return (
    <div className="dashboard-header">
      <div className="dashboard-header-left">
        <div className="dashboard-header-badge">
          <div className="dashboard-status-dot" />
          <h2 className="dashboard-app-name">
            {APP_NAME}
          </h2>
        </div>
        <h1 className="dashboard-title">
          Dashboard
        </h1>
      </div>
      <div className="dashboard-header-right">
        <div className="dashboard-vehicle-info">
          <Car className="dashboard-vehicle-icon" />
          <span className="dashboard-vehicle-text">
            Assigned E-Jeep: <span className="dashboard-vehicle-number">{ASSIGNED_VEHICLE}</span>
          </span>
        </div>
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