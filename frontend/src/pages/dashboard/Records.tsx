import { useCallback, useEffect, useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCardTilt } from '../../hooks/useCardTilt'
import { usePatientStore } from '../../stores/patientStore'
import { listDocuments, uploadDocument, type IngestDocument } from '../../lib/api'
import './Dashboard.css'
import './Records.css'

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF', jpeg: 'JPEG', png: 'PNG', dicom: 'DICOM', csv: 'CSV', hl7: 'HL7 FHIR',
}

const DOC_TYPE_ICONS: Record<string, string> = {
  'Lab Report': '🧪',
  'Discharge Summary': '🏥',
  'Prescription': '💊',
  'ECG Report': '❤️',
  'Imaging Report': '🔬',
  'Consultation Note': '📋',
}

export default function Records() {
  const { documents, addDocument, setDocuments, updateDocumentStatus } = usePatientStore()
  const [uploading, setUploading] = useState<string[]>([])
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useCardTilt()

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    
    gsap.set('.dash-page-title', { y: 30, opacity: 0 })
    gsap.set('.eyebrow', { y: 20, opacity: 0 })
    gsap.set('.dropzone', { y: 40, opacity: 0 })
    gsap.set('.formats-strip .badge', { opacity: 0, scale: 0.8 })
    gsap.set('.feat-card', { y: 40, opacity: 0 })

    tl.to('.eyebrow', { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, 0.2)
      .to('.dash-page-title', { y: 0, opacity: 1, duration: 0.8 }, 0.4)
      .to('.dropzone', { y: 0, opacity: 1, duration: 0.8 }, 0.6)
      .to('.formats-strip .badge', { opacity: 1, scale: 1, duration: 0.4, stagger: 0.05 }, 0.8)
      .to('.feat-card', { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, 0.9)
  }, { scope: containerRef })

  useEffect(() => {
    listDocuments()
      .then((docs) => setDocuments(docs.map(toStoreDocument)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load documents'))
  }, [setDocuments])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(async (file) => {
      const id = `upload-${file.name}-${Date.now()}`
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
      const newDoc = {
        id,
        fileType: ext,
        documentType: 'Lab Report',
        sourceName: 'Uploaded by Patient',
        documentDate: new Date().toISOString().split('T')[0],
        ingestionStatus: 'pending' as const,
        entityCount: 0,
        createdAt: new Date().toISOString(),
      }
      addDocument(newDoc)
      setUploading((u) => [...u, id])
      setError('')

      try {
        const result = await uploadDocument(file)
        const docs = await listDocuments()
        setDocuments(docs.map(toStoreDocument))
        updateDocumentStatus(id, result.status === 'done' ? 'done' : 'processing')
      } catch (err) {
        updateDocumentStatus(id, 'failed')
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading((u) => u.filter((uid) => uid !== id))
      }
    })
  }, [addDocument, setDocuments, updateDocumentStatus])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
    },
    multiple: true,
  })

  const processingCount = uploading.length

  return (
    <div className="dash-page" id="dashboard-records" ref={containerRef}>
      <div className="dash-page-header">
        <div>
          <span className="eyebrow">Medical Records</span>
          <h1 className="display-section dash-page-title">
            ALL YOUR <span className="italic-accent">records.</span>
          </h1>
        </div>
        <div className="dash-header-actions">
          {processingCount > 0 && (
            <>
              <div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
              <span className="body-small" style={{ color: 'var(--bd-orange)' }}>
                Processing {processingCount} document{processingCount > 1 ? 's' : ''}…
              </span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="no-alerts" style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.05)' }}>
          {error}
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dropzone--active' : ''}`}
        id="records-dropzone"
        aria-label="Drop medical documents here or click to upload"
        tabIndex={0}
      >
        <input {...getInputProps()} aria-label="File upload input" />
        <div className="dropzone-icon" aria-hidden="true">📤</div>
        <div className="dropzone-text">
          {isDragActive ? (
            <h2 className="display-card" style={{ color: 'var(--bd-orange)' }}>DROP TO UPLOAD</h2>
          ) : (
            <>
              <h2 className="display-card">DRAG & DROP YOUR RECORDS</h2>
              <p className="body-small">or click to browse · PDF, JPEG, PNG, DICOM, CSV, HL7 FHIR</p>
            </>
          )}
        </div>
        <button className="btn-primary" type="button" id="records-browse-btn">Browse Files</button>
      </div>

      {/* Supported formats */}
      <div className="formats-strip">
        {Object.entries(FILE_TYPE_LABELS).map(([key, label]) => (
          <span key={key} className="badge">{label}</span>
        ))}
      </div>

      {/* Records list */}
      <div className="records-section">
        <div className="records-header">
          <span className="eyebrow">Document Timeline</span>
          <span className="body-small" style={{ color: 'var(--bd-muted)' }}>
            {documents.length} document{documents.length !== 1 ? 's' : ''} ·{' '}
            {documents.reduce((sum, d) => sum + (d.entityCount || 0), 0)} entities extracted
          </span>
        </div>

        <div className="records-list">
          {documents.length === 0 && (
            <div className="no-alerts body-small">
              No records uploaded yet. Add a PDF, image, CSV, or JSON file to build the medical brain from real data.
            </div>
          )}
          {documents.map((doc) => (
            <div key={doc.id} className="record-item feat-card" id={`record-${doc.id}`}>
              <div className="record-icon" role="img" aria-label={doc.documentType}>
                {DOC_TYPE_ICONS[doc.documentType] || '📄'}
              </div>
              <div className="record-info">
                <div className="record-type-row">
                  <span className="record-type">{doc.documentType}</span>
                  <span className={`badge badge-${doc.ingestionStatus === 'done' ? 'success' : doc.ingestionStatus === 'processing' ? 'warning' : doc.ingestionStatus === 'failed' ? 'danger' : ''}`}>
                    {doc.ingestionStatus}
                  </span>
                </div>
                <div className="record-meta-row">
                  <span className="body-small">{doc.sourceName}</span>
                  <span className="body-small" style={{ color: 'var(--bd-muted)' }}>{doc.documentDate}</span>
                </div>
                {doc.ingestionStatus === 'processing' && (
                  <div className="record-progress">
                    <div className="ml-bar-track">
                      <div className="ml-bar-fill orange record-progress-anim" style={{ width: '60%' }} />
                    </div>
                    <span className="body-small" style={{ color: 'var(--bd-orange)' }}>Extracting entities…</span>
                  </div>
                )}
                {doc.ingestionStatus === 'done' && doc.entityCount > 0 && (
                  <span className="body-small" style={{ color: 'var(--bd-muted)' }}>
                    {doc.entityCount} entities extracted · <span className="badge">{FILE_TYPE_LABELS[doc.fileType] || doc.fileType}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function toStoreDocument(doc: IngestDocument) {
  const ext = doc.filename?.split('.').pop()?.toLowerCase() || doc.file_type?.split('/').pop() || 'file'
  return {
    id: doc.task_id,
    fileType: ext,
    documentType: doc.document_type || 'Medical Document',
    sourceName: doc.filename || 'Uploaded file',
    documentDate: doc.created_at.split('T')[0],
    ingestionStatus: doc.status,
    entityCount: doc.entity_count,
    createdAt: doc.created_at,
  }
}
