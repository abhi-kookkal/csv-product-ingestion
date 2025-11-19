import { useState, useEffect } from 'react'
import { getProducts, deleteAllProducts } from '../api'

export default function Products() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadProducts = async () => {
    const res = await getProducts()
    setProducts(res.data)
    setLoading(false)
  }

  const handleDeleteAll = async () => {
    if (!confirm('Delete ALL products? This cannot be undone!')) return
    await deleteAllProducts()
    setProducts([])
  }

  useEffect(() => {
    loadProducts()
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Products ({products.length})</h1>
        <button className="danger" onClick={handleDeleteAll}>
          Delete All Products
        </button>
      </div>

      {loading ? <p>Loading...</p> : (
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
      )}
    </div>
  )
}