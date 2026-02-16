const db = require('./db-adapter');

async function init() {
  console.log('Initializing database...');

  try {
    const isPostgres = db.type === 'postgres';
    const autoIncrement = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const textType = isPostgres ? 'TEXT' : 'TEXT';

    // Users
    await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id ${autoIncrement},
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                brewery_id TEXT NOT NULL
            );
        `);

    // Inventories
    await db.exec(`
            CREATE TABLE IF NOT EXISTS inventory (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                quantity REAL NOT NULL DEFAULT 0,
                unit TEXT NOT NULL,
                min_level REAL NOT NULL DEFAULT 0,
                brewery_id TEXT NOT NULL
            );
        `);

    // Recipes
    await db.exec(`
            CREATE TABLE IF NOT EXISTS recipes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                output_item_id TEXT NOT NULL,
                output_amount REAL NOT NULL,
                ingredients TEXT NOT NULL, 
                brewery_id TEXT NOT NULL
            );
        `);

    // Logs (Blockchain mimic)
    // Composite PK syntax differs slightly, stick to simple for compatibility or use standard
    await db.exec(`
            CREATE TABLE IF NOT EXISTS logs (
                index_num INTEGER,
                timestamp TEXT NOT NULL,
                data TEXT NOT NULL,
                previous_hash TEXT NOT NULL,
                hash TEXT NOT NULL,
                brewery_id TEXT NOT NULL,
                PRIMARY KEY (index_num, brewery_id)
            );
        `);

    // Tasks
    await db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                priority TEXT NOT NULL,
                attachments TEXT,
                brewery_id TEXT NOT NULL
            );
        `);

    // Scheduled Brews
    await db.exec(`
            CREATE TABLE IF NOT EXISTS scheduled_brews (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                recipe_id TEXT NOT NULL,
                status TEXT NOT NULL,
                brewery_id TEXT NOT NULL
            );
        `);

    // Work Shifts
    await db.exec(`
            CREATE TABLE IF NOT EXISTS work_shifts (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                username TEXT NOT NULL,
                type TEXT NOT NULL,
                brewery_id TEXT NOT NULL
            );
        `);

    console.log('Database initialized.');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
}

module.exports = {
  db,
  init
};
