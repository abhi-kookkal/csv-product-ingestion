import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import Products from './pages/Products'
import Webhooks from './pages/Webhooks'

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <div className="container">
          <NavLink to="/">Upload CSV</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/webhooks">Webhooks</NavLink>
        </div>
      </nav>

      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/webhooks" element={<Webhooks />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}