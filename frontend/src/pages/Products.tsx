import { useState, useEffect } from 'react'
import { getProducts, deleteAllProducts } from '../api'

export default function Products() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  // Track the maximum totalCount seen so far
  const [maxTotalCount, setMaxTotalCount] = useState(0)

  const loadProducts = async (pageNum = page, size = pageSize) => {
    setLoading(true)
    const skip = (pageNum - 1) * size
    const res = await getProducts({ skip, limit: size })
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
    setProducts(productList)
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

  useEffect(() => {
    loadProducts(page, pageSize)
    // eslint-disable-next-line
  }, [page, pageSize])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)
  // Only enable Next if we have a full page of products
  const canGoNext = products.length === pageSize && page < totalPages

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1>Products</h1>
        <button className="danger" onClick={handleDeleteAll}>
          Delete All Products
        </button>
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>SKU</th>
                <th>Name</th>
                <th>Description</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td>{p.description || '-'}</td>
                  <td>{p.is_active ? 'Yes' : 'No'}</td>
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