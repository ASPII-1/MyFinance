// const mysql = require('mysql2/promise');
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456890',
  database: 'financial_portfolio',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// module.exports = pool
export default pool;