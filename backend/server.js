
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

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

// Server port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Nexa-Tech server running on port ${PORT}`);
});
