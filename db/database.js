const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// On Railway/production, use /tmp for writable storage.
// On local dev, use the db/ directory.
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
const dbDir = isProduction ? '/tmp' : __dirname;
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'cryptexchange.db');
console.log(`📂 Database path: ${dbPath}`);
const db = new Database(dbPath);

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initialize() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exchange_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      exchange_name TEXT NOT NULL DEFAULT 'binance',
      api_key TEXT NOT NULL,
      api_secret TEXT NOT NULL,
      is_testnet INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      ifsc_code TEXT NOT NULL,
      account_holder TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS fiat_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      balance REAL DEFAULT 0.0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS crypto_holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      coin_id TEXT NOT NULL,
      coin_name TEXT NOT NULL,
      coin_symbol TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      avg_buy_price REAL NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, coin_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'deposit', 'withdraw', 'buy', 'sell'
      coin_id TEXT,
      coin_symbol TEXT,
      quantity REAL,
      price_per_unit REAL,
      total_amount REAL NOT NULL,
      order_id TEXT, -- exchange order ID for real trades
      exchange_name TEXT, -- which exchange executed this
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      coin_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, coin_id)
    );
  `);

  console.log('✅ Database initialized successfully');
}

module.exports = { db, initialize };
