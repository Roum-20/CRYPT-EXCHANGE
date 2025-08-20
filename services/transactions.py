from db import get_db_connection
from services.prices import get_price
from datetime import datetime

def buy_crypto(user_id, symbol, amount):
    price = get_price(symbol)
    if not price:
        return False, "Failed to fetch price."
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT fiat FROM balances WHERE user_id=?", (user_id,))
        fiat = cursor.fetchone()[0]
        total_cost = price * amount
        if fiat < total_cost:
            return False, "Insufficient fiat balance."
        cursor.execute("UPDATE balances SET fiat = fiat - ? WHERE user_id=?", (total_cost, user_id))
        cursor.execute('''
            INSERT INTO portfolio(user_id, symbol, amount)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, symbol) DO UPDATE SET amount=amount + excluded.amount
        ''', (user_id, symbol.upper(), amount))
        cursor.execute('''
            INSERT INTO transactions(user_id, symbol, tx_type, amount, price, timestamp)
            VALUES (?, ?, 'buy', ?, ?, ?)
        ''', (user_id, symbol.upper(), amount, price, datetime.utcnow().isoformat()))
        conn.commit()
        return True, f"Bought {amount} {symbol.upper()} at ${price} each."
    except Exception as e:
        conn.rollback()
        return False, "Transaction failed."
    finally:
        conn.close()

def sell_crypto(user_id, symbol, amount):
    price = get_price(symbol)
    if not price:
        return False, "Failed to fetch price."
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT amount FROM portfolio WHERE user_id=? AND symbol=?", (user_id, symbol.upper()))
        holding = cursor.fetchone()
        if not holding or holding[0] < amount:
            return False, "Insufficient crypto holdings."
        total_gain = price * amount
        new_amount = holding - amount
        if new_amount > 0:
            cursor.execute("UPDATE portfolio SET amount=? WHERE user_id=? AND symbol=?", (new_amount, user_id, symbol.upper()))
        else:
            cursor.execute("DELETE FROM portfolio WHERE user_id=? AND symbol=?", (user_id, symbol.upper()))
        cursor.execute("UPDATE balances SET fiat = fiat + ? WHERE user_id=?", (total_gain, user_id))
        cursor.execute('''
            INSERT INTO transactions(user_id, symbol, tx_type, amount, price, timestamp)
            VALUES (?, ?, 'sell', ?, ?, ?)
        ''', (user_id, symbol.upper(), amount, price, datetime.utcnow().isoformat()))
        conn.commit()
        return True, f"Sold {amount} {symbol.upper()} at ${price:.2f} each."
    except Exception:
        conn.rollback()
        return False, "Sell transaction failed."
    finally:
        conn.close()