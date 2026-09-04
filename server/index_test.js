/**
 * index_test.js — Same Express app as index.js but exports `app` without
 * connecting to MongoDB or calling listen. Used by the integration test suite.
 */
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'ReSell API is running' });
});

app.use('/api/auth', require('./routes/auth'));

module.exports = app;
