import { useEffect, useRef } from 'react'
import './StatsStrip.css'

interface Stat {
  value: number
  suffix: string
  label: string
  description: string
}

const STATS: Stat[] = [
  { value: 94, suffix: ' tok/s', label: 'Qwen 72B Throughput', description: 'AMD MI300X, single card' },
  { value: 2.4, suffix: 's', label: 'Query Latency P95', description: 'Semantic search + LLM answer' },
  { value: 3.1, suffix: 's', label: 'Ingestion Speed', description: 'Per document, any format' },
  { value: 99.9, suffix: '%', label: 'Uptime', description: 'Secure cloud, full privacy moat' },
]

export default function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null)
  const animated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true
          animateCounters(el)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="stats-strip" ref={ref} id="stats-strip">
      {STATS.map((stat, i) => (
        <div className="stat-item" key={stat.label} style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="stat-value">
            <span
              className="stat-number"
              data-target={stat.value}
              data-suffix={stat.suffix}
              data-decimal={stat.value % 1 !== 0 ? '1' : '0'}
            >
              {stat.value}{stat.suffix}
            </span>
          </div>
          <div className="stat-label">{stat.label}</div>
          <div className="stat-desc body-small">{stat.description}</div>
        </div>
      ))}
    </div>
  )
}

function animateCounters(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>('.stat-number').forEach((el) => {
    const target = parseFloat(el.dataset.target || '0')
    const suffix = el.dataset.suffix || ''
    const decimal = parseInt(el.dataset.decimal || '0')
    const duration = 1500
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      const current = target * eased
      el.textContent = `${decimal ? current.toFixed(1) : Math.round(current)}${suffix}`
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}
