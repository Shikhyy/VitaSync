import { useRef } from 'react'
import { Link } from 'react-router-dom'
import HeroSection from '../components/HeroSection'
import StatsStrip from '../components/StatsStrip'
import AgentFlow from '../components/AgentFlow'
import BackgroundCanvas from '../components/BackgroundCanvas'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import './Landing.css'

gsap.registerPlugin(ScrollTrigger)

const GITHUB_REPO_URL = 'https://github.com/Shikhyy/VitaSync'

const FEATURES = [
  {
    id: 'ingestion',
    size: 'large',
    eyebrow: 'Document Intelligence',
    title: 'EVERY FORMAT. ONE BRAIN.',
    body: 'PDF, DICOM, JPEG scans, CSV lab exports, HL7 FHIR JSON. VitaSync ingests everything. BioBERT extracts entities. PubMedBERT builds semantic vectors. All in under 4 seconds.',
    tags: ['PDF', 'DICOM', 'HL7 FHIR', 'BioBERT', 'Qwen-VL'],
    stat: { value: '<4s', label: 'per document' },
  },
  {
    id: 'privacy',
    size: 'small',
    eyebrow: 'Secure Cloud',
    title: 'ENTERPRISE CLOUD.',
    body: 'Every byte stays in a sovereign, encrypted cloud environment. Zero third-party data sharing at runtime.',
    tags: ['AMD MI300X', 'Apache 2.0'],
    stat: null,
  },
  {
    id: 'x402',
    size: 'small',
    eyebrow: 'X402 Consent',
    title: 'PATIENTS OWN THEIR DATA.',
    body: 'Cryptographic consent gates every query. Patients set price-per-query. One-tap revocation.',
    tags: ['X402', 'Micropayments'],
    stat: { value: '$0.01', label: 'per query' },
  },
  {
    id: 'ml',
    size: 'medium',
    eyebrow: 'ML Anomaly Engine',
    title: 'XGBOOST FIRST. LLM SECOND.',
    body: 'XGBoost classifies lab results in <50ms. Gradient boosting predicts diabetes, CVD, CKD risk. LLM only fires above 0.65 alert threshold.',
    tags: ['XGBoost', 'scikit-learn', 'F1: 0.86'],
    stat: { value: '0.65', label: 'alert threshold' },
  },
  {
    id: 'query',
    size: 'medium',
    eyebrow: 'LLM Query Agent',
    title: 'QWEN 72B. 32K CONTEXT.',
    body: 'Semantic RAG surfaces top-5 document chunks. ML risk scores enrich context. Qwen answers with inline citations. Always grounded. Never guessing.',
    tags: ['Qwen2.5-72B', 'vLLM', 'RAG', 'PubMedBERT'],
    stat: { value: '<3s', label: 'query P95' },
  },
]

const STACK_ITEMS = [
  { layer: 'Compute', tech: 'AMD MI300X', detail: '192GB HBM3' },
  { layer: 'LLM Inference', tech: 'vLLM + ROCm 6.0', detail: 'Qwen2.5-72B-Instruct' },
  { layer: 'Agent Orchestration', tech: 'CrewAI + LangChain', detail: '5 specialised agents' },
  { layer: 'Knowledge Graph', tech: 'MindsDB', detail: 'Vector + graph queries' },
  { layer: 'API', tech: 'FastAPI + Uvicorn', detail: 'Async, OpenAPI auto-docs' },
  { layer: 'Task Queue', tech: 'Celery + Redis', detail: 'Background ingestion' },
  { layer: 'Frontend', tech: 'React 18 + Vite', detail: 'TypeScript strict mode' },
  { layer: 'Database', tech: 'PostgreSQL 16', detail: 'Alembic migrations' },
]

export default function Landing() {
  const mainRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    // 1. General Reveal for Headers
    gsap.utils.toArray('.section-header').forEach((header: any) => {
      gsap.from(header, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: header,
          start: 'top 85%',
        }
      })
    })

    // 2. Staggered Feature Cards Reveal
    gsap.from('.feature-card', {
      y: 60,
      opacity: 0,
      stagger: 0.15,
      duration: 1,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: '.features-grid',
        start: 'top 80%',
      }
    })

    // 3. Tech Stack Stagger
    gsap.from('.stack-item', {
      x: -20,
      opacity: 0,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.stack-grid',
        start: 'top 85%',
      }
    })

    // 4. CTA Rings Parallax
    gsap.to('.cta-ring-1', {
      y: -50,
      rotate: 45,
      scrollTrigger: {
        trigger: '.cta-section',
        scrub: 1,
      }
    })

    gsap.to('.cta-ring-2', {
      y: 50,
      rotate: -45,
      scrollTrigger: {
        trigger: '.cta-section',
        scrub: 1,
      }
    })

    // 5. CTA Content Reveal
    gsap.from('.cta-inner > *', {
      y: 30,
      opacity: 0,
      stagger: 0.1,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.cta-inner',
        start: 'top 80%',
      }
    })
  }, { scope: mainRef })

  return (
    <main id="main-content" ref={mainRef} className="landing-main">
      <BackgroundCanvas />
      <HeroSection />
      <StatsStrip />

      {/* Features */}
      <section className="features-section section" id="features">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Core Features</span>
            <h2 className="display-section section-title">
              BUILT FOR<br /><span className="italic-accent">real</span> HEALTHCARE.
            </h2>
          </div>

          <div className="features-grid">
            {FEATURES.map((f) => (
              <div
                key={f.id}
                className={`feat-card feature-card feature-card--${f.size}`}
                id={`feature-${f.id}`}
              >
                <span className="eyebrow">{f.eyebrow}</span>
                <h3 className="display-card feature-title">{f.title}</h3>
                <p className="body-small feature-body">{f.body}</p>
                {f.stat && (
                  <div className="feature-stat">
                    <span className="feature-stat-value">{f.stat.value}</span>
                    <span className="feature-stat-label">{f.stat.label}</span>
                  </div>
                )}
                <div className="feature-tags">
                  {f.tags.map((t) => <span key={t} className="badge">{t}</span>)}
                </div>
                {/* Decorative bar */}
                <div className="feature-bar" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <AgentFlow />

      {/* Tech Stack */}
      <section className="stack-section section" id="stack">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Technology</span>
            <h2 className="display-section section-title">
              THE <span className="italic-accent">right</span> TOOL.<br />
              EVERY TIME.
            </h2>
            <p className="section-subtitle body-text">
              Every choice in our stack serves privacy, performance, or developer experience — nothing trendy, nothing gratuitous.
            </p>
          </div>

          <div className="stack-grid">
            {STACK_ITEMS.map((item) => (
              <div className="stack-item" key={item.layer}>
                <div className="stack-layer eyebrow">{item.layer}</div>
                <div className="stack-tech">{item.tech}</div>
                <div className="stack-detail body-small">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section section" id="cta">
        <div className="container">
          <div className="cta-inner">
            <div className="cta-rings" aria-hidden="true">
              <div className="cta-ring cta-ring-1" />
              <div className="cta-ring cta-ring-2" />
            </div>
            <span className="eyebrow">Open Source · Apache 2.0</span>
            <h2 className="display-section cta-title">
              BUILD THE<br /><span className="italic-accent">future</span><br />OF CARE.
            </h2>
            <p className="body-text" style={{ maxWidth: 480, marginBottom: 40 }}>
              Deploy securely on enterprise cloud infrastructure. Contribute to the open-source community.
              No vendor lock-in. No data leaving your secure sovereign boundaries.
            </p>
            <div className="cta-actions">
              <Link to="/onboard/signup" className="btn-primary" id="cta-get-started-btn">
                Start for Free
              </Link>
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary" id="cta-github-btn">
                Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <div className="footer-logo">
                <div className="nav-logo-dot" />
                <span className="nav-logo-text">VITA<span className="nav-logo-accent">SYNC</span></span>
              </div>
              <p className="body-small footer-tagline">Pure. Honest. Life-saving.</p>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <div className="footer-col-title eyebrow">Platform</div>
                <Link to="/onboard/signup" className="footer-link">Get Started</Link>
                <a href="#features" className="footer-link">Features</a>
                <a href="#stack" className="footer-link">Tech Stack</a>
              </div>
              <div className="footer-col">
                <div className="footer-col-title eyebrow">Community</div>
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
                <a href="#" className="footer-link">Discord</a>
                <a href="#" className="footer-link">Docs</a>
              </div>
              <div className="footer-col">
                <div className="footer-col-title eyebrow">Legal</div>
                <a href="#" className="footer-link">Apache 2.0</a>
                <a href="#" className="footer-link">Privacy</a>
                <a href="#" className="footer-link">Security</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="body-small">© 2026 VitaSync. Open source under Apache 2.0.</span>
            <span className="body-small">Built for the AMD Developer Hackathon 2026.</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
