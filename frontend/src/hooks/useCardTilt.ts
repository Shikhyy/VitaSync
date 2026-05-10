import { useEffect } from 'react'

export function useCardTilt() {
  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!canHover || reduceMotion) return

    let frame = 0
    let latestEvent: MouseEvent | null = null

    const handleMouseMove = (e: MouseEvent) => {
      latestEvent = e
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!latestEvent) return
        applyTilt(latestEvent)
      })
    }

    const applyTilt = (e: MouseEvent) => {
      const card = e.currentTarget as HTMLElement
      const rect = card.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      card.style.transform = `translateY(-3px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg)`
    }

    const handleMouseLeave = (e: MouseEvent) => {
      latestEvent = null
      const card = e.currentTarget as HTMLElement
      card.style.transform = ''
    }

    const attachListeners = () => {
      const cards = document.querySelectorAll('.feat-card')
      cards.forEach(card => {
        const htmlCard = card as HTMLElement
        // Remove old listeners to avoid duplicates
        htmlCard.removeEventListener('mousemove', handleMouseMove)
        htmlCard.removeEventListener('mouseleave', handleMouseLeave)

        htmlCard.addEventListener('mousemove', handleMouseMove)
        htmlCard.addEventListener('mouseleave', handleMouseLeave)
      })
    }

    attachListeners()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      const cards = document.querySelectorAll('.feat-card')
      cards.forEach(card => {
        const htmlCard = card as HTMLElement
        htmlCard.removeEventListener('mousemove', handleMouseMove)
        htmlCard.removeEventListener('mouseleave', handleMouseLeave)
      })
    }
  }, [])
}
