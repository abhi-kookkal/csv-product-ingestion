import { useState, useEffect } from 'react'
import { getProducts, deleteAllProducts, createProduct, updateProduct, deleteProduct } from '../api'

export default function Products() {
  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  // Helper to show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }
  // Filter states
  const [skuFilter, setSkuFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [descFilter, setDescFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  // Track the maximum totalCount seen so far
  const [maxTotalCount, setMaxTotalCount] = useState(0)

  const loadProducts = async (pageNum = page, size = pageSize) => {
    // Prepare filter params
    const params: any = { skip: (pageNum - 1) * size, limit: size }
    if (skuFilter) params.sku = skuFilter
    if (activeFilter === 'true') params.active = true
    if (activeFilter === 'false') params.active = false
    setLoading(true)
    const skip = (pageNum - 1) * size
    const res = await getProducts(params)
    let total = res.data.total ?? res.data.count
    const productList = res.data.data || res.data.results || res.data
    if (typeof total !== 'number') {
      if (Array.isArray(productList) && productList.length === size) {
        // Only increase, never decrease
        total = Math.max(maxTotalCount, skip + productList.length + 1)
      } else {
        // Last page
        total = skip + productList.length
      }
    }
    // Client-side filter for name/description
    let filtered = productList
    if (nameFilter) {
      filtered = filtered.filter((p: any) => p.name?.toLowerCase().includes(nameFilter.toLowerCase()))
    }
    if (descFilter) {
      filtered = filtered.filter((p: any) => p.description?.toLowerCase().includes(descFilter.toLowerCase()))
    }
    setProducts(filtered)
    setTotalCount(total)
    setMaxTotalCount(prev => Math.max(prev, total))
    setLoading(false)
  }

  const handleDeleteAll = async () => {
    if (!confirm('Delete ALL products? This cannot be undone!')) return
    await deleteAllProducts()
    setProducts([])
    setTotalCount(0)
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [skuFilter, nameFilter, descFilter, activeFilter])

  useEffect(() => {
    loadProducts(page, pageSize)
    // eslint-disable-next-line
  }, [page, pageSize, skuFilter, nameFilter, descFilter, activeFilter])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Only enable Next if we have a full page of products
  const canGoNext = products.length === pageSize && page < totalPages

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create'|'edit'>('create')
  const [modalProduct, setModalProduct] = useState<any>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string|null>(null)

  // Open modal for create
  const openCreateModal = () => {
    setModalProduct({ sku: '', name: '', description: '', is_active: true })
    setModalMode('create')
    setModalError(null)
    setModalOpen(true)
  }
  // Open modal for edit
  const openEditModal = (product: any) => {
    setModalProduct({ ...product })
    setModalMode('edit')
    setModalError(null)
    setModalOpen(true)
  }
  // Handle modal form submit
  const handleModalSubmit = async (e: any) => {
    e.preventDefault()
    setModalLoading(true)
    setModalError(null)
    try {
      if (modalMode === 'create') {
        await createProduct(modalProduct)
        showNotification('success', 'Product created successfully!')
      } else {
        await updateProduct(modalProduct.id, modalProduct)
        showNotification('success', 'Product updated successfully!')
      }
      setModalOpen(false)
      loadProducts(1, pageSize)
      setPage(1)
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to save product')
      showNotification('error', err.response?.data?.detail || 'Failed to save product')
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <div>
      {/* NOTIFICATION */}
      {notification && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 2000,
          background: notification.type === 'success' ? '#27ae60' : '#e74c3c',
          color: 'white', padding: '16px 32px', borderRadius: 8, fontWeight: 600,
          boxShadow: '0 4px 24px #0003', minWidth: 220, textAlign: 'center', fontSize: 16
        }}>
          {notification.message}
        </div>
      )}

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 18, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontWeight: 500 }}>SKU<br />
            <input value={skuFilter} onChange={e => setSkuFilter(e.target.value)} style={{ width: 120, padding: 6, borderRadius: 4, border: '1px solid #ccc' }} placeholder="SKU" />
          </label>
        </div>
        <div>
          <label style={{ fontWeight: 500 }}>Name<br />
            <input value={nameFilter} onChange={e => setNameFilter(e.target.value)} style={{ width: 140, padding: 6, borderRadius: 4, border: '1px solid #ccc' }} placeholder="Name" />
          </label>
        </div>
        <div>
          <label style={{ fontWeight: 500 }}>Description<br />
            <input value={descFilter} onChange={e => setDescFilter(e.target.value)} style={{ width: 140, padding: 6, borderRadius: 4, border: '1px solid #ccc' }} placeholder="Description" />
          </label>
        </div>
        <div>
          <label style={{ fontWeight: 500 }}>Active<br />
            <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)} style={{ width: 100, padding: 6, borderRadius: 4, border: '1px solid #ccc' }}>
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
        </div>
        <button onClick={() => { setSkuFilter(''); setNameFilter(''); setDescFilter(''); setActiveFilter('all'); }} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #ccc', background: '#eee', fontWeight: 500, marginLeft: 10 }}>Clear Filters</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1>Products</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={openCreateModal} style={{ background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' }}>Add Product</button>
          <button className="danger" onClick={handleDeleteAll}>
            Delete All Products
          </button>
        </div>
      </div>

      {/* MODAL FORM */}
      {modalOpen && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, minWidth: 340, boxShadow: '0 8px 32px #0002', position: 'relative' }}>
            <h2 style={{ marginTop: 0 }}>{modalMode === 'create' ? 'Add New Product' : 'Edit Product'}</h2>
            <form onSubmit={handleModalSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 500 }}>SKU<br />
                  <input value={modalProduct.sku} onChange={e => setModalProduct((p: any) => ({ ...p, sku: e.target.value }))} required disabled={modalMode==='edit'} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
                </label>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 500 }}>Name<br />
                  <input value={modalProduct.name} onChange={e => setModalProduct((p: any) => ({ ...p, name: e.target.value }))} required style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
                </label>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 500 }}>Description<br />
                  <input value={modalProduct.description} onChange={e => setModalProduct((p: any) => ({ ...p, description: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
                </label>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 500 }}>
                  <input type="checkbox" checked={modalProduct.is_active} onChange={e => setModalProduct((p: any) => ({ ...p, is_active: e.target.checked }))} /> Active
                </label>
              </div>
              {modalError && <div style={{ color: 'red', marginBottom: 10 }}>{modalError}</div>}
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="submit" disabled={modalLoading} style={{ background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, padding: '8px 22px', fontWeight: 600, cursor: modalLoading ? 'not-allowed' : 'pointer', opacity: modalLoading ? 0.7 : 1 }}>{modalLoading ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setModalOpen(false)} style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 6, padding: '8px 22px', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <p>Loading...</p> : (
        <>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 2px 18px #0002',
            overflow: 'hidden',
            marginBottom: 24,
            border: '1px solid #e0e0e0'
          }}>
            <thead>
              <tr style={{ background: '#f8f9fa', color: '#2c3e50', fontWeight: 700 }}>
                <th style={{ padding: '16px 12px' }}>ID</th>
                <th style={{ padding: '16px 12px' }}>SKU</th>
                <th style={{ padding: '16px 12px' }}>Name</th>
                <th style={{ padding: '16px 12px' }}>Description</th>
                <th style={{ padding: '16px 12px' }}>Active</th>
                <th style={{ padding: '16px 12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{
                  background: '#fff',
                  borderBottom: '1px solid #eee',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f3f7fb')}
                  onMouseOut={e => (e.currentTarget.style.background = '#fff')}
                >
                  <td style={{ padding: '14px 12px', fontSize: 15 }}>{p.id}</td>
                  <td style={{ padding: '14px 12px', fontSize: 15 }}>{p.sku}</td>
                  <td style={{ padding: '14px 12px', fontSize: 15 }}>{p.name}</td>
                  <td style={{ padding: '14px 12px', fontSize: 15 }}>{p.description || '-'}</td>
                  <td style={{ padding: '14px 12px', fontSize: 15 }}>{p.is_active ? 'Yes' : 'No'}</td>
                  <td style={{ padding: '14px 12px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <button
                        onClick={() => openEditModal(p)}
                        style={{
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 20px',
                          fontWeight: 600,
                          fontSize: 15,
                          boxShadow: '0 2px 8px #0001',
                          cursor: 'pointer',
                          transition: 'background 0.18s, box-shadow 0.18s',
                          outline: 'none',
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = '#1d4ed8')}
                        onMouseOut={e => (e.currentTarget.style.background = '#2563eb')}
                        onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 2px #2563eb44')}
                        onBlur={e => (e.currentTarget.style.boxShadow = '0 2px 8px #0001')}
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Delete this product?')) {
                            try {
                              await deleteProduct(p.id)
                              showNotification('success', 'Product deleted successfully!')
                              // Adjust page if last item deleted
                              if (products.length === 1 && page > 1) {
                                setPage(page - 1)
                              } else {
                                loadProducts(page, pageSize)
                              }
                            } catch (err: any) {
                              showNotification('error', err.response?.data?.detail || 'Failed to delete product')
                            }
                          }
                        }}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 20px',
                          fontWeight: 600,
                          fontSize: 15,
                          boxShadow: '0 2px 8px #0001',
                          cursor: 'pointer',
                          transition: 'background 0.18s, box-shadow 0.18s',
                          outline: 'none',
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = '#dc2626')}
                        onMouseOut={e => (e.currentTarget.style.background = '#ef4444')}
                        onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 2px #ef444444')}
                        onBlur={e => (e.currentTarget.style.boxShadow = '0 2px 8px #0001')}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 16 }}>
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ccc', background: page === 1 ? '#eee' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <span style={{ fontWeight: 500, fontSize: 16 }}>
              Page {page}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!canGoNext}
              style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ccc', background: !canGoNext ? '#eee' : '#fff', cursor: !canGoNext ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
            <span style={{ marginLeft: 16 }}>
              Show
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                style={{ margin: '0 8px', padding: '4px 8px', borderRadius: 4 }}
              >
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              per page
            </span>
          </div>
        </>
      )}
    </div>
  )
}