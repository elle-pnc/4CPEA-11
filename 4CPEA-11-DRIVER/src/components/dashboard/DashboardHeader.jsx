import { useState, useEffect } from 'react'
import { Menu, Maximize2, Minimize2 } from 'lucide-react'
import { APP_NAME } from '../../constants'
import './DashboardHeader.css'

function DashboardHeader({ onMenuClick }) {
  const fullscreenEl = () => document.fullscreenElement ?? document.webkitFullscreenElement
  const [isFullscreen, setIsFullscreen] = useState(!!fullscreenEl())

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!fullscreenEl())
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (fullscreenEl()) {
        await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.())
      } else {
        const el = document.documentElement
        await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())
      }
    } catch (err) {
      console.warn('Fullscreen not supported:', err)
    }
  }

  return (
    <div className="dashboard-header">
      <div className="dashboard-header-left">
        <h2 className="dashboard-app-name">
          {APP_NAME}
        </h2>
        <h1 className="dashboard-title">
          Driver Dashboard
        </h1>
      </div>
      <div className="dashboard-header-actions">
        <button
          onClick={toggleFullscreen}
          className="dashboard-header-btn"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="dashboard-header-icon" />
          ) : (
            <Maximize2 className="dashboard-header-icon" />
          )}
        </button>
        <button
          onClick={onMenuClick}
          className="dashboard-header-btn"
          aria-label="Toggle menu"
        >
          <Menu className="dashboard-header-icon" />
        </button>
      </div>
    </div>
  )
}

export default DashboardHeader
