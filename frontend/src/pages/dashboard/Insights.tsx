import { useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { mockPatientData } from '../../lib/api'
import './Dashboard.css'
import './Insights.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(26, 18, 8, 0.95)',
      borderColor: 'rgba(255, 131, 79, 0.3)',
      borderWidth: 0.5,
      titleColor: '#f8f7e5',
      bodyColor: 'rgba(248,247,229,0.6)',
      padding: 12,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,131,79,0.06)', borderColor: 'rgba(255,131,79,0.1)' },
      ticks: { color: 'rgba(248,247,229,0.4)', font: { size: 11 } },
    },
    y: {
      grid: { color: 'rgba(255,131,79,0.06)', borderColor: 'rgba(255,131,79,0.1)' },
      ticks: { color: 'rgba(248,247,229,0.4)', font: { size: 11 } },
    },
  },
}

const CHARTS = [
  {
    id: 'hba1c',
    title: 'HBA1C TREND',
    unit: '%',
    refRange: '4.0 – 5.6%',
    trend: '+0.7% over 18 months',
    trendDir: 'up',
    key: 'hba1c' as const,
    color: '#fbbf24',
    alert: true,
  },
  {
    id: 'bp',
    title: 'SYSTOLIC BLOOD PRESSURE',
    unit: 'mmHg',
    refRange: '<120 mmHg',
    trend: '-10 mmHg over 18 months',
    trendDir: 'down',
    key: 'systolicBP' as const,
    color: '#4ade80',
    alert: false,
  },
  {
    id: 'ldl',
    title: 'LDL CHOLESTEROL',
    unit: 'mmol/L',
    refRange: '<3.0 mmol/L',
    trend: '-0.8 mmol/L over 18 months',
    trendDir: 'down',
    key: 'ldl' as const,
    color: '#4ade80',
    alert: false,
  },
]

function makeChartData(labels: string[], values: number[], color: string) {
  return {
    labels,
    datasets: [
      {
        label: 'Value',
        data: values,
        borderColor: color,
        backgroundColor: `${color}18`,
        borderWidth: 2,
        pointBackgroundColor: color,
        pointBorderColor: 'transparent',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      },
    ],
  }
}

export default function Insights() {
  const { labTrends, riskScores } = mockPatientData
  const [activeChart, setActiveChart] = useState('hba1c')

  const riskItems = [
    { label: 'Diabetes', value: riskScores.diabetes, color: '#fbbf24' },
    { label: 'Cardiovascular', value: riskScores.cardiovascular, color: '#4ade80' },
    { label: 'CKD', value: riskScores.ckd, color: '#60a5fa' },
  ]

  return (
    <div className="dash-page" id="dashboard-insights">
      <div className="dash-page-header">
        <div>
          <span className="eyebrow">Health Insights</span>
          <h1 className="display-section dash-page-title">
            YOUR <span className="italic-accent">trends.</span>
          </h1>
        </div>
      </div>

      {/* Chart tabs */}
      <div className="chart-tabs" role="tablist">
        {CHARTS.map((c) => (
          <button
            key={c.id}
            className={`chart-tab ${activeChart === c.id ? 'active' : ''}`}
            onClick={() => setActiveChart(c.id)}
            role="tab"
            aria-selected={activeChart === c.id}
            id={`tab-${c.id}`}
          >
            {c.alert && <span className="tab-alert-dot" aria-label="Alert" />}
            {c.title}
          </button>
        ))}
      </div>

      {/* Active chart */}
      {CHARTS.map((c) => {
        if (c.id !== activeChart) return null
        const data = labTrends[c.key]
        return (
          <div key={c.id} className="chart-card feat-card" id={`chart-${c.id}`} role="tabpanel">
            <div className="chart-card-header">
              <div>
                <span className="eyebrow">{c.title}</span>
                <div className="chart-trend">
                  <span
                    className={c.trendDir === 'up' ? 'text-warning' : 'text-success'}
                    style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: 2 }}
                  >
                    {data.values[data.values.length - 1]} <span style={{ fontSize: 16 }}>{c.unit}</span>
                  </span>
                  <span
                    className={`trend-badge ${c.trendDir === 'up' ? 'badge-warning' : 'badge-success'}`}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 2 }}
                  >
                    {c.trendDir === 'up' ? '↑' : '↓'} {c.trend}
                  </span>
                </div>
              </div>
              <div>
                <span className="body-small" style={{ color: 'var(--bd-muted)' }}>Reference range</span>
                <div className="body-small">{c.refRange}</div>
              </div>
            </div>

            <div className="chart-wrapper">
              <Line
                data={makeChartData(data.labels, data.values, c.color)}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                options={CHART_OPTIONS as any}
                aria-label={`${c.title} trend chart`}
              />
            </div>
          </div>
        )
      })}

      {/* Risk scores */}
      <div className="feat-card insights-risk">
        <span className="eyebrow">ML Disease Risk Scores</span>
        <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 8, marginBottom: 24 }}>
          Computed by XGBoost + GradientBoosting on your lab history. Updated every 10 minutes by the monitoring agent.
        </p>

        <div className="risk-bars-grid">
          {riskItems.map((item) => (
            <div key={item.label} className="risk-bar-item">
              <div className="risk-bar-header">
                <span style={{ color: 'var(--bd-cream)', fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: item.color, letterSpacing: 2 }}>
                  {Math.round(item.value * 100)}%
                </span>
              </div>
              <div className="ml-bar-track" style={{ height: 6 }}>
                <div
                  className="ml-bar-fill"
                  style={{ width: `${item.value * 100}%`, background: item.color }}
                />
              </div>
              <span className="body-small" style={{ color: 'var(--bd-muted)' }}>
                {item.value < 0.2 ? 'Low risk' : item.value < 0.4 ? 'Moderate risk' : 'High risk — monitor closely'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
