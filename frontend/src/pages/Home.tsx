import { useState, useEffect } from 'react'
import { uploadCSV, getTaskStatus } from '../api'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importProgress, setImportProgress] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'importing' | 'complete' | 'failed'>('idle')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleUpload = async () => {
    if (!file) return

    setPhase('uploading')
    setUploadProgress(0)
    setImportProgress(0)
    setError('')

    try {
      const res = await uploadCSV(file, (e) => {
        if (e.total) {
          const percent = Math.round((e.loaded * 100) / e.total)
          setUploadProgress(percent)
        }
      })

      setTaskId(res.data.task_id)
      setPhase('importing') // ← Switch to importing phase
      setUploadProgress(100) // ← Force upload to 100%
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed')
      setPhase('failed')
    }
  }

  // Poll import progress
  useEffect(() => {
    if (!taskId || phase !== 'importing') return

    const interval = setInterval(async () => {
      try {
        const res = await getTaskStatus(taskId)
        const data = res.data

        if (data.state === 'PROGRESS') {
          const progress = data.progress ?? 0
          setImportProgress(progress)
        }

        if (data.state === 'SUCCESS') {
          setImportProgress(100)
          setPhase('complete')
          clearInterval(interval)
        }

        if (data.state === 'FAILURE') {
          setPhase('failed')
          clearInterval(interval)
        }
      } catch {
        setError('Lost connection to server')
        setPhase('failed')
        clearInterval(interval)
      }
    }, 800)

    return () => clearInterval(interval)
  }, [taskId, phase])

  // Determine current progress (0–100 for current phase)
  const currentProgress = phase === 'uploading' ? uploadProgress :
    phase === 'importing' ? importProgress :
      phase === 'complete' ? 100 : 0

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Upload Product CSV</h1>
      <p style={{ color: '#555' }}>
        Up to <strong>500,000 products</strong> • Clear 3-phase progress
      </p>

      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        disabled={phase === 'uploading' || phase === 'importing'}
        style={{ display: 'block', width: '100%', padding: 16, fontSize: 16, margin: '20px 0' }}
      />

      <button
        onClick={handleUpload}
        disabled={!file || phase === 'uploading' || phase === 'importing'}
        style={{
          padding: '16px 40px',
          fontSize: 18,
          background: '#27ae60',
          color: 'white',
          border: 'none',
          borderRadius: 12,
          cursor: 'pointer',
          opacity: (!file || phase !== 'idle') ? 0.6 : 1
        }}
      >
        {phase === 'idle' && 'Upload & Import'}
        {phase === 'uploading' && 'Uploading...'}
        {phase === 'importing' && 'Importing...'}
        {phase === 'complete' && 'Complete!'}
      </button>

      {/* 3-PHASE PROGRESS DISPLAY */}
      {(phase === 'uploading' || phase === 'importing' || phase === 'complete' || phase === 'failed') && (
        <div style={{ marginTop: 40, padding: 32, background: '#f9f9f9', borderRadius: 16, border: '1px solid #ddd' }}>
          {/* PHASE 1: UPLOAD */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>1. File Upload</strong>
              <span>{uploadProgress}%</span>
            </div>
            <div style={{ height: 12, background: '#e0e0e0', borderRadius: 6, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: '#3498db',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>

          {/* PHASE 2: IMPORTING */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>2. Importing Products</strong>
              <span>{importProgress}%</span>
            </div>
            <div style={{ height: 12, background: '#e0e0e0', borderRadius: 6, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${importProgress}%`,
                  height: '100%',
                  background: '#27ae60',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>

          {/* PHASE 3: COMPLETE */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>3. Status</strong>
              {phase === 'complete' && (
                <span style={{
                  padding: '4px 14px',
                  borderRadius: '16px',
                  background: '#27ae60',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 15
                }}>
                  Complete
                </span>
              )}
              {phase === 'failed' && (
                <span style={{
                  padding: '4px 14px',
                  borderRadius: '16px',
                  background: '#e74c3c',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 15
                }}>
                  Failed
                </span>
              )}
              {phase === 'importing' && (
                <span style={{
                  padding: '4px 14px',
                  borderRadius: '16px',
                  background: '#3498db',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 15
                }}>
                  In Progress...
                </span>
              )}
            </div>
          </div>

          {/* Final Message */}
          {phase === 'complete' && (
            <div style={{ marginTop: 24, padding: 16, background: '#d4edda', borderRadius: 12, color: '#155724', textAlign: 'center', fontWeight: 'bold' }}>
              All products imported successfully!
            </div>
          )}
          {phase === 'failed' && (
            <div style={{ marginTop: 24, padding: 16, background: '#f8d7da', borderRadius: 12, color: '#721c24', textAlign: 'center', fontWeight: 'bold' }}>
              Import failed: {error || 'Unknown error'}
            </div>
          )}
        </div>
      )}

      {error && phase === 'idle' && (
        <div style={{ marginTop: 20, color: 'red', fontWeight: 'bold' }}>{error}</div>
      )}
    </div>
  )
}