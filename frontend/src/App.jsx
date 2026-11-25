
import { useState } from 'react'
import './App.css'

function App() {
  const [page, setPage] = useState('Dashboard')
  const [prompts, setPrompts] = useState([])
  const [name, setName] = useState('')
  const [content, setContent] = useState('')

  function createPrompt(e) {
    e.preventDefault()

    if (!name.trim() || !content.trim()) {
      alert('Please enter prompt name and content')
      return
    }

    setPrompts([
      ...prompts,
      {
        id: Date.now(),
        name,
        content,
        version: 1
      }
    ])

    setName('')
    setContent('')
    alert('Prompt created successfully!')
  }

  const menu = [
    'Dashboard',
    'Prompt Management',
    'Test Cases',
    'Test Execution',
    'Results & Reports'
  ]

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>⚡ Nexa-Tech</h2>
        <p className="menu-title">WORKSPACE</p>

        <nav>
          {menu.map(item => (
            <a
              key={item}
              className={page === item ? 'active' : ''}
              onClick={() => setPage(item)}
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <p>Prompt Regression Testing Lab</p>
          <small>Version 1.0</small>
        </div>
      </aside>

      <main className="main">
        <header>
          <div>
            <h1>{page}</h1>
            <p>Welcome to Nexa-Tech</p>
          </div>
        </header>

        {page === 'Dashboard' && (
          <>
            <section className="welcome">
              <h2>AI Prompt Testing Platform</h2>
              <p>
                Test, evaluate and compare AI prompt versions.
                Detect regressions before deployment.
              </p>
            </section>

            <section className="stats">
              <div className="stat-card">
                <p>Total Prompts</p>
                <h2>{prompts.length}</h2>
              </div>
              <div className="stat-card">
                <p>Test Cases</p>
                <h2>0</h2>
              </div>
              <div className="stat-card">
                <p>Average Score</p>
                <h2>--</h2>
              </div>
              <div className="stat-card">
                <p>Regressions</p>
                <h2>0</h2>
              </div>
            </section>
          </>
        )}

        {page === 'Prompt Management' && (
          <section className="content-card">
            <h2>Create New Prompt</h2>
            <p>Write and manage your AI prompt versions.</p>

            <form onSubmit={createPrompt}>
              <label>Prompt Name</label>
              <input
                type="text"
                placeholder="Example: Customer Support Bot"
                value={name}
                onChange={e => setName(e.target.value)}
              />

              <label>Prompt Instructions</label>
              <textarea
                placeholder="Enter your AI prompt here..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows="7"
              />

              <button type="submit">Save Prompt</button>
            </form>

            <h2 className="saved-title">Saved Prompts</h2>

            {prompts.length === 0 ? (
              <p>No prompts created yet.</p>
            ) : (
              prompts.map(prompt => (
                <div className="prompt-item" key={prompt.id}>
                  <h3>{prompt.name}</h3>
                  <small>Version {prompt.version}</small>
                  <p>{prompt.content}</p>
                </div>
              ))
            )}
          </section>
        )}

        {page !== 'Dashboard' &&
          page !== 'Prompt Management' && (
            <section className="content-card">
              <h2>{page}</h2>
              <p>This module will be developed in the next steps.</p>
            </section>
          )}
      </main>
    </div>
  )
}

export default App
