import { useEffect, useMemo, useState } from 'react'
import './App.css'
import TestCases from './TestCases'
import TestExecution from './TestExecution'

const API_URL = 'http://localhost:5000/api'

const MENU = [
  'Dashboard',
  'Prompt Management',
  'Test Cases',
  'Test Execution',
  'Results & Reports',
]

// Dashboard component
function Dashboard({ prompts, totalVersions, setPage }) {
  return (
    <>
      <section className="welcome">
        <div>
          <span className="welcome-label">WELCOME TO NEXA-TECH</span>
          <h2>AI Prompt Testing Platform</h2>
          <p>
            Test, evaluate and compare AI prompt versions.
            Detect regressions before deployment.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setPage('Prompt Management')}
        >
          + Create Prompt
        </button>
      </section>

      <section className="stats">
        <div className="stat-card">
          <span>Total Prompts</span>
          <h2>{prompts.length}</h2>
        </div>

        <div className="stat-card">
          <span>Prompt Versions</span>
          <h2>{totalVersions}</h2>
        </div>

        <div className="stat-card">
          <span>Test Cases</span>
          <h2>0</h2>
        </div>

        <div className="stat-card">
          <span>Regressions</span>
          <h2>0</h2>
        </div>
      </section>

      <section className="content-card">
        <h2>Getting Started</h2>
        <p>Follow these steps to test your AI prompts.</p>

        <div className="steps">
          <div className="step">
            <span>01</span>
            <div>
              <h3>Create a prompt</h3>
              <p>Write your AI instructions.</p>
            </div>
          </div>

          <div className="step">
            <span>02</span>
            <div>
              <h3>Add test cases</h3>
              <p>Prepare inputs to evaluate your prompt.</p>
            </div>
          </div>

          <div className="step">
            <span>03</span>
            <div>
              <h3>Execute tests</h3>
              <p>Generate AI responses and evaluate them.</p>
            </div>
          </div>

          <div className="step">
            <span>04</span>
            <div>
              <h3>Detect regressions</h3>
              <p>Compare prompt versions and their scores.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

// Prompt Management component
function PromptManagement({
  selectedPrompt,
  name,
  setName,
  content,
  setContent,
  createPrompt,
  resetForm,
  message,
  search,
  setSearch,
  filteredPrompts,
  loadPrompt,
  deletePrompt,
  isSaving,
}) {
  return (
    <>
      <section className="content-card">
        <h2>
          {selectedPrompt
            ? 'Create New Prompt Version'
            : 'Create New Prompt'}
        </h2>

        <p>
          Create a prompt or use an existing name to add a new version.
        </p>

        <form onSubmit={createPrompt}>
          <label htmlFor="prompt-name">Prompt Name</label>

          <input
            id="prompt-name"
            type="text"
            placeholder="Example: Customer Support Bot"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label htmlFor="prompt-content">Prompt Instructions</label>

          <textarea
            id="prompt-content"
            placeholder="Enter your AI prompt instructions here..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={7}
            required
          />

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={isSaving}
            >
              {isSaving
                ? 'Saving...'
                : selectedPrompt
                  ? 'Save New Version'
                  : 'Save Prompt'}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
              disabled={isSaving}
            >
              Clear
            </button>
          </div>
        </form>

        {message && (
          <p className="feedback-message" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="content-card">
        <div className="section-heading">
          <div>
            <h2>Saved Prompts</h2>
            <p>Manage your prompts and their versions.</p>
          </div>

          <input
            className="search-input"
            type="search"
            placeholder="Search prompts..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search prompts"
          />
        </div>

        {filteredPrompts.length === 0 ? (
          <div className="empty-state">
            <h3>No prompts found</h3>
            <p>Create your first prompt using the form above.</p>
          </div>
        ) : (
          <div className="prompt-list">
            {filteredPrompts.map((prompt) => (
              <article className="prompt-item" key={prompt.id}>
                <div className="prompt-heading">
                  <div>
                    <h3>{prompt.name}</h3>
                    <span className="version-badge">
                      {prompt.versions.length} version(s)
                    </span>
                  </div>

                  <div className="prompt-actions">
                    <button
                      className="secondary-button"
                      onClick={() => loadPrompt(prompt)}
                    >
                      + New Version
                    </button>

                    <button
                      className="delete-button"
                      onClick={() => deletePrompt(prompt.id)}
                      aria-label={`Delete ${prompt.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {prompt.versions.map((version) => (
                  <div className="version-item" key={version.version}>
                    <h4>Version {version.version}</h4>
                    <p>{version.content}</p>
                    <small>Created: {version.createdAt}</small>
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

// Main App component
function App() {
  const [page, setPage] = useState('Dashboard')
  const [apiStatus, setApiStatus] = useState('connecting')

  const [prompts, setPrompts] = useState([])
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [search, setSearch] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Load prompts from PostgreSQL through the backend
  async function fetchPrompts() {
    const response = await fetch(`${API_URL}/prompts`)

    if (!response.ok) {
      throw new Error('Could not load prompts')
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || 'Could not load prompts')
    }

    setPrompts(data.prompts || [])
  }

  // Check backend and load saved prompts
  useEffect(() => {
    const controller = new AbortController()

    async function initializeApp() {
      try {
        const healthResponse = await fetch(`${API_URL}/health`, {
          signal: controller.signal,
        })

        if (!healthResponse.ok) {
          throw new Error('Backend is not responding')
        }

        const healthData = await healthResponse.json()

        if (!healthData.success) {
          throw new Error('Backend health check failed')
        }

        setApiStatus('connected')

        const promptResponse = await fetch(`${API_URL}/prompts`, {
          signal: controller.signal,
        })

        if (!promptResponse.ok) {
          throw new Error('Could not load saved prompts')
        }

        const promptData = await promptResponse.json()

        if (!promptData.success) {
          throw new Error('Could not load saved prompts')
        }

        setPrompts(promptData.prompts || [])
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Initialization error:', error)
          setApiStatus('error')
          setMessage('Unable to connect to the backend or load prompts.')
        }
      }
    }

    initializeApp()

    return () => controller.abort()
  }, [])

  // Filter prompts
  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) =>
      prompt.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [prompts, search])

  // Total number of prompt versions
  const totalVersions = prompts.reduce(
    (total, prompt) => total + prompt.versions.length,
    0
  )

  // Create a prompt or add a new version through the API
  async function createPrompt(event) {
    event.preventDefault()

    if (!name.trim() || !content.trim()) {
      setMessage('Please enter both prompt name and instructions.')
      return
    }

    setIsSaving(true)
    setMessage('')

    try {
      const existingPrompt = prompts.find(
        (prompt) =>
          prompt.name.toLowerCase() === name.trim().toLowerCase()
      )

      let response

      if (existingPrompt) {
        response = await fetch(
          `${API_URL}/prompts/${existingPrompt.id}/versions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: content.trim(),
            }),
          }
        )
      } else {
        response = await fetch(`${API_URL}/prompts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            content: content.trim(),
          }),
        })
      }

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save prompt')
      }

      await fetchPrompts()

      setMessage(
        existingPrompt
          ? 'New prompt version saved successfully!'
          : 'Prompt created successfully!'
      )

      setName('')
      setContent('')
      setSelectedPrompt(null)
    } catch (error) {
      console.error('Save prompt error:', error)
      setMessage(error.message || 'Failed to save prompt. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Load a previous prompt into the editor
  function loadPrompt(prompt) {
    setName(prompt.name)
    setContent(prompt.versions[prompt.versions.length - 1].content)
    setSelectedPrompt(prompt.id)
    setMessage('Edit the content and save to create a new version.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Delete a prompt from PostgreSQL
  async function deletePrompt(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this prompt?'
    )

    if (!confirmed) return

    try {
      const response = await fetch(`${API_URL}/prompts/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete prompt')
      }

      await fetchPrompts()

      if (selectedPrompt === id) {
        setSelectedPrompt(null)
        setName('')
        setContent('')
      }

      setMessage('Prompt deleted successfully.')
    } catch (error) {
      console.error('Delete prompt error:', error)
      setMessage(error.message || 'Failed to delete prompt.')
    }
  }

  // Reset form
  function resetForm() {
    setName('')
    setContent('')
    setSelectedPrompt(null)
    setMessage('')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="brand">⚡ Nexa-Tech</h2>

        <p className="menu-title">WORKSPACE</p>

        <nav>
          {MENU.map((item) => (
            <button
              key={item}
              className={`nav-link ${page === item ? 'active' : ''}`}
              onClick={() => setPage(item)}
            >
              {item === 'Dashboard' && '▦'}
              {item === 'Prompt Management' && '✎'}
              {item === 'Test Cases' && '☷'}
              {item === 'Test Execution' && '▶'}
              {item === 'Results & Reports' && '▥'}
              <span>{item}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <p>Prompt Regression Testing Lab</p>
          <small>Version 1.0</small>
        </div>
      </aside>

      <main className="main">
        <header className="top-header">
          <div>
            <h1>{page}</h1>
            <p>Manage and evaluate your AI prompts.</p>
          </div>

          <div className="connection-status">
            <span
              className={`status-dot ${
                apiStatus === 'connected' ? 'online' : 'offline'
              }`}
            />

            {apiStatus === 'connected'
              ? 'Backend Connected'
              : apiStatus === 'connecting'
                ? 'Connecting...'
                : 'Backend Disconnected'}
          </div>
        </header>

        {page === 'Dashboard' && (
          <Dashboard
            prompts={prompts}
            totalVersions={totalVersions}
            setPage={setPage}
          />
        )}

        {page === 'Prompt Management' && (
          <PromptManagement
            selectedPrompt={selectedPrompt}
            name={name}
            setName={setName}
            content={content}
            setContent={setContent}
            createPrompt={createPrompt}
            resetForm={resetForm}
            message={message}
            search={search}
            setSearch={setSearch}
            filteredPrompts={filteredPrompts}
            loadPrompt={loadPrompt}
            deletePrompt={deletePrompt}
            isSaving={isSaving}
          />
        )}

 
{page === 'Test Cases' && (
  <TestCases prompts={prompts} />
)}

{page === 'Test Execution' && (
  <TestExecution prompts={prompts} />
)}

{page === 'Results & Reports' && (
  <section className="content-card coming-soon">
    <h2>Results & Reports</h2>
    <p>
      This module is planned for the next development stage.
    </p>
  </section>
)}

      </main>
    </div>
  )
}

export default App