import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Signup from './components/Signup'
import Home from './components/Home'

function App() {
  const isAuthenticated = !!localStorage.getItem('token')
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={isAuthenticated ? <Home /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
