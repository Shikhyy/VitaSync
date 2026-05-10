import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import './HeroSection.css'

const GITHUB_REPO_URL = 'https://github.com/Shikhyy/VitaSync'

export default function HeroSection() {
  const particlesRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const smallScreen = window.matchMedia('(max-width: 900px)').matches
    if (reduceMotion || smallScreen) return

    const container = particlesRef.current
    if (!container) return
    container.innerHTML = ''
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div')
      p.className = 'particle'
      p.style.left = `${Math.random() * 100}%`
      p.style.bottom = `${Math.random() * 30}%`
      p.style.width = p.style.height = `${1 + Math.random() * 2}px`
      p.style.animationDuration = `${5 + Math.random() * 8}s`
      p.style.animationDelay = `${Math.random() * 8}s`
      container.appendChild(p)
    }
  }, [])

  useGSAP(() => {
    const tl = gsap.timeline()

    // Entrance
    tl.from('.hero-eyebrow', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' })
      .from('.hero-title', { y: 40, opacity: 0, duration: 1, ease: 'expo.out' }, '-=0.5')
      .from('.hero-subtitle', { y: 20, opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
      .from('.hero-ctas', { y: 20, opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.5')
      .from('.hero-footnote', { opacity: 0, duration: 1 }, '-=0.4')

    // Floating animation for rings
    gsap.to('.ring', {
      y: (i) => (i + 1) * 10,
      rotate: (i) => (i % 2 === 0 ? 5 : -5),
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })

    // Parallax on scroll
    gsap.to('.rings-container', {
      y: 100,
      opacity: 0.2,
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        scrub: true
      }
    })
  }, { scope: heroRef })

  return (
    <section className="hero" id="hero" aria-labelledby="hero-title" ref={heroRef}>
      {/* Orbiting rings */}
      <div className="rings-container" aria-hidden="true">
        <div className="ring ring-1" />
        <div className="ring ring-2" />
        <div className="ring ring-3" />
        <div className="ring-center">
          <div className="ring-center-dot" />
          <div className="ring-center-pulse" />
        </div>
      </div>

      {/* Floating particles */}
      <div className="particles" ref={particlesRef} aria-hidden="true" />

      {/* Content */}
      <div className="hero-content container">
        <div className="hero-eyebrow">
          <div className="live-dot" />
          <span className="eyebrow">HIPAA-Compliant · Qwen 72B · Secure Cloud · Open Source</span>
        </div>

        <h1 className="display-hero hero-title" id="hero-title">
          YOUR<br />
          MEDICAL<br />
          <span className="italic-accent">Brain.</span>
        </h1>

        <p className="hero-subtitle">
          VitaSync unifies fragmented patient records into a single, queryable AI health
          intelligence layer. All inference in a secure cloud. Zero data leaving your sovereign environment.
        </p>

        <div className="hero-ctas">
          <Link to="/onboard/signup" className="btn-primary" id="hero-get-started-btn">
            Get Started Free
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary" id="hero-github-btn">
            View on GitHub
          </a>
        </div>

        <div className="hero-footnote">
          <span className="body-small">Apache 2.0 · Self-host in one command</span>
          <span className="hero-dot" aria-hidden="true">·</span>
          <span className="body-small"><code>docker compose up</code></span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="scroll-indicator" aria-hidden="true">
        <div className="scroll-line" />
        <span className="eyebrow" style={{ fontSize: '9px' }}>Scroll</span>
      </div>
    </section>
  )
}
