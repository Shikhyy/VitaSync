import './AgentFlow.css'

interface Agent {
  id: string
  number: string
  role: string
  description: string
  icon: string
  tools: string[]
}

const AGENTS: Agent[] = [
  {
    id: 'ingestion',
    number: '01',
    role: 'Medical Document Specialist',
    description: 'Ingests PDF, DICOM, HL7, images. Extracts raw text via PyMuPDF. Runs Qwen-VL on scans.',
    icon: '📄',
    tools: ['PyMuPDF', 'Qwen-VL', 'pytesseract'],
  },
  {
    id: 'ner-graph',
    number: '02',
    role: 'Knowledge Graph Architect',
    description: 'Runs BioBERT NER. Maps DISEASE, DRUG, DOSAGE, LAB_TEST entities. Upserts to MindsDB graph.',
    icon: '🧠',
    tools: ['BioBERT', 'MindsDB', 'ICD-10'],
  },
  {
    id: 'ml-analyst',
    number: '03',
    role: 'Clinical Data Scientist',
    description: 'XGBoost lab anomaly detection. GBM risk predictor. Z-score trend analysis per patient.',
    icon: '📊',
    tools: ['XGBoost', 'scikit-learn', 'PubMedBERT'],
  },
  {
    id: 'query',
    number: '04',
    role: 'Clinical Intelligence Assistant',
    description: 'Semantic RAG search. Constructs grounded prompts. Qwen 72B answers with source citations.',
    icon: '💬',
    tools: ['vLLM', 'Qwen 72B', 'RAG'],
  },
  {
    id: 'monitor',
    number: '05',
    role: 'Continuous Health Monitor',
    description: 'Runs every 10 min. Invokes LLM only when ML score > 0.65. Delivers real-time WebSocket alerts.',
    icon: '🔔',
    tools: ['CrewAI', 'Celery', 'WebSocket'],
  },
]

export default function AgentFlow() {
  return (
    <section className="agent-section section" id="agents">
      <div className="container">
        <div className="section-header">
          <span className="eyebrow">Multi-Agent Architecture</span>
          <h2 className="display-section section-title">
            FIVE <span className="italic-accent">minds.</span><br />ONE BRAIN.
          </h2>
          <p className="section-subtitle body-text">
            CrewAI orchestrates five specialised agents in a sequential pipeline.
            ML classifies first. LLM reasons only when necessary.
          </p>
        </div>

        <div className="agent-flow">
          {AGENTS.map((agent, i) => (
            <div key={agent.id} className="agent-flow-item">
              <div className="agent-node feat-card" id={`agent-card-${agent.id}`}>
                <div className="agent-header">
                  <span className="agent-number eyebrow">{agent.number}</span>
                  <span className="agent-icon" role="img" aria-label={agent.role}>{agent.icon}</span>
                </div>
                <h3 className="agent-role display-card">{agent.role}</h3>
                <p className="agent-desc body-small">{agent.description}</p>
                <div className="agent-tools">
                  {agent.tools.map((t) => (
                    <span key={t} className="badge">{t}</span>
                  ))}
                </div>
              </div>
              {i < AGENTS.length - 1 && (
                <div className="agent-arrow" aria-hidden="true">
                  <div className="arrow-line" />
                  <div className="arrow-head" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ML vs LLM callout */}
        <div className="agent-callout">
          <div className="callout-bar" />
          <div className="callout-content">
            <span className="eyebrow">Core Principle</span>
            <p className="body-text">
              <strong className="text-cream">ML before LLM.</strong> XGBoost screens hundreds of lab results in &lt;50ms.
              Qwen 72B is only invoked when an anomaly score exceeds <code className="code-inline">0.65</code>.
              Not the other way around.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
