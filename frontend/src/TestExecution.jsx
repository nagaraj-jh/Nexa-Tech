
import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000/api';

function TestExecution({ prompts }) {
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [testCases, setTestCases] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load saved test cases and execution history
  useEffect(() => {
    async function loadData() {
      try {
        const [testResponse, executionResponse] = await Promise.all([
          fetch(`${API_URL}/test-cases`),
          fetch(`${API_URL}/test-executions`),
        ]);

        const testData = await testResponse.json();
        const executionData = await executionResponse.json();

        if (!testResponse.ok || !testData.success) {
          throw new Error('Could not load test cases');
        }

        if (!executionResponse.ok || !executionData.success) {
          throw new Error('Could not load execution history');
        }

        setTestCases(testData.testCases || []);
        setExecutions(executionData.executions || []);
      } catch (error) {
        setMessage(error.message);
      }
    }

    loadData();
  }, []);

  // Get selected prompt and version
  const prompt = prompts.find(
    (item) => String(item.id) === selectedPrompt
  );

  const version = prompt?.versions.find(
    (item) => String(item.id) === selectedVersion
  );

  // Select only test cases belonging to the selected prompt
  const filteredTestCases = testCases.filter(
    (testCase) => String(testCase.prompt_id) === selectedPrompt
  );

  // Execute a test case
  async function executeTest(testCase) {
    if (!prompt || !version) {
      setMessage('Please select a prompt and version.');
      return;
    }

    setLoading(true);
    setMessage('');



    try {
      // Temporary execution response.
      // Gemini API integration will be added in the next stage.
      const actualOutput =
        'Test execution prepared successfully. AI response generation will be connected in the next stage.';

      const executionTime = 0;

      const response = await fetch(`${API_URL}/test-executions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt_id: prompt.id,
          prompt_version_id: version.id,
          test_case_id: testCase.id,
          actual_output: actualOutput,
          status: 'Pending',
          execution_time: executionTime,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Execution failed');
      }

      setExecutions((previous) => [
        data.execution,
        ...previous,
      ]);

      setMessage(
        'Execution record saved. AI response generation is not connected yet.'
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="test-execution-page">
      <section className="content-card">
        <h2>Configure Test Execution</h2>
        <p>Select a prompt and version to prepare your tests.</p>

        <label>Select Prompt</label>
        <select
          value={selectedPrompt}
          onChange={(event) => {
            setSelectedPrompt(event.target.value);
            setSelectedVersion('');
          }}
        >
          <option value="">Choose a prompt</option>
          {prompts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <label>Select Prompt Version</label>
        <select
          value={selectedVersion}
          onChange={(event) => setSelectedVersion(event.target.value)}
          disabled={!prompt}
        >
          <option value="">Choose a version</option>
          {prompt?.versions.map((item) => (
            <option key={item.id} value={item.id}>
              Version {item.version}
            </option>
          ))}
        </select>
      </section>

      <section className="content-card">
        <h2>Available Test Cases</h2>

        {!selectedPrompt ? (
          <p>Select a prompt to view its test cases.</p>
        ) : filteredTestCases.length === 0 ? (
          <p>No test cases found for this prompt.</p>
        ) : (
          <div className="prompt-list">
            {filteredTestCases.map((testCase) => (
              <article className="prompt-item" key={testCase.id}>
                <h3>{testCase.name}</h3>
                <p><strong>Input:</strong> {testCase.input}</p>
                <p>
                  <strong>Expected Output:</strong>{' '}
                  {testCase.expected_output}
                </p>
                <p><strong>Category:</strong> {testCase.category}</p>

                <button
                  className="primary-button"
                  disabled={!selectedVersion || loading}
                  onClick={() => executeTest(testCase)}
                >
                  {loading ? 'Saving...' : 'Execute Test'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {message && (
        <section className="content-card">
          <p role="status">{message}</p>
        </section>
      )}

      <section className="content-card">
        <h2>Execution History</h2>

        {executions.length === 0 ? (
          <p>No executions recorded yet.</p>
        ) : (
          <div className="prompt-list">
            {executions.map((execution) => (
              <article className="prompt-item" key={execution.id}>
                <h3>{execution.test_case_name || `Test Case #${execution.test_case_id}`}</h3>
                <p>
                  <strong>Prompt:</strong>{' '}
                  {execution.prompt_name || 'Prompt'}
                </p>
                <p>
                  <strong>Version:</strong>{' '}
                  {execution.version_number || 'Unknown'}
                </p>
                <p>
                  <strong>Status:</strong> {execution.status}
                </p>
                <p>
                  <strong>Output:</strong> {execution.actual_output}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default TestExecution;
