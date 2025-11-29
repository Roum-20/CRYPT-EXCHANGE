from db import get_db_connection
from services.prices import get_price
from datetime import datetime

def sell_crypto(user_id, symbol, amount):
    price = get_price(symbol)
    if not price:
        return False, "Failed to fetch price."
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT amount FROM portfolio WHERE user_id=? AND symbol=?",
            (user_id, symbol.upper())
        )
        holding = cursor.fetchone()
        
        # holding is a tuple like (current_amount,)
        if not holding or holding[0] < amount:
            return False, "Insufficient crypto holdings."
        
        current_amount = holding[0]
        new_amount = current_amount - amount
        total_gain = price * amount

        if new_amount > 0:
            cursor.execute(
                "UPDATE portfolio SET amount=? WHERE user_id=? AND symbol=?",
                (new_amount, user_id, symbol.upper())
            )
        else:
            cursor.execute(
                "DELETE FROM portfolio WHERE user_id=? AND symbol=?",
                (user_id, symbol.upper())
            )

        cursor.execute(
            "UPDATE balances SET fiat = fiat + ? WHERE user_id=?",
            (total_gain, user_id)
        )

        cursor.execute(
            '''
            INSERT INTO transactions(user_id, symbol, tx_type, amount, price, timestamp)
            VALUES (?, ?, 'sell', ?, ?, ?)
            ''',
            (user_id, symbol.upper(), amount, price, datetime.utcnow().isoformat())
        )

        conn.commit()
        return True, f"Sold {amount} {symbol.upper()} at ${price:.2f} each."
    
    except Exception as e:
        conn.rollback()
        # Temporarily include the error for debugging; you can remove this in production
        return False, f"Sell transaction failed: {e}"
    
    finally:
        conn.close()
