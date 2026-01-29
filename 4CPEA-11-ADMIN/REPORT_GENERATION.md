# Report Generation Feature

## Overview

The admin dashboard includes a comprehensive report generation feature that allows administrators to export operational data in various formats.

## Features

### Report Types

1. **Summary Report**
   - Overview statistics (passengers, revenue, expenses, profit)
   - Terminal activity summary
   - Quick insights for management

2. **Detailed Report**
   - All summary data
   - Individual transaction details
   - Expense breakdown
   - Complete operational data

### Date Range Options

- **Today**: Current day's data
- **Yesterday**: Previous day's data
- **Last 7 Days**: Week-to-date data
- **This Month**: Month-to-date data
- **Custom Range**: Select any date range

### Export Formats

1. **PDF**
   - Professional formatted document
   - Print-ready layout
   - Includes charts and tables
   - Uses browser print functionality

2. **CSV**
   - Comma-separated values
   - Easy to import into Excel/Google Sheets
   - Lightweight format
   - Suitable for data analysis

3. **Excel**
   - CSV format with .csv extension
   - Compatible with Excel
   - Can be opened in spreadsheet applications

## Usage

### Generating a Report

1. Click the **"Generate Report"** button at the bottom of the dashboard
2. Select report type (Summary or Detailed)
3. Choose date range (Today, Yesterday, Last 7 Days, This Month, or Custom)
4. If Custom, select start and end dates
5. Choose export format (PDF, CSV, or Excel)
6. Click **"Generate Report"**

### Report Contents

#### Summary Statistics
- Total Passengers
- Total Revenue
- Total Expenses
- Profit (Revenue - Expenses)

#### Terminal Activity
- Boarding count per terminal
- Alighting count per terminal
- Total activity per terminal

#### Transaction Details (Detailed Reports Only)
- Transaction date
- Origin terminal
- Destination terminal
- Amount
- Jeepney ID

#### Expense Details (Detailed Reports Only)
- Expense date
- Amount
- Note/Description

## Technical Implementation

### Components

- **ReportModal** (`src/components/ReportModal.jsx`)
  - Modal dialog for report options
  - Date range selection
  - Format selection
  - Report type selection

### Utilities

- **reportGenerator.js** (`src/utils/reportGenerator.js`)
  - `formatDate()` - Format dates for display
  - `formatDateRange()` - Format date ranges
  - `generateCSV()` - Generate CSV content
  - `generatePDF()` - Generate PDF via print
  - `generateExcel()` - Generate Excel-compatible CSV
  - `downloadFile()` - Download file helper
  - `generateReport()` - Main report generation function

### Firebase Functions

- **getHistoricalData()** (`src/firebase/firestore.js`)
  - Fetches transactions in date range
  - Fetches expenses in date range
  - Calculates summary statistics
  - Aggregates terminal activity
  - Returns structured report data

## Data Sources

Reports pull data from Firebase collections:

- **transactions** - Trip transactions
- **driverExpenses** - Driver expense records
- **users** - User data (for passenger counting)

## Future Enhancements

Potential improvements:

1. **Advanced PDF Generation**
   - Use jsPDF or pdfmake for better PDF formatting
   - Add charts and graphs to PDFs
   - Custom branding and styling

2. **True Excel Format**
   - Use xlsx library for native Excel files
   - Multiple sheets support
   - Formatting and styling

3. **Scheduled Reports**
   - Automatic report generation
   - Email delivery
   - Report history

4. **Custom Report Builder**
   - Drag-and-drop report builder
   - Custom fields selection
   - Saved report templates

5. **Data Visualization**
   - Charts in reports
   - Trend analysis
   - Comparative reports

## Error Handling

The report generation includes error handling for:

- Network errors when fetching data
- Invalid date ranges
- Missing data
- File generation failures

Errors are logged to the console and displayed to the user via alerts.

## Browser Compatibility

- **PDF**: Uses browser print functionality (all modern browsers)
- **CSV**: Standard file download (all browsers)
- **Excel**: CSV format (compatible with Excel)

## Security Considerations

- Reports only include data the admin has access to
- Date ranges are validated
- File downloads are client-side only
- No sensitive data is stored in reports
