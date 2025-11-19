import { useState, useEffect } from 'react'
import { uploadCSV, getTaskStatus } from '../api'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState('')

  const handleUpload = async () => {
    if (!file) return
    try {
      const res = await uploadCSV(file)
      setTaskId(res.data.task_id)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed')
    }
  }

  useEffect(() => {
    if (!taskId) return
    const interval = setInterval(async () => {
      try {
        const res = await getTaskStatus(taskId)
        setStatus(res.data)
        if (res.data.state === 'SUCCESS' || res.data.state === 'FAILURE') {
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [taskId])

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1>Upload Product CSV (up to 500,000 rows)</h1>
      <input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} />
      <br /><br />
      <button className="primary" onClick={handleUpload} disabled={!file || !!taskId}>
        Upload & Import
      </button>

      {taskId && status && (() => {
        let percent = 0;
        if (status.state === 'SUCCESS') {
          percent = 100;
        } else if (typeof status.progress === 'number') {
          percent = status.progress;
        }
        return (
          <div style={{ marginTop: 30 }}>
            <h3>Status: {status.state}</h3>
            {status.progress !== undefined && (
              <>
                <progress value={percent} max="100" />
                <p>{percent}% – {status.current || 0} / {status.total || '?'} rows</p>
              </>
            )}
            {status.state === 'SUCCESS' && <div className="alert success">Import completed!</div>}
          </div>
        );
      })()}


      {error && <div className="alert error">{error}</div>}
    </div>
  )
}