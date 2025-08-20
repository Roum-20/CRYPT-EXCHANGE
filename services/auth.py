import bcrypt
from db import get_db_connection

def register_user(username, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    try:
        cursor.execute("INSERT INTO users(username, password_hash) VALUES (?, ?)", (username, password_hash))
        conn.commit()
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO balances(user_id, fiat) VALUES (?, ?)", (user_id, 0))
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False
    finally:
        conn.close()

def login_user(username, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, password_hash FROM users WHERE username=?", (username,))
    record = cursor.fetchone()
    conn.close()
    if record:
        user_id, password_hash = record[0], record[1]
        if bcrypt.checkpw(password.encode(), password_hash.encode()):
            return user_id  # Return integer user_id, NOT a tuple
    return None
