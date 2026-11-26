require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const promptRoutes = require('./routes/prompts');
const testCaseRoutes = require('./routes/testCases');
const testExecutionRoutes = require('./routes/testExecutions');
const authRoutes = require('./routes/auth');

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());

// ==========================================
// EXISTING API ROUTES
// ==========================================

app.use('/api/prompts', promptRoutes);
app.use('/api/test-cases', testCaseRoutes);
app.use('/api/test-executions', testExecutionRoutes);
app.use('/api/auth', authRoutes);

// ==========================================
// AI JUDGE - N8N INTEGRATION
// ==========================================

app.post('/api/ai-judge/evaluate', async (req, res) => {
  try {
    const { test_input, response_v1, response_v2 } = req.body || {};

    // Validate request data
    if (
      typeof test_input !== 'string' || !test_input.trim() ||
      typeof response_v1 !== 'string' || !response_v1.trim() ||
      typeof response_v2 !== 'string' || !response_v2.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Test input and both response versions are required.'
      });
    }

    // Send evaluation request to n8n
    const n8nResponse = await fetch(
      process.env.N8N_WEBHOOK_URL ||
      'https://vemanna-07.app.n8n.cloud/webhook/prompt-judge',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test_input,
          response_v1,
          response_v2
        })
      }
    );

    const responseText = await n8nResponse.text();

    // Handle n8n errors
    if (!n8nResponse.ok) {
      console.error('n8n Error:', responseText);

      return res.status(502).json({
        success: false,
        message: 'AI Judge evaluation failed.',
        upstreamStatus: n8nResponse.status
      });
    }

    // Parse n8n response
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (error) {
      return res.status(502).json({
        success: false,
        message: 'Invalid JSON response received from n8n.'
      });
    }

    // Handle n8n response formats
    if (Array.isArray(result)) {
      result = result[0];
    }

    if (result && result.output) {
      result = result.output;
    }

    // Return evaluation to frontend
    return res.status(200).json({
      success: true,
      evaluation: result
    });

  } catch (error) {
    console.error('AI Judge Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to connect to the AI Judge.',
      error: error.message
    });
  }
});

// ==========================================
// WELCOME ROUTE
// ==========================================

app.get('/', (req, res) => {
  res.send('Welcome to Nexa-Tech Backend!');
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Nexa-Tech API is working!'
  });
});

// ==========================================
// DATABASE TEST
// ==========================================

app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      success: true,
      message: 'PostgreSQL connected successfully!',
      time: result.rows[0].now,
    });

  } catch (error) {
    console.error('Database error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Nexa-Tech server running on port ${PORT}`);
});