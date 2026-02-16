const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

class DBAdapter {
    constructor() {
        this.type = process.env.NETLIFY_DATABASE_URL ? 'postgres' : 'sqlite';
        this.db = null;
        this.init();
    }

    init() {
        if (this.type === 'postgres') {
            console.log('Using PostgreSQL database');
            this.db = new Pool({
                connectionString: process.env.NETLIFY_DATABASE_URL,
                ssl: { rejectUnauthorized: false } // Required for some cloud providers
            });
        } else {
            console.log('Using SQLite database');
            const dbPath = path.resolve(__dirname, 'brewery.db');
            this.db = new Database(dbPath);
        }
    }

    // Standardize query placeholders: ? -> $1, $2, etc. for Postgres
    _formatSql(sql) {
        if (this.type === 'sqlite') return sql;

        // Very basic placeholder replacement
        // Assumes '?' is used for placeholders
        let index = 1;
        return sql.replace(/\?/g, () => `$${index++}`);
    }

    async get(sql, params = []) {
        if (this.type === 'sqlite') {
            return this.db.prepare(sql).get(params);
        } else {
            const res = await this.db.query(this._formatSql(sql), params);
            return res.rows[0];
        }
    }

    async all(sql, params = []) {
        if (this.type === 'sqlite') {
            return this.db.prepare(sql).all(params);
        } else {
            const res = await this.db.query(this._formatSql(sql), params);
            return res.rows;
        }
    }

    async run(sql, params = []) {
        if (this.type === 'sqlite') {
            return this.db.prepare(sql).run(params);
        } else {
            const formattedSql = this._formatSql(sql);
            // Handle INSERT RETURNING for ID if needed, but for now just run
            const res = await this.db.query(formattedSql, params);
            return { changes: res.rowCount };
        }
    }

    async exec(sql) {
        if (this.type === 'sqlite') {
            return this.db.exec(sql);
        } else {
            // Postgres doesn't support multiple statements in query simply, 
            // but for init scripts it might be fine or we handle differently.
            // pg 'query' can execute simple SQL statements
            return await this.db.query(sql);
        }
    }

    // Transaction helper
    // Callback receives 'this' (the adapter) to run commands
    async transaction(callback) {
        if (this.type === 'sqlite') {
            const tx = this.db.transaction(() => callback(this));
            return tx();
        } else {
            const client = await this.db.connect();
            try {
                await client.query('BEGIN');

                // We need a proxy adapter that uses this specific client
                const proxyAdapter = {
                    get: async (sql, params) => {
                        const res = await client.query(this._formatSql(sql), params);
                        return res.rows[0];
                    },
                    all: async (sql, params) => {
                        const res = await client.query(this._formatSql(sql), params);
                        return res.rows;
                    },
                    run: async (sql, params) => {
                        const res = await client.query(this._formatSql(sql), params);
                        return { changes: res.rowCount };
                    },
                    exec: async (sql) => client.query(sql)
                };

                await callback(proxyAdapter);
                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        }
    }
}

module.exports = new DBAdapter();
