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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 0' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8, color: '#2c3e50', letterSpacing: 1 }}>Webhook Configuration</h1>
      <p style={{ textAlign: 'center', marginBottom: 28, color: '#555' }}>
        Manage webhooks for product events. Add URLs that receive POST notifications.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <button
          className="primary"
          onClick={() => setShowForm(!showForm)}
          style={{ minWidth: 180, fontSize: 17, borderRadius: 8, boxShadow: '0 2px 8px #0001', background: showForm ? '#e74c3c' : '#3498db', transition: 'background 0.2s', color: 'white' }}
        >
          {showForm ? 'Cancel' : 'Add New Webhook'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'white',
            padding: 28,
            borderRadius: 16,
            marginBottom: 32,
            boxShadow: '0 2px 18px #0002',
            maxWidth: 540,
            marginLeft: 'auto',
            marginRight: 'auto',
            border: '1px solid #e0e0e0'
          }}
        >
          <input
            placeholder="Webhook URL (e.g., https://webhook.site/abc123)"
            value={form.url}
            onChange={e => setForm({ ...form, url: e.target.value })}
            style={{ width: '100%', padding: 14, fontSize: 17, marginBottom: 20, borderRadius: 8, border: '1px solid #ccc' }}
            required
          />

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 7, color: '#2c3e50' }}>Select Events:</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {EVENTS.map(event => (
                <label key={event} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, background: '#f8f9fa', padding: '6px 14px', borderRadius: 8, border: '1px solid #e0e0e0' }}>
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
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 15 }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => setForm({ ...form, enabled: e.target.checked })}
            />
            <span style={{ color: form.enabled ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>
              {form.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>

          <button
            type="submit"
            className="primary"
            disabled={!form.url || loading}
            style={{
              width: '100%',
              padding: '12px 0',
              fontSize: 17,
              borderRadius: 8,
              background: '#27ae60',
              color: 'white',
              fontWeight: 600,
              boxShadow: '0 1px 4px #0001',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: !form.url || loading ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Saving...' : 'Save Webhook'}
          </button>
        </form>
      )}

      <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 18px #0002', padding: 0, border: '1px solid #e0e0e0', maxWidth: 1000, margin: '0 auto 32px auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', color: '#2c3e50', fontWeight: 700 }}>
              <th style={{ padding: '16px 12px', borderTopLeftRadius: 16 }}>URL</th>
              <th style={{ padding: '16px 12px' }}>Events</th>
              <th style={{ padding: '16px 12px' }}>Status</th>
              <th style={{ padding: '16px 12px', borderTopRightRadius: 16 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map(webhook => (
              <tr key={webhook.id} style={{ background: '#fff', borderBottom: '1px solid #eee', transition: 'background 0.2s', cursor: 'pointer' }}
                onMouseOver={e => (e.currentTarget.style.background = '#f3f7fb')}
                onMouseOut={e => (e.currentTarget.style.background = '#fff')}
              >
                <td style={{ padding: '14px 12px', fontSize: 15, wordBreak: 'break-all' }}>{webhook.url}</td>
                <td style={{ padding: '14px 12px' }}>
                  {webhook.events?.map((e: string) => (
                    <span key={e} style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: 6, marginRight: 6, fontSize: 13, fontWeight: 500 }}>
                      {e}
                    </span>
                  )) || 'None'}
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{
                    display: 'inline-block',
                    minWidth: 80,
                    padding: '5px 0',
                    borderRadius: 12,
                    background: webhook.enabled ? '#eafaf1' : '#fbeaea',
                    color: webhook.enabled ? '#27ae60' : '#e74c3c',
                    fontWeight: 700,
                    textAlign: 'center',
                    fontSize: 14,
                    border: webhook.enabled ? '1px solid #b7e4cc' : '1px solid #f5c6cb',
                    marginRight: 8
                  }}>
                    {webhook.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <input
                    type="checkbox"
                    checked={webhook.enabled}
                    onChange={e => toggleEnabled(webhook.id, e.target.checked)}
                    style={{ marginLeft: 4, transform: 'scale(1.2)' }}
                  />
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => handleTest(webhook.id)}
                      style={{ background: '#2980b9', color: 'white', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#1565c0')}
                      onMouseOut={e => (e.currentTarget.style.background = '#2980b9')}
                    >Test</button>
                    <button
                      onClick={() => handleEdit(webhook)}
                      style={{ background: '#f1c40f', color: '#2c3e50', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#f39c12')}
                      onMouseOut={e => (e.currentTarget.style.background = '#f1c40f')}
                    >Edit</button>
                    <button
                      className="danger"
                      onClick={() => handleDelete(webhook.id)}
                      style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#c0392b')}
                      onMouseOut={e => (e.currentTarget.style.background = '#e74c3c')}
                    >Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {webhooks.length === 0 && <p style={{ textAlign: 'center', color: '#666', padding: 32, fontSize: 16 }}>No webhooks configured. Add one to start receiving events!</p>}
      </div>
    </div>
  )
}