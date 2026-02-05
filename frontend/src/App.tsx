import { useState, useEffect } from 'react'
import { healthCheck } from './services/api'
import './App.css'

function App() {
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    healthCheck()
      .then(data => setHealth(data))
      .catch(err => console.error(err))
  }, [])

  return (
    <div>
      <h1>Hotak AI</h1>
      <p>API Health: {health ? JSON.stringify(health) : 'Loading...'}</p>
    </div>
  )
}

export default App
