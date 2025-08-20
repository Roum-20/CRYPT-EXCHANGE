from db import get_db_connection

def get_portfolio(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT symbol, amount FROM portfolio WHERE user_id=?", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    portfolio = {symbol: amount for symbol, amount in rows}
    return portfolio

def reset_portfolio(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM portfolio WHERE user_id=?", (user_id,))
        conn.commit()
        return True, "Portfolio holdings reset."
    except Exception:
        conn.rollback()
        return False, "Failed to reset portfolio."
    finally:
        conn.close()

def get_fiat_balance(user_id):
    # If you want to keep this here, else import from bank.py
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT fiat FROM balances WHERE user_id=?', (user_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else 0
