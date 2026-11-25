
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const promptRoutes = require('./routes/prompts');
const testCaseRoutes = require('./routes/testCases');
const testExecutionRoutes = require('./routes/testExecutions');

require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/prompts', promptRoutes);
app.use('/api/test-cases', testCaseRoutes);
app.use('/api/test-executions', testExecutionRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.send('Welcome to Nexa-Tech Backend!');
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Nexa-Tech API is working!'
  });
});

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
// Server port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Nexa-Tech server running on port ${PORT}`);
});
