import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const smallScreen = window.matchMedia('(max-width: 900px)').matches
    if (reduceMotion || smallScreen) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    const nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = []
    const nodeCount = 28

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 1.5 + 0.5
      })
    }

    let scrollProgress = 0
    const trigger = ScrollTrigger.create({
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        scrollProgress = self.progress
      }
    })

    let frameId = 0
    let lastFrame = 0

    function animate(now = 0) {
      frameId = requestAnimationFrame(animate)
      if (now - lastFrame < 1000 / 30) return
      lastFrame = now
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, width, height)
      
      // Background gradient based on scroll
      const bgAlpha = 0.05 + scrollProgress * 0.1
      ctx.fillStyle = `rgba(255, 131, 79, ${bgAlpha * 0.2})`
      
      nodes.forEach((node, i) => {
        // Move nodes faster with scroll
        const speedMult = 1 + scrollProgress * 3
        node.x += node.vx * speedMult
        node.y += node.vy * speedMult

        if (node.x < 0 || node.x > width) node.vx *= -1
        if (node.y < 0 || node.y > height) node.vy *= -1

        // Draw node
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
        ctx.fillStyle = i % 10 === 0 ? `rgba(255, 131, 79, ${0.4 + scrollProgress * 0.6})` : `rgba(245, 242, 237, 0.15)`
        ctx.fill()

        // Draw connections
        for (let j = i + 1; j < Math.min(nodes.length, i + 8); j++) {
          const other = nodes[j]
          const dx = node.x - other.x
          const dy = node.y - other.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 150 + scrollProgress * 100

          if (dist < maxDist) {
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            const alpha = (1 - dist / maxDist) * (0.1 + scrollProgress * 0.2)
            ctx.strokeStyle = `rgba(245, 242, 237, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      })

      // Add a subtle "heartbeat" pulse line
      const pulseY = (Date.now() % 4000) / 4000 * height
      ctx.beginPath()
      ctx.moveTo(0, pulseY)
      ctx.lineTo(width, pulseY)
      ctx.strokeStyle = `rgba(255, 131, 79, ${0.03 + scrollProgress * 0.05})`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      if (canvas) {
        canvas.width = width
        canvas.height = height
      }
    }

    window.addEventListener('resize', handleResize)
    frameId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameId)
      trigger.kill()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        background: 'var(--bd-ink)',
      }}
    />
  )
}
