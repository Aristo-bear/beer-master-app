const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'brewery.db');
const db = new Database(dbPath);

function init() {
    console.log('Initializing database...');

    // Users
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      brewery_id TEXT NOT NULL
    )
  `);

    // Inventories
    db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      min_level REAL NOT NULL DEFAULT 0,
      brewery_id TEXT NOT NULL
    )
  `);

    // Recipes
    db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      output_item_id TEXT NOT NULL,
      output_amount REAL NOT NULL,
      ingredients TEXT NOT NULL, -- JSON string
      brewery_id TEXT NOT NULL
    )
  `);

    // Logs (Blockchain mimic)
    db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      index_num INTEGER,
      timestamp TEXT NOT NULL,
      data TEXT NOT NULL, -- JSON string
      previous_hash TEXT NOT NULL,
      hash TEXT NOT NULL,
      brewery_id TEXT NOT NULL,
      PRIMARY KEY (index_num, brewery_id)
    )
  `);

    // Tasks
    db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      completed INTEGER DEFAULT 0, -- boolean 0 or 1
      priority TEXT NOT NULL,
      attachments TEXT, -- JSON string
      brewery_id TEXT NOT NULL
    )
  `);

    // Scheduled Brews
    db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_brews (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      recipe_id TEXT NOT NULL,
      status TEXT NOT NULL,
      brewery_id TEXT NOT NULL
    )
  `);

    // Work Shifts
    db.exec(`
    CREATE TABLE IF NOT EXISTS work_shifts (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      username TEXT NOT NULL,
      type TEXT NOT NULL,
      brewery_id TEXT NOT NULL
    )
  `);

    console.log('Database initialized.');
}

module.exports = {
    db,
    init
};
