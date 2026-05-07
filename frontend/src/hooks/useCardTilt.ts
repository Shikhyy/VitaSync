import { useEffect } from 'react'

export function useCardTilt() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const card = e.currentTarget as HTMLElement
      const rect = card.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      // Max tilt: 6 degrees
      card.style.transform = `translateY(-6px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`
    }

    const handleMouseLeave = (e: MouseEvent) => {
      const card = e.currentTarget as HTMLElement
      card.style.transform = ''
    }

    // Small delay to ensure DOM is painted, then attach listeners to all .feat-card elements
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

    // Re-attach if mutations occur (e.g. new records added)
    const observer = new MutationObserver((mutations) => {
      let shouldReattach = false
      mutations.forEach(m => {
        if (m.addedNodes.length > 0) shouldReattach = true
      })
      if (shouldReattach) attachListeners()
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      const cards = document.querySelectorAll('.feat-card')
      cards.forEach(card => {
        const htmlCard = card as HTMLElement
        htmlCard.removeEventListener('mousemove', handleMouseMove)
        htmlCard.removeEventListener('mouseleave', handleMouseLeave)
      })
    }
  }, [])
}
