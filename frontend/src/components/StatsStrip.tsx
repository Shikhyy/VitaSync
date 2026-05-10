import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
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
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Staggered entry for items
    gsap.from('.stat-item', {
      y: 30,
      opacity: 0,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 90%',
      }
    })

    // Count-up animation
    const counters = gsap.utils.toArray<HTMLElement>('.stat-number')
    counters.forEach((counter) => {
      const target = parseFloat(counter.dataset.target || '0')
      const decimal = parseInt(counter.dataset.decimal || '0')
      const suffix = counter.dataset.suffix || ''
      
      const obj = { val: 0 }
      gsap.to(obj, {
        val: target,
        duration: 1.5,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
        },
        onUpdate: () => {
          counter.textContent = `${decimal ? obj.val.toFixed(1) : Math.round(obj.val)}${suffix}`
        }
      })
    })
  }, { scope: containerRef })

  return (
    <div className="stats-strip" ref={containerRef} id="stats-strip">
      {STATS.map((stat) => (
        <div className="stat-item" key={stat.label}>
          <div className="stat-value">
            <span
              className="stat-number"
              data-target={stat.value}
              data-suffix={stat.suffix}
              data-decimal={stat.value % 1 !== 0 ? '1' : '0'}
            >
              0{stat.suffix}
            </span>
          </div>
          <div className="stat-label">{stat.label}</div>
          <div className="stat-desc body-small">{stat.description}</div>
        </div>
      ))}
    </div>
  )
}
