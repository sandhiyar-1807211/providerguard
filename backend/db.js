const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },   // required for Azure PostgreSQL
})

// Set search_path to our schema on every new connection
pool.on('connect', client => {
  client.query(`SET search_path TO "${process.env.DB_SCHEMA || 'MarketPlace_Agent_HandOff'}", public`)
})

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message)
})

// Helper — run a query and return rows
async function query(text, params) {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return res
  } finally {
    client.release()
  }
}

module.exports = { pool, query }
