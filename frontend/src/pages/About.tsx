import { useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import './About.css'

const GITHUB_REPO_URL = 'https://github.com/Shikhyy/VitaSync'

export default function About() {
  const contentRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
    
    gsap.set('.about-title', { y: 15, opacity: 0 })
    gsap.set('.eyebrow', { y: 10, opacity: 0 })
    gsap.set('.about-header .body-text', { y: 15, opacity: 0 })
    
    tl.to('.eyebrow', { y: 0, opacity: 1, duration: 0.4 }, 0.1)
      .to('.about-title', { y: 0, opacity: 1, duration: 0.4 }, 0.2)
      .to('.about-header .body-text', { y: 0, opacity: 1, duration: 0.4 }, 0.3)

    // Scroll reveal for the rest
    gsap.utils.toArray('.reveal').forEach((el: any) => {
      gsap.fromTo(el,
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
          }
        }
      )
    })
  }, { scope: contentRef })

  return (
    <main className="about-page" id="main-content" ref={contentRef}>
      {/* Header */}
      <header className="about-header section">
        <div className="container reveal">
          <span className="eyebrow">The VitaSync Story</span>
          <h1 className="display-hero about-title">
            BUILDING <span className="italic-accent">trust</span><br />
            IN HEALTHCARE.
          </h1>
          <p className="body-text" style={{ maxWidth: 600, fontSize: 18 }}>
            Born from the need for absolute privacy and cryptographic consent. We believe that your health data belongs to you, and the tools to understand it should run locally, securely, and transparently.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <section className="section">
        <div className="container">
          <div className="about-content">
            <div className="about-text-block reveal">
              <div className="about-mission">
                "Our mission is to decouple health intelligence from data surveillance. We put hospital-grade AI directly into the secure cloud, empowering patients and their chosen clinicians."
              </div>
              <p className="body-text">
                VitaSync started as an open-source initiative to solve a critical problem: medical AI is too powerful to be locked behind proprietary, insecure black boxes. Patient data is frequently sold, scraped, or leaked.
              </p>
              <p className="body-text">
                We've built a platform that runs entirely within secure healthcare boundaries. Every clinical query, every lab anomaly extraction, and every patient risk assessment happens in a completely sovereign environment, putting patient safety and absolute privacy first.
              </p>
              
              <div className="cta-actions" style={{ marginTop: 'var(--space-lg)' }}>
                <Link to="/onboard/signup" className="btn-primary">Join the Platform</Link>
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">View Source Code</a>
              </div>
            </div>

            <div className="about-image-wrapper reveal" style={{ transitionDelay: '0.2s' }}>
              <img 
                src="/images/about_medical.png" 
                alt="VitaSync Clinical Data Visualization" 
                className="about-image" 
              />
            </div>
          </div>

          {/* Core Values */}
          <div className="about-values reveal">
            <div className="value-card">
              <h3 className="value-title">SECURE CLOUD</h3>
              <p className="body-small">
                We reject the insecure paradigm for sensitive health records. All inference runs in our dedicated, encrypted cloud infrastructure.
              </p>
            </div>
            <div className="value-card">
              <h3 className="value-title">CRYPTOGRAPHIC CONSENT</h3>
              <p className="body-small">
                Patients have absolute control over who accesses their data, with the ability to instantly revoke access at any time.
              </p>
            </div>
            <div className="value-card">
              <h3 className="value-title">OPEN ARCHITECTURE</h3>
              <p className="body-small">
                Proprietary AI is dangerous in healthcare. Our code is open source under Apache 2.0, open to audit by anyone.
              </p>
            </div>
            <div className="value-card">
              <h3 className="value-title">CLINICAL RIGOR</h3>
              <p className="body-small">
                We use grounded RAG and strictly limit LLM hallucinations. The system cites exact sources for every claim it makes.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer minimal */}
      <footer className="footer" style={{ marginTop: 'auto' }}>
        <div className="container">
          <div className="footer-bottom" style={{ borderTop: '0.5px solid var(--bd-border)', paddingTop: 'var(--space-lg)' }}>
            <span className="body-small">© 2026 VitaSync. Open source under Apache 2.0.</span>
            <span className="body-small">Built for the AMD Developer Hackathon 2026.</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
