from db import get_db_connection

def deposit(user_id, amount):
    if amount <= 0:
        return False, "Deposit amount must be positive."
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE balances SET fiat = fiat + ? WHERE user_id=?", (amount, user_id))
        conn.commit()
        return True, f"Deposited ${amount:.2f} successfully."
    except Exception:
        conn.rollback()
        return False, "Deposit failed."
    finally:
        conn.close()

def withdraw(user_id, amount):
    if amount <= 0:
        return False, "Withdrawal amount must be positive."
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT fiat FROM balances WHERE user_id=?", (user_id,))
        balance = cursor.fetchone()[0]
        if balance < amount:
            return False, "Insufficient balance."
        cursor.execute("UPDATE balances SET fiat = fiat - ? WHERE user_id=?", (amount, user_id))
        conn.commit()
        return True, f"Withdrew ${amount:.2f} successfully."
    except Exception:
        conn.rollback()
        return False, "Withdrawal failed."
    finally:
        conn.close()

def save_bank_details(user_id, account_number, ifsc_code):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO bank_account_details (user_id, account_number, ifsc_code)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET account_number=excluded.account_number, ifsc_code=excluded.ifsc_code
        ''', (user_id, account_number, ifsc_code))
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        conn.close()

def get_bank_details(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT account_number, ifsc_code FROM bank_account_details WHERE user_id=?', (user_id,))
    result = cursor.fetchone()
    conn.close()
    if result:
        return {'account_number': result[0], 'ifsc_code': result[1]}
    return {'account_number': '', 'ifsc_code': ''}

def get_fiat_balance(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT fiat FROM balances WHERE user_id=?', (user_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else 0

def reset_fiat_balance(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE balances SET fiat = 0 WHERE user_id=?", (user_id,))
        conn.commit()
        return True, "Fiat balance reset to 0."
    except Exception:
        conn.rollback()
        return False, "Failed to reset fiat balance."
    finally:
        conn.close()

def reset_bank_details(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE bank_account_details
            SET account_number = '', ifsc_code = ''
            WHERE user_id = ?
        ''', (user_id,))
        conn.commit()
        return True, "Bank details have been reset."
    except Exception:
        conn.rollback()
        return False, "Failed to reset bank details."
    finally:
        conn.close()
