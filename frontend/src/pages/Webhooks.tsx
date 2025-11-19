import { useState, useEffect } from 'react'
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook } from '../api'

const EVENTS = ['product.created', 'product.updated', 'import.completed']

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    url: '',
    events: ['product.created', 'product.updated'] as string[],
    enabled: true
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadWebhooks()
  }, [])

  const loadWebhooks = async () => {
    try {
      const res = await getWebhooks()
      setWebhooks(res.data)
    } catch (err) {
      console.error('Failed to load webhooks')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (form.url) {
        const res = await createWebhook(form)
        setWebhooks([...webhooks, res.data])
        setForm({ url: '', events: ['product.created', 'product.updated'], enabled: true })
        setShowForm(false)
      }
    } catch (err) {
      console.error('Failed to create webhook')
    }
    setLoading(false)
  }

  const handleEdit = (webhook: any) => {
    setForm({
      url: webhook.url,
      events: webhook.events || ['product.created', 'product.updated'],
      enabled: webhook.enabled
    })
    setShowForm(true)
  }

  const handleUpdate = async (id: number) => {
    setLoading(true)
    try {
      const res = await updateWebhook(id, form)
      setWebhooks(webhooks.map(w => w.id === id ? res.data : w))
      setShowForm(false)
    } catch (err) {
      console.error('Failed to update webhook')
    }
    setLoading(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this webhook?')) return
    try {
      await deleteWebhook(id)
      setWebhooks(webhooks.filter(w => w.id !== id))
    } catch (err) {
      if (err instanceof Error) {
        console.error('Failed to delete webhook:', err.message);
      } else {
        console.error('Failed to delete webhook', err);
      }
    }
  }

  const handleTest = async (id: number) => {
    try {
      const res = await testWebhook(id)
      alert(`Test successful! Status: ${res.data.status_code}, Time: ${res.data.response_time}ms`)
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'response' in err && typeof (err as any).response?.data?.detail === 'string') {
        alert(`Test failed: ${(err as any).response.data.detail}`);
      } else if (err instanceof Error) {
        alert(`Test failed: ${err.message}`);
      } else {
        alert('Test failed: Unknown error');
      }
    }
  }

  const toggleEnabled = async (id: number, enabled: boolean) => {
    try {
      const res = await updateWebhook(id, { ...webhooks.find(w => w.id === id), enabled })
      setWebhooks(webhooks.map(w => w.id === id ? res.data : w))
    } catch (err) {
      if (err instanceof Error) {
        console.error('Failed to toggle webhook:', err.message);
      } else {
        console.error('Failed to toggle webhook', err);
      }
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1>Webhook Configuration</h1>
      <p>Manage webhooks for product events. Add URLs that receive POST notifications.</p>

      <button className="primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 20 }}>
        {showForm ? 'Cancel' : 'Add New Webhook'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#f0f0f0', padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <input
            placeholder="Webhook URL (e.g., https://webhook.site/abc123)"
            value={form.url}
            onChange={e => setForm({ ...form, url: e.target.value })}
            style={{ width: '100%', padding: 12, fontSize: 16, marginBottom: 15 }}
            required
          />
          
          <div style={{ marginBottom: 15 }}>
            <h3>Select Events:</h3>
            {EVENTS.map(event => (
              <label key={event} style={{ display: 'block', marginBottom: 5 }}>
                <input
                  type="checkbox"
                  checked={form.events.includes(event)}
                  onChange={e => {
                    const newEvents = e.target.checked
                      ? [...form.events, event]
                      : form.events.filter(ev => ev !== event)
                    setForm({ ...form, events: newEvents })
                  }}
                />
                {event}
              </label>
            ))}
          </div>

          <label style={{ display: 'block', marginBottom: 15 }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => setForm({ ...form, enabled: e.target.checked })}
            />
            Enabled
          </label>

          <button type="submit" className="primary" disabled={!form.url || loading}>
            {loading ? 'Saving...' : 'Save Webhook'}
          </button>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>URL</th>
            <th>Events</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {webhooks.map(webhook => (
            <tr key={webhook.id}>
              <td>{webhook.url}</td>
              <td>
                {webhook.events?.map((e: string) => (
                  <span key={e} style={{ background: '#e3f2fd', padding: '2px 8px', borderRadius: 4, marginRight: 4, fontSize: 12 }}>
                    {e}
                  </span>
                )) || 'None'}
              </td>
              <td>
                <label>
                  <input
                    type="checkbox"
                    checked={webhook.enabled}
                    onChange={e => toggleEnabled(webhook.id, e.target.checked)}
                  />
                  {webhook.enabled ? 'Enabled' : 'Disabled'}
                </label>
              </td>
              <td>
                <button onClick={() => handleTest(webhook.id)} style={{ marginRight: 5 }}>Test</button>
                <button onClick={() => handleEdit(webhook)} style={{ marginRight: 5 }}>Edit</button>
                <button className="danger" onClick={() => handleDelete(webhook.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {webhooks.length === 0 && <p style={{ textAlign: 'center', color: '#666' }}>No webhooks configured. Add one to start receiving events!</p>}
    </div>
  )
}