import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  return (
    <div style={{textAlign: "center", marginTop: "100px"}}>
      <h1>ArtAround</h1>

      <p>
        Visita i musei in modo personalizzato e scopri le opere
        con spiegazioni adattate ai tuoi interessi.
      </p>

      <div style={{marginTop: "30px"}}>
        <button style={{marginRight: "10px"}}>
          Inizia la visita
        </button>

        <button>
          Login
        </button>
      </div>
    </div>
  )
}

export default App