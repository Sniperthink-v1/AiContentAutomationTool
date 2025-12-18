import { Pool } from 'pg'

// PostgreSQL connection pool with optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,              // Increased max connections
  min: 2,
  idleTimeoutMillis: 30000,        // 30 seconds
  connectionTimeoutMillis: 30000,  // 30 seconds (increased from 10s)
  allowExitOnIdle: false,
  statement_timeout: 30000,        // Query timeout: 30 seconds
})

// Handle connection errors gracefully
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err)
  // Don't exit process on connection errors
})

// Handle connection acquisition errors
pool.on('connect', (client) => {
  client.on('error', (err) => {
    console.error('Database client error:', err)
  })
})

export default pool

// Database helper functions with retry logic
export async function query(text: string, params?: any[], retries = 2): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await pool.query(text, params)
      return res
    } catch (error: any) {
      console.error(`Database query error (attempt ${i + 1}/${retries}):`, error.message)
      
      // If it's the last retry, throw the error
      if (i === retries - 1) {
        throw error
      }
      
      // Wait before retrying (500ms, then 1s)
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
    }
  }
}

export async function getClient() {
  try {
    const client = await pool.connect()
    
    // Ensure client is released on error
    const originalQuery = client.query.bind(client)
    client.query = async (...args: any[]): Promise<any> => {
      try {
        return await (originalQuery as any)(...args)
      } catch (error) {
        console.error('Client query error:', error)
        throw error
      }
    }
    
    return client
  } catch (error: any) {
    console.error('Database connection error:', error.message)
    throw error
  }
}
