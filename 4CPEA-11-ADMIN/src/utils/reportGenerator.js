/**
 * Report Generator Utilities
 * Handles generation of reports in various formats (PDF, CSV, Excel)
 */
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Format date to readable string
 */
export const formatDate = (date) => {
  if (!date) return 'N/A'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(d)
}

/**
 * Format date range string
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'N/A'
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (start === end) return start
  return `${start} - ${end}`
}

/**
 * Escape a CSV cell value to prevent formula injection and encoding issues.
 * Excel interprets =, +, -, @ at cell start as formulas. Prefix with tab to force text.
 */
const escapeCSVValue = (value) => {
  const str = value === null || value === undefined ? '' : String(value)
  const needsQuotes = str.includes(',') || str.includes('"') || str.includes('\n')
  const formulaChars = /^[=+\-@]/
  const escaped = formulaChars.test(str) ? '\t' + str : str
  if (needsQuotes) {
    return `"${escaped.replace(/"/g, '""')}"`
  }
  return escaped
}

/**
 * Generate CSV content from data
 */
export const generateCSV = (data, headers) => {
  const csvRows = []
  
  // Add headers
  csvRows.push(headers.map((h) => escapeCSVValue(h)).join(','))
  
  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header) => escapeCSVValue(row[header]))
    csvRows.push(values.join(','))
  })
  
  return csvRows.join('\n')
}

/** UTF-8 BOM so Excel displays special characters (e.g. ₱) correctly */
const UTF8_BOM = '\uFEFF'

/**
 * Download file
 */
export const downloadFile = (content, filename, mimeType, addBom = false) => {
  const finalContent = addBom ? UTF8_BOM + content : content
  const blob = new Blob([finalContent], { type: mimeType + ';charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Sanitize text for PDF output. jsPDF's default font lacks ₱ and other Unicode;
 * unsupported chars cause encoding issues (e.g. digits showing as 1&3&5) on some devices.
 * Use ASCII-safe alternatives for reliable cross-device display.
 */
const sanitizeForPDF = (value) => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  return str.replace(/\u20B1/g, 'Php ') // ₱ → Php (Peso)
}

/**
 * Generate PDF report and trigger download
 */
export const generatePDF = (reportData, filename = 'report') => {
  if (!reportData || !reportData.sections || !Array.isArray(reportData.sections)) {
    console.error('Invalid report data for PDF')
    return
  }

  const sections = reportData.sections.filter((s) => s && (s.type === 'stats' || s.type === 'table'))
  if (sections.length === 0) {
    toast.error('No report content to display.')
    throw new Error('No report content')
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  // Header
  doc.setFontSize(18)
  doc.setTextColor(37, 99, 235)
  doc.text(reportData.title || 'Report', pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  doc.text(`Generated on: ${formatDate(new Date())}`, pageWidth / 2, y, { align: 'center' })
  y += 6
  doc.text(`Period: ${formatDateRange(reportData.startDate, reportData.endDate)}`, pageWidth / 2, y, { align: 'center' })
  y += 15

  doc.setDrawColor(37, 99, 235)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 15

  // Sections
  doc.setTextColor(17, 24, 39)
  for (const section of sections) {
    const data = section.data || []
    const headers = section.headers || []

    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(section.title || 'Section', margin, y)
    y += 8

    if (section.type === 'stats') {
      const statsData = data.map((s) => [sanitizeForPDF(s?.label ?? ''), sanitizeForPDF(s?.value ?? '0')])
      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'grid',
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81] },
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - 2 * margin,
      })
      y = doc.lastAutoTable.finalY + 12
    } else if (section.type === 'table') {
      const tableHeaders = headers.map((h) => sanitizeForPDF(h))
      const tableBody = data.length > 0
        ? data.map((row) => headers.map((h) => sanitizeForPDF(row?.[h] ?? '')))
        : [['No data for this period']]
      autoTable(doc, {
        startY: y,
        head: [tableHeaders],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81] },
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - 2 * margin,
      })
      y = doc.lastAutoTable.finalY + 12
    }

    if (y > 270) {
      doc.addPage()
      y = 20
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text(
      `CPE11-AFCS Admin Dashboard Report • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  doc.save(`${filename}.pdf`)
}

/**
 * Generate Excel file (CSV format with .xlsx extension)
 * For true Excel format, consider using a library like xlsx
 */
export const generateExcel = (data, headers, filename) => {
  const csv = generateCSV(data, headers)
  downloadFile(csv, `${filename}.csv`, 'text/csv', true)
}

/**
 * Generate report based on format
 */
export const generateReport = async (reportData, format) => {
  if (!reportData) {
    throw new Error('No report data provided')
  }

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `report_${timestamp}`

  const sections = reportData.sections || []
  const tableSection = sections.find((s) => s?.type === 'table' && s?.headers?.length > 0)
  const statsSection = sections.find((s) => s?.type === 'stats' && s?.data?.length > 0)

  switch (format) {
    case 'pdf':
      generatePDF(reportData, filename)
      break
    case 'csv': {
      if (tableSection && tableSection.data?.length > 0) {
        const csv = generateCSV(tableSection.data, tableSection.headers)
        downloadFile(csv, `${filename}.csv`, 'text/csv', true)
      } else if (statsSection) {
        const csv = generateCSV(statsSection.data, ['label', 'value'])
        downloadFile(csv, `${filename}.csv`, 'text/csv', true)
      } else {
        downloadFile('Period,No data for selected date range\n', `${filename}.csv`, 'text/csv', true)
      }
      break
    }
    case 'excel': {
      if (tableSection && tableSection.data?.length > 0) {
        generateExcel(tableSection.data, tableSection.headers, filename)
      } else if (statsSection) {
        generateExcel(statsSection.data, ['label', 'value'], filename)
      } else {
        downloadFile('Period,No data for selected date range\n', `${filename}.csv`, 'text/csv', true)
      }
      break
    }
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}
