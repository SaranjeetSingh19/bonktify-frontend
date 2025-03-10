import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup() {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`${apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.message || "Signup failed")
      } else {
        navigate("/login")
      }
    } catch (err) {
      console.error(err)
      setError("Signup failed")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md p-8 border border-zinc-800 rounded-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Sign Up</h1>
        {error && <div className="mb-4 text-red-500">{error}</div>}
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full py-3 bg-white text-black rounded hover:bg-gray-200">
            Sign Up
          </button>
        </form>
        <p className="mt-4 text-center">
          Already have an account? <Link to="/login" className="text-blue-500">Login</Link>
        </p>
      </div>
    </div>
  )
}
