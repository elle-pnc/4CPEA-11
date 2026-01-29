import { useState } from 'react'
import { X, Calendar, Download, FileText } from 'lucide-react'
import Button from './ui/Button'
import './ReportModal.css'

function ReportModal({ isOpen, onClose, onGenerate }) {
  const [reportType, setReportType] = useState('daily')
  const [dateRange, setDateRange] = useState('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [format, setFormat] = useState('pdf')
  const [isGenerating, setIsGenerating] = useState(false)

  if (!isOpen) return null

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      let startDate, endDate
      const today = new Date()
      
      // Calculate date range based on selection
      switch (dateRange) {
        case 'today':
          startDate = new Date(today.setHours(0, 0, 0, 0))
          endDate = new Date(today.setHours(23, 59, 59, 999))
          break
        case 'yesterday':
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          startDate = new Date(yesterday.setHours(0, 0, 0, 0))
          endDate = new Date(yesterday.setHours(23, 59, 59, 999))
          break
        case 'week':
          const weekStart = new Date(today)
          weekStart.setDate(weekStart.getDate() - 7)
          startDate = new Date(weekStart.setHours(0, 0, 0, 0))
          endDate = new Date(today.setHours(23, 59, 59, 999))
          break
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          startDate = new Date(monthStart.setHours(0, 0, 0, 0))
          endDate = new Date(today.setHours(23, 59, 59, 999))
          break
        case 'custom':
          if (!customStartDate || !customEndDate) {
            alert('Please select both start and end dates')
            setIsGenerating(false)
            return
          }
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
          break
        default:
          startDate = new Date(today.setHours(0, 0, 0, 0))
          endDate = new Date(today.setHours(23, 59, 59, 999))
      }

      await onGenerate({
        reportType,
        startDate,
        endDate,
        format,
      })
      
      onClose()
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-modal-title-section">
            <FileText className="report-modal-icon" />
            <h2 className="report-modal-title">Generate Report</h2>
          </div>
          <button
            onClick={onClose}
            className="report-modal-close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="report-modal-body">
          {/* Report Type */}
          <div className="report-field-group">
            <label className="report-label">Report Type</label>
            <div className="report-radio-group">
              <label className="report-radio-option">
                <input
                  type="radio"
                  name="reportType"
                  value="summary"
                  checked={reportType === 'summary'}
                  onChange={(e) => setReportType(e.target.value)}
                />
                <span>Summary Report</span>
              </label>
              <label className="report-radio-option">
                <input
                  type="radio"
                  name="reportType"
                  value="detailed"
                  checked={reportType === 'detailed'}
                  onChange={(e) => setReportType(e.target.value)}
                />
                <span>Detailed Report</span>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className="report-field-group">
            <label className="report-label">
              <Calendar className="report-label-icon" />
              Date Range
            </label>
            <select
              className="report-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <div className="report-field-group">
              <div className="report-date-inputs">
                <div className="report-date-input-group">
                  <label className="report-date-label">Start Date</label>
                  <input
                    type="date"
                    className="report-date-input"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="report-date-input-group">
                  <label className="report-date-label">End Date</label>
                  <input
                    type="date"
                    className="report-date-input"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Export Format */}
          <div className="report-field-group">
            <label className="report-label">
              <Download className="report-label-icon" />
              Export Format
            </label>
            <div className="report-radio-group">
              <label className="report-radio-option">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={(e) => setFormat(e.target.value)}
                />
                <span>PDF</span>
              </label>
              <label className="report-radio-option">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value)}
                />
                <span>CSV</span>
              </label>
              <label className="report-radio-option">
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={format === 'excel'}
                  onChange={(e) => setFormat(e.target.value)}
                />
                <span>Excel</span>
              </label>
            </div>
          </div>
        </div>

        <div className="report-modal-footer">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ReportModal
