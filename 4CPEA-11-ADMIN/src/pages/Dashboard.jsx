import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UsersRound, DollarSign, FileText, TrendingUp, MapPin, ArrowUp, ArrowDown, FilePlus, ArrowUpCircle, ArrowDownCircle, Minus } from 'lucide-react'
import { useSidebar } from '../hooks/useSidebar'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import Sidebar from '../components/dashboard/Sidebar'
import ReportModal from '../components/ReportModal'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { onAuthStateChange, logOut } from '../firebase/auth'
import { subscribeDailyPassengerCount, subscribeDailyRevenue, subscribeDailyExpenses, subscribeJeepney, subscribeDailyTerminalActivity, getHistoricalData, subscribeRevenueProfitChart, subscribeYesterdayStats } from '../firebase/firestore'
import { generateReport, formatDateRange, formatDate } from '../utils/reportGenerator'
import { ROUTES } from '../constants'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebar(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  
  // KPI Stats
  const [totalPassengers, setTotalPassengers] = useState(0)
  const [revenue, setRevenue] = useState(0)
  const [expenses, setExpenses] = useState(0)
  const [profit, setProfit] = useState(0)
  
  // Comparison Stats (vs Yesterday)
  const [yesterdayStats, setYesterdayStats] = useState({
    passengers: 0,
    revenue: 0,
    expenses: 0,
    profit: 0,
  })
  
  // Performance Metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    revenuePerPassenger: 0,
    profitMargin: 0,
    expenseRatio: 0,
  })
  
  // Fleet Seat Monitoring
  const [vehicleId] = useState('ABC-1234')
  const [route] = useState('Route 1')
  const [availableSeats] = useState(2)
  const [occupiedSeats] = useState(0)
  const [utilization] = useState(0)
  
  // Terminal Data (from today's trip transactions)
  const [terminalData, setTerminalData] = useState([
    { id: 1, name: 'Terminal 1', boarding: 0, alighting: 0, total: 0 },
    { id: 2, name: 'Terminal 2', boarding: 0, alighting: 0, total: 0 },
    { id: 3, name: 'Terminal 3', boarding: 0, alighting: 0, total: 0 },
    { id: 4, name: 'Terminal 4', boarding: 0, alighting: 0, total: 0 },
  ])
  
  // Chart Data
  const [chartPeriod, setChartPeriod] = useState('Daily')
  const [chartData, setChartData] = useState([])
  const [chartType, setChartType] = useState('bar') // 'bar' or 'area'
  const [isChartLoading, setIsChartLoading] = useState(true)
  const [isChartTransitioning, setIsChartTransitioning] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (!user) {
        navigate(ROUTES.LOGIN)
      } else {
        setCurrentUser(user)
      }
    })

    return () => unsubscribe()
  }, [navigate])

  // Subscribe to real-time data
  useEffect(() => {
    if (!currentUser) return

    // Subscribe to daily passenger count
    const unsubscribePassengers = subscribeDailyPassengerCount((count) => {
      setTotalPassengers(count)
    })

    // Subscribe to daily revenue
    const unsubscribeRevenue = subscribeDailyRevenue((revenue) => {
      setRevenue(revenue)
    })

    // Subscribe to daily expenses
    const unsubscribeExpenses = subscribeDailyExpenses((expenses) => {
      setExpenses(expenses)
      // Calculate profit
      setProfit(revenue - expenses)
    })

    // Subscribe to jeepney data
    const unsubscribeJeepney = subscribeJeepney('jeep1', (jeepney) => {
      // Update fleet seat monitoring
      // Note: This will be handled separately
    })

    // Subscribe to daily terminal activity (from today's trip transactions, same source as revenue)
    const unsubscribeTerminals = subscribeDailyTerminalActivity((terminals) => {
      setTerminalData(terminals)
    })

    return () => {
      unsubscribePassengers()
      unsubscribeRevenue()
      unsubscribeExpenses()
      unsubscribeJeepney()
      unsubscribeTerminals()
    }
  }, [currentUser, revenue])

  // Subscribe to yesterday's stats for comparison
  useEffect(() => {
    if (!currentUser) return

    const unsubscribeYesterday = subscribeYesterdayStats((stats) => {
      setYesterdayStats(stats)
    })

    return () => unsubscribeYesterday()
  }, [currentUser])

  // Calculate performance metrics
  useEffect(() => {
    const revenuePerPassenger = totalPassengers > 0 ? revenue / totalPassengers : 0
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0
    const expenseRatio = revenue > 0 ? (expenses / revenue) * 100 : 0

    setPerformanceMetrics({
      revenuePerPassenger,
      profitMargin,
      expenseRatio,
    })
  }, [totalPassengers, revenue, expenses, profit])

  // Helper function to calculate change percentage
  const calculateChange = (today, yesterday) => {
    if (yesterday === 0) {
      return today > 0 ? { value: 100, isPositive: true } : { value: 0, isPositive: true }
    }
    const change = ((today - yesterday) / yesterday) * 100
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
    }
  }

  // Subscribe to chart data based on period
  useEffect(() => {
    if (!currentUser) {
      setChartData([])
      setIsChartLoading(false)
      setIsChartTransitioning(false)
      return
    }

    let unsubscribeChart = null
    let transitionTimeout = null
    let dataTimeout = null
    let endTransitionTimeout = null

    // Start transition animation
    setIsChartTransitioning(true)
    setIsChartLoading(true)
    
    // Fade out current chart
    const fadeOutDelay = 200
    
    // Subscribe to new data
    transitionTimeout = setTimeout(() => {
      unsubscribeChart = subscribeRevenueProfitChart(chartPeriod, (data) => {
        // Transform data for chart component (chart expects 'day' key)
        const transformedData = data.map((item) => ({
          day: item.label,
          revenue: item.revenue,
          profit: item.profit,
        }))
        
        // Update data after fade out completes
        dataTimeout = setTimeout(() => {
          setChartData(transformedData.length > 0 ? transformedData : [])
          setIsChartLoading(false)
          
          // Fade in new chart after data is set
          endTransitionTimeout = setTimeout(() => {
            setIsChartTransitioning(false)
          }, 100)
        }, fadeOutDelay)
      })
    }, 50)

    return () => {
      if (transitionTimeout) clearTimeout(transitionTimeout)
      if (dataTimeout) clearTimeout(dataTimeout)
      if (endTransitionTimeout) clearTimeout(endTransitionTimeout)
      if (unsubscribeChart) unsubscribeChart()
    }
  }, [currentUser, chartPeriod])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="chart-tooltip-item" style={{ color: entry.color }}>
              <span className="chart-tooltip-name">{entry.name}:</span>
              <span className="chart-tooltip-value">₱{entry.value.toFixed(2)}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Calculate Y-axis domain to always start at 0
  const getYAxisDomain = () => {
    if (chartData.length === 0) return [0, 'auto']
    
    const allValues = chartData.flatMap(d => [d.revenue, d.profit]).filter(v => !isNaN(v))
    if (allValues.length === 0) return [0, 'auto']
    
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    
    // Always start at 0 (never negative)
    const domainMin = 0
    
    // Add 10% padding above maximum, minimum 50
    const padding = Math.max(maxValue * 0.1, 50)
    const domainMax = maxValue + padding
    
    return [domainMin, domainMax]
  }

  // Color gradients for bars
  const revenueColors = ['#FF9800', '#FFB74D', '#FFCC80', '#FFE0B2']
  const profitColors = ['#2196F3', '#64B5F6', '#90CAF9', '#BBDEFB']

  const handleLogout = async () => {
    await logOut()
    navigate(ROUTES.LOGIN)
  }

  const handleGenerateReport = async (options) => {
    try {
      const { reportType, startDate, endDate, format } = options || {}
      if (!startDate || !endDate) {
        throw new Error('Please select a valid date range')
      }

      const historicalData = await getHistoricalData(startDate, endDate)
      const summary = historicalData?.summary ?? {}
      const terminalActivity = historicalData?.terminalActivity ?? []
      const transactions = historicalData?.transactions ?? []
      const expenses = historicalData?.expenses ?? []

      const reportData = {
        title: `${reportType === 'detailed' ? 'Detailed' : 'Summary'} Report - ${formatDateRange(startDate, endDate)}`,
        startDate,
        endDate,
        sections: [
          {
            title: 'Summary Statistics',
            type: 'stats',
            data: [
              { label: 'Total Passengers', value: summary.totalPassengers ?? 0 },
              { label: 'Total Revenue', value: `₱${(summary.totalRevenue ?? 0).toFixed(2)}` },
              { label: 'Total Expenses', value: `₱${(summary.totalExpenses ?? 0).toFixed(2)}` },
              { label: 'Profit', value: `₱${(summary.profit ?? 0).toFixed(2)}` },
            ],
          },
          {
            title: 'Terminal Activity',
            type: 'table',
            headers: ['Terminal', 'Boarding', 'Alighting', 'Total Activity'],
            data: terminalActivity.map((t) => ({
              Terminal: t?.name ?? 'N/A',
              Boarding: t?.boarding ?? 0,
              Alighting: t?.alighting ?? 0,
              'Total Activity': (t?.boarding ?? 0) + (t?.alighting ?? 0),
            })),
          },
        ],
      }

      if (reportType === 'detailed') {
        reportData.sections.push({
          title: 'Transaction Details',
          type: 'table',
          headers: ['Date', 'Origin', 'Destination', 'Amount', 'Jeepney ID'],
          data: transactions.map((tx) => {
            const ts = tx?.timestamp
            const dateStr = ts instanceof Date ? ts.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }) : (ts ? new Date(ts).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }) : 'N/A')
            return {
              Date: dateStr,
              Origin: tx?.origin !== 'N/A' ? `Terminal ${tx.origin}` : 'N/A',
              Destination: tx?.destination !== 'N/A' ? `Terminal ${tx.destination}` : 'N/A',
              Amount: `₱${(tx?.amount ?? 0).toFixed(2)}`,
              'Jeepney ID': tx?.jeepneyId ?? 'N/A',
            }
          }),
        })

        if (expenses.length > 0) {
          reportData.sections.push({
            title: 'Expense Details',
            type: 'table',
            headers: ['Date', 'Amount', 'Note'],
            data: expenses.map((exp) => {
              const ts = exp?.createdAt
              const dateStr = ts instanceof Date ? ts.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }) : (ts ? new Date(ts).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }) : 'N/A')
              return {
                Date: dateStr,
                Amount: `₱${(exp?.amount ?? 0).toFixed(2)}`,
                Note: exp?.note ?? 'N/A',
              }
            }),
          })
        }
      }

      await generateReport(reportData, format)
    } catch (error) {
      console.error('Error generating report:', error)
      throw error
    }
  }

  if (!currentUser) {
    return <div>Loading...</div>
  }

  return (
    <div className="admin-dashboard">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => toggleSidebar()} 
        onLogout={handleLogout}
      />
      <DashboardHeader onMenuClick={toggleSidebar} />
      
      <div className="dashboard-content">
        {/* KPI Stat Cards */}
        <div className="stats-grid">
          <Card className="stat-card stat-card-green">
            <div className="stat-card-content">
              <div className="stat-card-icon stat-icon-green">
                <UsersRound className="w-6 h-6" />
              </div>
              <div className="stat-card-info">
                <p className="stat-card-label">Total Passengers Today</p>
                <p className="stat-card-value">{totalPassengers}</p>
                {yesterdayStats.passengers > 0 && (
                  <div className="stat-card-comparison">
                    {(() => {
                      const change = calculateChange(totalPassengers, yesterdayStats.passengers)
                      return (
                        <>
                          {change.isPositive ? (
                            <ArrowUpCircle className="stat-trend-icon trend-up" />
                          ) : (
                            <ArrowDownCircle className="stat-trend-icon trend-down" />
                          )}
                          <span className={`stat-trend-text ${change.isPositive ? 'trend-up' : 'trend-down'}`}>
                            {change.isPositive ? '+' : '-'}{change.value.toFixed(1)}% vs yesterday
                          </span>
                        </>
                      )
                    })()}
                  </div>
                )}
                {performanceMetrics.revenuePerPassenger > 0 && (
                  <p className="stat-card-metric">₱{performanceMetrics.revenuePerPassenger.toFixed(2)} per passenger</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="stat-card stat-card-yellow">
            <div className="stat-card-content">
              <div className="stat-card-icon stat-icon-yellow">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="stat-card-info">
                <p className="stat-card-label">Revenue Today</p>
                <p className="stat-card-value">₱{revenue.toFixed(2)}</p>
                {yesterdayStats.revenue > 0 && (
                  <div className="stat-card-comparison">
                    {(() => {
                      const change = calculateChange(revenue, yesterdayStats.revenue)
                      return (
                        <>
                          {change.isPositive ? (
                            <ArrowUpCircle className="stat-trend-icon trend-up" />
                          ) : (
                            <ArrowDownCircle className="stat-trend-icon trend-down" />
                          )}
                          <span className={`stat-trend-text ${change.isPositive ? 'trend-up' : 'trend-down'}`}>
                            {change.isPositive ? '+' : '-'}{change.value.toFixed(1)}% vs yesterday
                          </span>
                        </>
                      )
                    })()}
                  </div>
                )}
                {yesterdayStats.revenue > 0 && (
                  <p className="stat-card-metric">Yesterday: ₱{yesterdayStats.revenue.toFixed(2)}</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="stat-card stat-card-green">
            <div className="stat-card-content">
              <div className="stat-card-icon stat-icon-green">
                <FileText className="w-6 h-6" />
              </div>
              <div className="stat-card-info">
                <p className="stat-card-label">Expenses Today</p>
                <p className="stat-card-value">₱{expenses.toFixed(2)}</p>
                {yesterdayStats.expenses > 0 && (
                  <div className="stat-card-comparison">
                    {(() => {
                      const change = calculateChange(expenses, yesterdayStats.expenses)
                      return (
                        <>
                          {change.isPositive ? (
                            <ArrowUpCircle className="stat-trend-icon trend-down" />
                          ) : (
                            <ArrowDownCircle className="stat-trend-icon trend-up" />
                          )}
                          <span className={`stat-trend-text ${change.isPositive ? 'trend-down' : 'trend-up'}`}>
                            {change.isPositive ? '+' : '-'}{change.value.toFixed(1)}% vs yesterday
                          </span>
                        </>
                      )
                    })()}
                  </div>
                )}
                {performanceMetrics.expenseRatio > 0 && (
                  <p className="stat-card-metric">{performanceMetrics.expenseRatio.toFixed(1)}% of revenue</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="stat-card stat-card-blue">
            <div className="stat-card-content">
              <div className="stat-card-icon stat-icon-blue">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="stat-card-info">
                <p className="stat-card-label">Profit Today</p>
                <p className="stat-card-value">₱{profit.toFixed(2)}</p>
                {yesterdayStats.profit > 0 && (
                  <div className="stat-card-comparison">
                    {(() => {
                      const change = calculateChange(profit, yesterdayStats.profit)
                      return (
                        <>
                          {change.isPositive ? (
                            <ArrowUpCircle className="stat-trend-icon trend-up" />
                          ) : (
                            <ArrowDownCircle className="stat-trend-icon trend-down" />
                          )}
                          <span className={`stat-trend-text ${change.isPositive ? 'trend-up' : 'trend-down'}`}>
                            {change.isPositive ? '+' : '-'}{change.value.toFixed(1)}% vs yesterday
                          </span>
                        </>
                      )
                    })()}
                  </div>
                )}
                {performanceMetrics.profitMargin > 0 && (
                  <p className="stat-card-metric">{performanceMetrics.profitMargin.toFixed(1)}% profit margin</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Fleet Seat Monitoring */}
        <Card className="fleet-card">
          <div className="fleet-card-header">
            <h3 className="fleet-card-title">Fleet Seat Monitoring</h3>
            <span className="fleet-status-badge">Active</span>
          </div>
          <div className="fleet-card-content">
            <div className="fleet-vehicle-info">
              <p className="fleet-vehicle-id">{vehicleId}</p>
              <p className="fleet-route">{route}</p>
            </div>
            <div className="fleet-seat-progress">
              <div className="fleet-progress-bar">
                <div 
                  className="fleet-progress-fill available" 
                  style={{ width: `${(availableSeats / (availableSeats + occupiedSeats)) * 100}%` }}
                />
                <div 
                  className="fleet-progress-fill occupied" 
                  style={{ width: `${(occupiedSeats / (availableSeats + occupiedSeats)) * 100}%` }}
                />
              </div>
              <div className="fleet-seat-labels">
                <span className="fleet-seat-label available">{availableSeats} Available</span>
                <span className="fleet-seat-label occupied">{occupiedSeats} Occupied</span>
                <span className="fleet-seat-label utilization">{utilization}% Utilization</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Boarding & Alighting by Terminal */}
        <div className="terminals-section">
          <h3 className="section-title">Boarding & Alighting by Terminal</h3>
          <div className="terminals-grid">
            {terminalData.map((terminal) => (
              <Card key={terminal.id} className="terminal-card">
                <div className="terminal-card-header">
                  <MapPin className="terminal-icon" />
                  <h4 className="terminal-name">{terminal.name}</h4>
                </div>
                <div className="terminal-stats">
                  <div className="terminal-stat">
                    <ArrowUp className="terminal-arrow up" />
                    <span className="terminal-value">{terminal.boarding}</span>
                    <span className="terminal-label">Boarding</span>
                  </div>
                  <div className="terminal-stat">
                    <ArrowDown className="terminal-arrow down" />
                    <span className="terminal-value">{terminal.alighting}</span>
                    <span className="terminal-label">Alighting</span>
                  </div>
                </div>
                <p className="terminal-total">{terminal.total} Total Activity</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Revenue & Profit Overview */}
        <Card className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Revenue & Profit Overview</h3>
            <div className="chart-controls">
              <div className="chart-period-filters">
              {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((period) => (
                <button
                  key={period}
                  className={`chart-period-btn ${chartPeriod === period ? 'active' : ''}`}
                  onClick={() => {
                    if (chartPeriod !== period) {
                      setChartPeriod(period)
                    }
                  }}
                  disabled={isChartTransitioning}
                >
                  {period}
                </button>
              ))}
              </div>
              <div className="chart-type-toggle">
                <button
                  className={`chart-type-btn ${chartType === 'bar' ? 'active' : ''}`}
                  onClick={() => setChartType('bar')}
                  title="Bar Chart"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="12" width="4" height="8" />
                    <rect x="10" y="8" width="4" height="12" />
                    <rect x="17" y="4" width="4" height="16" />
                  </svg>
                </button>
                <button
                  className={`chart-type-btn ${chartType === 'area' ? 'active' : ''}`}
                  onClick={() => setChartType('area')}
                  title="Area Chart"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12l4-4 4 4 6-6 4 4v8H3z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="chart-legend">
            <div className="chart-legend-item">
              <span className="chart-legend-color revenue"></span>
              <span>Revenue</span>
            </div>
            <div className="chart-legend-item">
              <span className="chart-legend-color profit"></span>
              <span>Profit</span>
            </div>
          </div>
          <div className={`chart-container ${isChartTransitioning ? 'transitioning' : ''}`}>
            {isChartLoading ? (
              <div className="chart-loading">
                <div className="chart-loading-spinner"></div>
                <p>Loading chart data...</p>
              </div>
            ) : chartData.length > 0 ? (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={350}>
                {chartType === 'bar' ? (
                  <BarChart 
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF9800" stopOpacity={1} />
                        <stop offset="100%" stopColor="#FFB74D" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2196F3" stopOpacity={1} />
                        <stop offset="100%" stopColor="#64B5F6" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                    <XAxis 
                      dataKey="day" 
                      stroke="#6B7280"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#6B7280"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                      tickLine={false}
                      tickFormatter={(value) => `₱${value.toFixed(0)}`}
                      domain={getYAxisDomain()}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="revenue" 
                      name="Revenue"
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                      animationBegin={0}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-revenue-${index}`} fill="url(#revenueGradient)" />
                      ))}
                    </Bar>
                    <Bar 
                      dataKey="profit" 
                      name="Profit"
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                      animationBegin={100}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-profit-${index}`} fill="url(#profitGradient)" />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <AreaChart 
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF9800" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#FF9800" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="profitAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#2196F3" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                    <XAxis 
                      dataKey="day" 
                      stroke="#6B7280"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#6B7280"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                      tickLine={false}
                      tickFormatter={(value) => `₱${value.toFixed(0)}`}
                      domain={getYAxisDomain()}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#FF9800" 
                      strokeWidth={3}
                      fill="url(#revenueAreaGradient)"
                      name="Revenue"
                      animationDuration={800}
                      animationBegin={0}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#2196F3" 
                      strokeWidth={3}
                      fill="url(#profitAreaGradient)"
                      name="Profit"
                      animationDuration={800}
                      animationBegin={100}
                    />
                  </AreaChart>
                )}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="chart-empty">
                <p>No data available for the selected period</p>
              </div>
            )}
          </div>
        </Card>

        {/* Generate Report Button */}
        <div className="report-section">
          <Button
            variant="primary"
            size="large"
            onClick={() => setShowReportModal(true)}
            className="generate-report-btn"
          >
            <FilePlus className="w-5 h-5" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onGenerate={handleGenerateReport}
      />
    </div>
  )
}

export default Dashboard
