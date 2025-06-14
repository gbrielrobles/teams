const { Pool } = require('pg');

/**
 * Database configuration and connection management
 */
class Database {
    constructor() {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'football_db',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };
        
        this.pool = new Pool(this.config);
        
        // Pool error listener
        this.pool.on('error', (err) => {
            console.error('❌ Unexpected pool error:', err);
        });
    }

    /**
     * Execute a database query
     * @param {string} text - SQL query text
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     * @throws {Error} If query execution fails
     */
    async query(text, params) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } catch (error) {
            console.error('❌ Query error:', error);
            throw new Error(`Database query failed: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Get a database client from the pool
     * @returns {Promise<Object>} Database client
     */
    async getClient() {
        try {
            return await this.pool.connect();
        } catch (error) {
            throw new Error(`Failed to get database client: ${error.message}`);
        }
    }

    /**
     * Test database connection
     * @returns {Promise<boolean>} Connection status
     */
    async testConnection() {
        try {
            const result = await this.query('SELECT NOW()');
            console.log('✅ PostgreSQL connection successful');
            console.log('🕐 Server time:', result.rows[0].now);
            return true;
        } catch (error) {
            console.error('❌ PostgreSQL connection failed:', error.message);
            return false;
        }
    }

    /**
     * Close all database connections
     * @returns {Promise<void>}
     */
    async close() {
        try {
            await this.pool.end();
            console.log('🔒 Connection pool closed');
        } catch (error) {
            console.error('❌ Error closing connection pool:', error.message);
            throw error;
        }
    }
}

module.exports = Database;