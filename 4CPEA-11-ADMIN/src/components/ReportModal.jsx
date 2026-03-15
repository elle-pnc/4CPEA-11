import { useState } from 'react'
import toast from 'react-hot-toast'
import { X, Calendar, Download, FileText, Loader2 } from 'lucide-react'
import Button from './ui/Button'
import './ReportModal.css'

function ReportModal({ isOpen, onClose, onGenerate }) {
  const [reportType, setReportType] = useState('summary')
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
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

      switch (dateRange) {
        case 'today':
          startDate = todayStart
          endDate = todayEnd
          break
        case 'yesterday': {
          const y = new Date(now)
          y.setDate(y.getDate() - 1)
          startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0)
          endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999)
          break
        }
        case 'week': {
          const w = new Date(now)
          w.setDate(w.getDate() - 7)
          startDate = new Date(w.getFullYear(), w.getMonth(), w.getDate(), 0, 0, 0, 0)
          endDate = todayEnd
          break
        }
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
          endDate = todayEnd
          break
        case 'custom': {
          if (!customStartDate || !customEndDate) {
            toast.error('Please select both start and end dates')
            setIsGenerating(false)
            return
          }
          const parseStart = (d) => {
            if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
            const s = typeof d === 'string' ? d : String(d)
            return new Date(s.includes('T') ? s : s + 'T00:00:00')
          }
          const parseEnd = (d) => {
            if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
            const s = typeof d === 'string' ? d : String(d)
            return new Date(s.includes('T') ? s : s + 'T23:59:59.999')
          }
          startDate = parseStart(customStartDate)
          endDate = parseEnd(customEndDate)
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            toast.error('Please select valid dates')
            setIsGenerating(false)
            return
          }
          if (startDate > endDate) {
            toast.error('Start date must be before or equal to end date')
            setIsGenerating(false)
            return
          }
          break
        }
        default: {
          startDate = todayStart
          endDate = todayEnd
        }
      }

      await onGenerate({
        reportType,
        startDate,
        endDate,
        format,
      })

      toast.success(`Report generated successfully!`)
      onClose()
    } catch (error) {
      console.error('Error generating report:', error)
      const msg = error?.message || 'Failed to generate report. Please try again.'
      toast.error(msg)
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
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ReportModal
