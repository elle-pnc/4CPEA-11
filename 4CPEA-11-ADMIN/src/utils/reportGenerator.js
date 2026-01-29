/**
 * Report Generator Utilities
 * Handles generation of reports in various formats (PDF, CSV, Excel)
 */

/**
 * Format date to readable string
 */
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(date)
}

/**
 * Format date range string
 */
export const formatDateRange = (startDate, endDate) => {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (start === end) {
    return start
  }
  return `${start} - ${end}`
}

/**
 * Generate CSV content from data
 */
export const generateCSV = (data, headers) => {
  const csvRows = []
  
  // Add headers
  csvRows.push(headers.join(','))
  
  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] || ''
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csvRows.push(values.join(','))
  })
  
  return csvRows.join('\n')
}

/**
 * Download file
 */
export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType })
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
 * Generate PDF report (using browser print functionality)
 * For a more advanced PDF, consider using jsPDF or pdfmake
 */
export const generatePDF = (reportData) => {
  const printWindow = window.open('', '_blank')
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportData.title}</title>
        <style>
          @media print {
            @page {
              margin: 1cm;
            }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563EB;
            padding-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            color: #2563EB;
          }
          .header p {
            margin: 5px 0;
            color: #6B7280;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 15px;
            color: #111827;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 5px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          .stat-card {
            background: #F9FAFB;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #2563EB;
          }
          .stat-label {
            font-size: 0.9em;
            color: #6B7280;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #111827;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #E5E7EB;
          }
          th {
            background-color: #F3F4F6;
            font-weight: 600;
            color: #374151;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            color: #6B7280;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportData.title}</h1>
          <p>Generated on: ${formatDate(new Date())}</p>
          <p>Period: ${formatDateRange(reportData.startDate, reportData.endDate)}</p>
        </div>
        
        ${reportData.sections.map(section => `
          <div class="section">
            <div class="section-title">${section.title}</div>
            ${section.type === 'stats' ? `
              <div class="stats-grid">
                ${section.data.map(stat => `
                  <div class="stat-card">
                    <div class="stat-label">${stat.label}</div>
                    <div class="stat-value">${stat.value}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            ${section.type === 'table' ? `
              <table>
                <thead>
                  <tr>
                    ${section.headers.map(h => `<th>${h}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${section.data.map(row => `
                    <tr>
                      ${section.headers.map(header => `<td>${row[header] || ''}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
        `).join('')}
        
        <div class="footer">
          <p>CPE11-AFCS Admin Dashboard Report</p>
          <p>This is an automated report generated by the system.</p>
        </div>
      </body>
    </html>
  `
  
  printWindow.document.write(htmlContent)
  printWindow.document.close()
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

/**
 * Generate Excel file (CSV format with .xlsx extension)
 * For true Excel format, consider using a library like xlsx
 */
export const generateExcel = (data, headers, filename) => {
  const csv = generateCSV(data, headers)
  downloadFile(csv, `${filename}.csv`, 'text/csv')
}

/**
 * Generate report based on format
 */
export const generateReport = async (reportData, format) => {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `report_${timestamp}`
  
  switch (format) {
    case 'pdf':
      generatePDF(reportData)
      break
    case 'csv':
      if (reportData.sections && reportData.sections.length > 0) {
        const section = reportData.sections.find(s => s.type === 'table')
        if (section) {
          const csv = generateCSV(section.data, section.headers)
          downloadFile(csv, `${filename}.csv`, 'text/csv')
        }
      }
      break
    case 'excel':
      if (reportData.sections && reportData.sections.length > 0) {
        const section = reportData.sections.find(s => s.type === 'table')
        if (section) {
          generateExcel(section.data, section.headers, filename)
        }
      }
      break
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}
