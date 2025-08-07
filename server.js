import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import yahooFinance from 'yahoo-finance2';

const app = express();
app.use(cors());

// Database configuration
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

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


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
    const { symbol, name, shares, avg_price, current_price, sector } = req.body;
    const [result] = await pool.query(
      'INSERT INTO stocks (symbol, name, shares, avg_price, current_price, sector) VALUES (?, ?, ?, ?, ?, ?)',
      [symbol, name, shares, avg_price, current_price, sector]
    );
    
    // Return the inserted stock with proper database field names
    const [newStock] = await pool.query('SELECT * FROM stocks WHERE id = ?', [result.insertId]);
    res.status(201).json(newStock[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/stocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { symbol, name, shares, avg_price, current_price, sector } = req.body;
    await pool.query(
      'UPDATE stocks SET symbol = ?, name = ?, shares = ?, avg_price = ?, current_price = ?, sector = ? WHERE id = ?',
      [symbol, name, shares, avg_price, current_price, sector, id]
    );
    
    // Return the updated stock with proper database field names
    const [updatedStock] = await pool.query('SELECT * FROM stocks WHERE id = ?', [id]);
    res.json(updatedStock[0]);
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
    const { name, units, avg_nav, current_nav, fund_category } = req.body;
    const [result] = await pool.query(
      'INSERT INTO funds (name, units, avg_nav, current_nav, fund_category) VALUES (?, ?, ?, ?, ?)',
      [name, units, avg_nav, current_nav, fund_category]
    );
    
    // Return the inserted fund with proper database field names
    const [newFund] = await pool.query('SELECT * FROM funds WHERE id = ?', [result.insertId]);
    res.status(201).json(newFund[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/funds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, units, avg_nav, current_nav, fund_category } = req.body;
    await pool.query(
      'UPDATE funds SET name = ?, units = ?, avg_nav = ?, current_nav = ?, fund_category = ? WHERE id = ?',
      [name, units, avg_nav, current_nav, fund_category, id]
    );
    
    // Return the updated fund with proper database field names
    const [updatedFund] = await pool.query('SELECT * FROM funds WHERE id = ?', [id]);
    res.json(updatedFund[0]);
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

// Yahoo Finance Integration
app.get('/api/search', async (req, res) => {
  try {
    const { query, type = 'all' } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchResults = await yahooFinance.search(query);
    
    // Filter results based on type
    let filteredResults = [];
    if (type === 'stock') {
      filteredResults = searchResults.quotes.filter(
        item => item.quoteType === 'EQUITY'
      );
    } else if (type === 'fund') {
      filteredResults = searchResults.quotes.filter(
        item => item.quoteType === 'MUTUALFUND'
      );
    } else {
      filteredResults = searchResults.quotes.filter(
        item => ['EQUITY', 'MUTUALFUND'].includes(item.quoteType)
      );
    }

    res.json(filteredResults.map(item => ({
      symbol: item.symbol,
      name: item.longname || item.shortname,
      type: item.quoteType === 'MUTUALFUND' ? 'fund' : 'stock',
      exchange: item.exchDisp
    })));

  } catch (err) {
    console.error('Yahoo Finance search error:', err);
    res.status(500).json({ error: 'Failed to search' });
  }
});

app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
   
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const quote = await yahooFinance.quote(symbol);
    
    const response = {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName,
      currency: quote.currency,
      exchange: quote.exchangeName || quote.fullExchangeName,
      timestamp: quote.regularMarketTime
    };
     const result = await yahooFinance.quoteSummary(quote.symbol, { modules: ['assetProfile'] });
    const sectors1 = result.assetProfile?.sector;
    console.log(sectors1);
    console.log(quote.symbol);

    // Add type-specific data
    if (quote.quoteType === 'EQUITY') {
      response.price = quote.regularMarketPrice;
      response.change = quote.regularMarketChange;
      response.changePercent = quote.regularMarketChangePercent;
      response.sector = sectors1 || 'N/A';
    } else if (quote.quoteType === 'MUTUALFUND') {
      response.nav = quote.navPrice || quote.regularMarketPrice;
      response.change = quote.regularMarketChange;
      response.changePercent = quote.regularMarketChangePercent;
      response.fund_category = quote.category || 'N/A';
    }

    res.json(response);

  } catch (err) {
    console.error('Yahoo Finance quote error:', err);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Top/Bottom Performing Funds
app.get('/api/funds/performance', async (req, res) => {
  try {
    const [funds] = await pool.query(`
      SELECT *, 
        (current_nav - avg_nav) / avg_nav * 100 as performance 
      FROM funds 
      WHERE avg_nav > 0
      ORDER BY performance DESC
    `);
    
    const topPerformers = funds.slice(0, 5);
    const bottomPerformers = funds.slice(-5).reverse();
    
    res.json({ topPerformers, bottomPerformers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Stock Sector Allocation
app.get('/api/stocks/sectors', async (req, res) => {
  try {
    const [sectors] = await pool.query(`
      SELECT 
        COALESCE(sector, 'Unknown') as sector,
        SUM(shares * current_price) as total_value,
        COUNT(*) as stock_count
      FROM stocks
      GROUP BY sector
      ORDER BY total_value DESC
    `);
    
    res.json(sectors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});