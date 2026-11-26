
import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000/api';

function TestExecution({ prompts }) {
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [selectedVersion1, setSelectedVersion1] = useState('');
  const [selectedVersion2, setSelectedVersion2] = useState('');
  const [selectedVersions, setSelectedVersions] = useState([]);

  const [testCases, setTestCases] = useState([]);
  const [executions, setExecutions] = useState([]);

  const [comparison, setComparison] = useState(null);
  const [regressionResults, setRegressionResults] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load test cases and execution history
  async function loadData() {
    try {
      const [testResponse, executionResponse] = await Promise.all([
        fetch(`${API_URL}/test-cases`),
        fetch(`${API_URL}/test-executions`),
      ]);

      const testData = await testResponse.json();
      const executionData = await executionResponse.json();

      if (!testResponse.ok || !testData.success) {
        throw new Error('Could not load test cases.');
      }

      if (!executionResponse.ok || !executionData.success) {
        throw new Error('Could not load execution history.');
      }

      setTestCases(testData.testCases || []);
      setExecutions(executionData.executions || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  // Initial data loading
  useEffect(() => {
    let cancelled = false;

    async function fetchInitialData() {
      try {
        const [testResponse, executionResponse] = await Promise.all([
          fetch(`${API_URL}/test-cases`),
          fetch(`${API_URL}/test-executions`),
        ]);

        const testData = await testResponse.json();
        const executionData = await executionResponse.json();

        if (!testResponse.ok || !testData.success) {
          throw new Error('Could not load test cases.');
        }

        if (!executionResponse.ok || !executionData.success) {
          throw new Error('Could not load execution history.');
        }

        if (!cancelled) {
          setTestCases(testData.testCases || []);
          setExecutions(executionData.executions || []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message);
        }
      }
    }

    fetchInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Get selected prompt
  const prompt = (prompts || []).find(
    (item) => String(item.id) === selectedPrompt
  );

  // Filter test cases for selected prompt
  const filteredTestCases = testCases.filter(
    (testCase) => String(testCase.prompt_id) === selectedPrompt
  );

  // Update selected versions
  function toggleVersion(versionId) {
    setSelectedVersions((previous) =>
      previous.includes(versionId)
        ? previous.filter((id) => id !== versionId)
        : [...previous, versionId]
    );

    setRegressionResults(null);
    setMessage('');
  }

  // Full regression testing
  async function executeRegression() {
    if (!prompt) {
      setMessage('Please select a prompt.');
      return;
    }

    if (selectedVersions.length < 2) {
      setMessage('Please select at least two prompt versions.');
      return;
    }

    if (filteredTestCases.length === 0) {
      setMessage('This prompt has no saved test cases.');
      return;
    }

    setLoading(true);
    setMessage('');
    setComparison(null);
    setRegressionResults(null);

    try {
      const response = await fetch(
        `${API_URL}/test-executions/regression`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt_id: Number(selectedPrompt),
            prompt_version_ids: selectedVersions.map(Number),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Regression testing failed.');
      }

      setRegressionResults(data);

      await loadData();

      setMessage(
        `Regression testing completed! ${data.totalEvaluations} evaluations processed. ${data.totalRegressions} regressions detected.`
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  // Existing single-test comparison
  async function executeTest(testCase) {
    if (!prompt || !selectedVersion1 || !selectedVersion2) {
      setMessage('Please select a prompt and two versions.');
      return;
    }

    if (selectedVersion1 === selectedVersion2) {
      setMessage('Please select two different versions.');
      return;
    }

    setLoading(true);
    setMessage('');
    setComparison(null);
    setRegressionResults(null);

    try {
      const response = await fetch(
        `${API_URL}/test-executions/compare`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt_version_id_v1: Number(selectedVersion1),
            prompt_version_id_v2: Number(selectedVersion2),
            test_case_id: Number(testCase.id),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Comparison failed.');
      }

      setComparison(data);

      await loadData();

      setMessage(
        `Comparison successful! Version ${data.version1_number} and Version ${data.version2_number} responses generated.`
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="test-execution-page">

      {/* Configure Test Execution */}
      <section className="content-card">
        <h2>Configure Test Execution</h2>
        <p>Select a prompt and its versions to compare.</p>

        <label>Select Prompt</label>
        <select
          value={selectedPrompt}
          onChange={(event) => {
            setSelectedPrompt(event.target.value);
            setSelectedVersion1('');
            setSelectedVersion2('');
            setSelectedVersions([]);
            setComparison(null);
            setRegressionResults(null);
            setMessage('');
          }}
        >
          <option value="">Choose a prompt</option>

          {(prompts || []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <label>First Prompt Version (Single Comparison)</label>
        <select
          value={selectedVersion1}
          onChange={(event) => {
            setSelectedVersion1(event.target.value);
            setComparison(null);
          }}
          disabled={!prompt}
        >
          <option value="">Choose first version</option>

          {(prompt?.versions || []).map((item) => (
            <option key={item.id} value={item.id}>
              Version {item.version}
            </option>
          ))}
        </select>

        <label>Second Prompt Version (Single Comparison)</label>
        <select
          value={selectedVersion2}
          onChange={(event) => {
            setSelectedVersion2(event.target.value);
            setComparison(null);
          }}
          disabled={!prompt}
        >
          <option value="">Choose second version</option>

          {(prompt?.versions || []).map((item) => (
            <option
              key={item.id}
              value={item.id}
              disabled={String(item.id) === selectedVersion1}
            >
              Version {item.version}
            </option>
          ))}
        </select>
      </section>

      {/* Full Regression Version Selection */}
      <section className="content-card">
        <h2>Full Regression Testing</h2>
        <p>
          Select two or more prompt versions to test against all saved test
          cases.
        </p>

        {!prompt ? (
          <p>Select a prompt first.</p>
        ) : (
          <>
            <label>Select Prompt Versions</label>

            {(prompt.versions || []).map((version) => (
              <label
                key={version.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  margin: '12px 0',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedVersions.includes(Number(version.id))}
                  onChange={() => toggleVersion(Number(version.id))}
                  disabled={loading}
                />
                Version {version.version}
              </label>
            ))}

            <p>
              <strong>Selected versions:</strong> {selectedVersions.length}
            </p>

            <p>
              <strong>Available test cases:</strong>{' '}
              {filteredTestCases.length}
            </p>

            <button
              className="primary-button"
              onClick={executeRegression}
              disabled={
                loading ||
                selectedVersions.length < 2 ||
                filteredTestCases.length === 0
              }
            >
              {loading
                ? 'Running Full Regression Test...'
                : 'Run Full Regression Test'}
            </button>
          </>
        )}
      </section>

      {/* Available Test Cases */}
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

                <p>
                  <strong>Input:</strong> {testCase.input}
                </p>

                <p>
                  <strong>Expected Output:</strong>{' '}
                  {testCase.expected_output}
                </p>

                <p>
                  <strong>Category:</strong> {testCase.category}
                </p>

                <button
                  className="primary-button"
                  disabled={
                    !selectedVersion1 ||
                    !selectedVersion2 ||
                    loading
                  }
                  onClick={() => executeTest(testCase)}
                >
                  {loading ? 'Generating Responses...' : 'Compare Versions'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Status Message */}
      {message && (
        <section className="content-card">
          <p role="status">{message}</p>
        </section>
      )}

      {/* Full Regression Results */}
      {regressionResults && (
        <section className="content-card">
          <h2>Full Regression Results</h2>

          <p>
            <strong>Prompt:</strong> {regressionResults.prompt}
          </p>

          <p>
            <strong>Versions tested:</strong>{' '}
            {regressionResults.totalVersions}
          </p>

          <p>
            <strong>Test cases:</strong>{' '}
            {regressionResults.totalTestCases}
          </p>

          <p>
            <strong>Total evaluations:</strong>{' '}
            {regressionResults.totalEvaluations}
          </p>

          <p>
            <strong>Regressions detected:</strong>{' '}
            {regressionResults.totalRegressions}
          </p>

          <h3>Evaluation Details</h3>

          {(regressionResults.executions || []).map((execution) => (
            <article className="prompt-item" key={execution.id}>
              <h3>
                {execution.test_case_name ||
                  `Test Case #${execution.test_case_id}`}
              </h3>

              <p>
                <strong>Version:</strong>{' '}
                {execution.version_number
                  ? `Version ${execution.version_number}`
                  : 'Unknown'}
              </p>

              <p>
                <strong>Accuracy:</strong> {execution.accuracy_score}/10
              </p>

              <p>
                <strong>Relevance:</strong> {execution.relevance_score}/10
              </p>

              <p>
                <strong>Clarity:</strong> {execution.clarity_score}/10
              </p>

              <p>
                <strong>Safety:</strong> {execution.safety_score}/10
              </p>

              <p>
                <strong>Completeness:</strong>{' '}
                {execution.completeness_score}/10
              </p>

              <p>
                <strong>Overall Score:</strong> {execution.overall_score}/10
              </p>

              <p>
                <strong>Regression:</strong>{' '}
                {execution.regression_detected
                  ? 'Detected'
                  : 'Not detected'}
              </p>

              <p><strong>Output:</strong></p>

              <p style={{ whiteSpace: 'pre-wrap' }}>
                {execution.actual_output}
              </p>

              <p><strong>Strengths:</strong></p>
              <ul>
                {(execution.strengths || []).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              <p><strong>Weaknesses:</strong></p>
              <ul>
                {(execution.weaknesses || []).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              <p><strong>Recommendations:</strong></p>
              <ul>
                {(execution.recommendations || []).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}

      {/* Gemini Comparison Results */}
      {comparison && (
        <section className="content-card">
          <h2>Gemini Comparison Results</h2>

          <div className="prompt-item">
            <h3>
              First Selected Version - Version {comparison.version1_number}
            </h3>

            <p style={{ whiteSpace: 'pre-wrap' }}>
              {comparison.response_v1}
            </p>
          </div>

          <div className="prompt-item">
            <h3>
              Second Selected Version - Version {comparison.version2_number}
            </h3>

            <p style={{ whiteSpace: 'pre-wrap' }}>
              {comparison.response_v2}
            </p>
          </div>

          <p>
            <strong>AI Judge Evaluation:</strong>{' '}
            {comparison.evaluation
              ? JSON.stringify(comparison.evaluation)
              : 'Not connected yet'}
          </p>
        </section>
      )}

      {/* Execution History */}
      <section className="content-card">
        <h2>Execution History</h2>

        {executions.length === 0 ? (
          <p>No executions recorded yet.</p>
        ) : (
          <div className="prompt-list">
            {executions.map((execution) => (
              <article className="prompt-item" key={execution.id}>
                <h3>
                  {execution.test_case_name ||
                    `Test Case #${execution.test_case_id}`}
                </h3>

                <p>
                  <strong>Prompt:</strong>{' '}
                  {execution.prompt_name || 'Prompt'}
                </p>

                <p>
                  <strong>Version:</strong>{' '}
                  {execution.version_number
                    ? `Version ${execution.version_number}`
                    : 'Unknown'}
                </p>

                <p>
                  <strong>Status:</strong> {execution.status}
                </p>

                <p>
                  <strong>Accuracy:</strong>{' '}
                  {execution.accuracy_score ?? 'Not evaluated'}
                </p>

                <p>
                  <strong>Overall Score:</strong>{' '}
                  {execution.overall_score ?? 'Not evaluated'}
                </p>

                <p><strong>Output:</strong></p>

                <p style={{ whiteSpace: 'pre-wrap' }}>
                  {execution.actual_output}
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
