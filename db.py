import sqlite3

def get_db_connection():
    conn = sqlite3.connect('crypto_exchange.db', check_same_thread=False)
    return conn

def initialize_database():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )''')

    # Fiat balances
    cursor.execute('''CREATE TABLE IF NOT EXISTS balances (
        user_id INTEGER PRIMARY KEY,
        fiat REAL DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')

    # Portfolio
    cursor.execute('''CREATE TABLE IF NOT EXISTS portfolio (
        user_id INTEGER,
        symbol TEXT,
        amount REAL,
        PRIMARY KEY(user_id, symbol),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')

    # Transactions
    cursor.execute('''CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        symbol TEXT,
        tx_type TEXT,
        amount REAL,
        price REAL,
        timestamp TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')

    # Bank account details -- NEW!
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bank_account_details (
            user_id INTEGER PRIMARY KEY,
            account_number TEXT,
            ifsc_code TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    conn.commit()
    conn.close()
