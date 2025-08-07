import express from 'express';
import path from 'path';
const cors = require('cors');
app.use(cors()); // Allow all origins (for development only)

import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

// Configuration
const TIINGO_API_KEY = 'e23ab68945f617d484b43d9a6d2c57be3182f43b';
const TIINGO_BASE_URL = 'https://api.tiingo.com/tiingo';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456890',
  database: 'financial_portfolio',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware (only declare once)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes (only declare once)

// Portfolio Data
app.get('/api/portfolio', async (req, res) => {
  try {
    const [stocks] = await pool.query('SELECT * FROM stocks');
    const [funds] = await pool.query('SELECT * FROM funds');
    res.json({ stocks, funds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Stocks CRUD
app.get('/api/stocks', async (req, res) => {
  try {
    const [stocks] = await pool.query('SELECT * FROM stocks');
    res.json(stocks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/stocks', async (req, res) => {
  try {
    const { symbol, name, shares, avg_price, current_price } = req.body;
    console.log(req.body);
    const [result] = await pool.query(
      'INSERT INTO stocks (symbol, name, shares, avg_price, current_price) VALUES (?, ?, ?, ?, ?)',
      [symbol, name, shares, avg_price, current_price]
    );
    res.status(201).json({ 
      id: result.insertId, 
      symbol, 
      name,
      shares, 
      avg_price, 
      current_price 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/stocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { symbol, name, shares, avg_price, current_price } = req.body;
    await pool.query(
      'UPDATE stocks SET symbol = ?, name = ?, shares = ?, avg_price = ?, current_price = ? WHERE id = ?',
      [symbol, name, shares, avg_price, current_price, id]
    );
    res.json({ id, symbol, name, shares, avg_price, current_price });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/stocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM stocks WHERE id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Tiingo Integration
app.get('/api/search-stocks', async (req, res) => {
  try {
       const { query } = req.query;
    const response = await fetch(
      `${TIINGO_BASE_URL}/utilities/search/${query}?token=${TIINGO_API_KEY}`
    );
    const data = await response.json();
    console.log(data);
    res.json(data);

  } catch (err) {
    console.error('Tiingo search error:', err);
    res.status(500).json({ error: 'Failed to search stocks' });
  }
});

import fetch from 'node-fetch'; // Needed if using Node.js < 18

app.get('/api/stock-price/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    if (!ticker) {
      return res.status(400).json({ error: 'Ticker is required' });
    }

    console.log("Fetching price for:", ticker);

    const TIINGO_API_KEY = process.env.TIINGO_API_KEY;
    const url = `https://api.tiingo.com/iex/${ticker}?token=e23ab68945f617d484b43d9a6d2c57be3182f43b`;

    const response = await fetch(url);
    const data = await response.json();

    // Debug log
    console.log("Tiingo response:", data);

    if (Array.isArray(data) && data.length > 0) {
      const stock = data[0];

      res.json({
        ticker: stock.ticker,
        tngoLast: stock.tngoLast,
        last: stock.last,
        timestamp: stock.timestamp
      });
    } else {
      res.status(404).json({ error: 'No price data found for this ticker' });
    }

  } catch (err) {
    console.error('Tiingo live price error:', err);
    res.status(500).json({ error: 'Failed to fetch stock price' });
  }
});

// Funds CRUD
app.get('/api/funds', async (req, res) => {
  try {
    const [funds] = await pool.query('SELECT * FROM funds');
    res.json(funds);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/funds', async (req, res) => {
  try {
    const { name, units, avgNav, currentNav } = req.body;
    const [result] = await pool.query(
      'INSERT INTO funds (name, units, avg_nav, current_nav) VALUES (?, ?, ?, ?)',
      [name, units, avgNav, currentNav]
    );
    res.status(201).json({ 
      id: result.insertId, 
      name, 
      units, 
      avgNav, 
      currentNav 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/funds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, units, avgNav, currentNav } = req.body;
    await pool.query(
      'UPDATE funds SET name = ?, units = ?, avg_nav = ?, current_nav = ? WHERE id = ?',
      [name, units, avgNav, currentNav, id]
    );
    res.json({ id, name, units, avgNav, currentNav });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/funds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM funds WHERE id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only one server instance (use either 3000 or 3001)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});