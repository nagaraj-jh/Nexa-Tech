
import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:5000/api'

function TestCases({ prompts }) {
  const [testCases, setTestCases] = useState([])
  const [form, setForm] = useState({
    prompt_id: '',
    name: '',
    input: '',
    expected_output: '',
    category: 'General',
  })
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function fetchTestCases() {
    const response = await fetch(`${API_URL}/test-cases`)
    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to load test cases')
    }

    setTestCases(data.testCases || [])
  }

  useEffect(() => {
    async function loadData() {
      try {
        await fetchTestCases()
      } catch (error) {
        setMessage(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  function resetForm() {
    setForm({
      prompt_id: '',
      name: '',
      input: '',
      expected_output: '',
      category: 'General',
    })

    setEditingId(null)
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!prompts.length) {
      setMessage('Create a prompt before adding test cases.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const url = editingId
        ? `${API_URL}/test-cases/${editingId}`
        : `${API_URL}/test-cases`

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          prompt_id: Number(form.prompt_id),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to save test case')
      }

      await fetchTestCases()

      setMessage(
        editingId
          ? 'Test case updated successfully!'
          : 'Test case created successfully!'
      )

      resetForm()
      setMessage(
        editingId
          ? 'Test case updated successfully!'
          : 'Test case created successfully!'
      )
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  function editTestCase(testCase) {
    setEditingId(testCase.id)

    setForm({
      prompt_id: String(testCase.prompt_id),
      name: testCase.name,
      input: testCase.input,
      expected_output: testCase.expected_output,
      category: testCase.category || 'General',
    })

    setMessage('Update the details and save your changes.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteTestCase(id) {
    if (!window.confirm('Delete this test case?')) return

    try {
      const response = await fetch(
        `${API_URL}/test-cases/${id}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to delete test case')
      }

      await fetchTestCases()

      if (editingId === id) resetForm()

      setMessage('Test case deleted successfully!')
    } catch (error) {
      setMessage(error.message)
    }
  }

  const filteredCases = testCases.filter((testCase) =>
    [
      testCase.name,
      testCase.prompt_name,
      testCase.category,
    ].some((value) =>
      (value || '').toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <div className="test-cases-page">
      <section className="content-card">
        <h2>{editingId ? 'Edit Test Case' : 'Create Test Case'}</h2>

        <p>
          Define input data and expected output to evaluate your AI prompts.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="tc-prompt">Select Prompt</label>

          <select
            id="tc-prompt"
            name="prompt_id"
            value={form.prompt_id}
            onChange={handleChange}
            required
          >
            <option value="">Choose a prompt</option>

            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.name}
              </option>
            ))}
          </select>

          <label htmlFor="tc-name">Test Case Name</label>

          <input
            id="tc-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Example: Greeting Test"
            required
          />

          <label htmlFor="tc-input">Input</label>

          <textarea
            id="tc-input"
            name="input"
            value={form.input}
            onChange={handleChange}
            rows={4}
            placeholder="Enter the input that will be given to the AI..."
            required
          />

          <label htmlFor="tc-expected">Expected Output</label>

          <textarea
            id="tc-expected"
            name="expected_output"
            value={form.expected_output}
            onChange={handleChange}
            rows={4}
            placeholder="Describe the expected AI response..."
            required
          />

          <label htmlFor="tc-category">Category</label>

          <select
            id="tc-category"
            name="category"
            value={form.category}
            onChange={handleChange}
          >
            <option value="General">General</option>
            <option value="Accuracy">Accuracy</option>
            <option value="Relevance">Relevance</option>
            <option value="Clarity">Clarity</option>
            <option value="Safety">Safety</option>
            <option value="Completeness">Completeness</option>
          </select>

          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={saving || prompts.length === 0}
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Update Test Case'
                  : 'Create Test Case'}
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={resetForm}
              disabled={saving}
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

        {prompts.length === 0 && (
          <p>Create a prompt first to associate test cases with it.</p>
        )}
      </section>

      <section className="content-card">
        <div className="section-heading">
          <div>
            <h2>Saved Test Cases</h2>
            <p>{testCases.length} test case(s) created</p>
          </div>

          <input
            className="search-input"
            type="search"
            placeholder="Search test cases..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <p>Loading test cases...</p>
        ) : filteredCases.length === 0 ? (
          <div className="empty-state">
            <h3>No test cases found</h3>
            <p>Create your first test case using the form above.</p>
          </div>
        ) : (
          <div className="prompt-list">
            {filteredCases.map((testCase) => (
              <article className="prompt-item" key={testCase.id}>
                <div className="prompt-heading">
                  <div>
                    <h3>{testCase.name}</h3>
                    <span className="version-badge">
                      {testCase.category}
                    </span>
                    <p>Prompt: {testCase.prompt_name}</p>
                  </div>

                  <div className="prompt-actions">
                    <button
                      className="secondary-button"
                      onClick={() => editTestCase(testCase)}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() => deleteTestCase(testCase.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="version-item">
                  <h4>Input</h4>
                  <p>{testCase.input}</p>
                </div>

                <div className="version-item">
                  <h4>Expected Output</h4>
                  <p>{testCase.expected_output}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default TestCases
