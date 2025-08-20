import streamlit as st
from services.portfolio import get_fiat_balance, get_portfolio, reset_portfolio
from services.prices import get_price

def main():
    st.header("Portfolio Overview")
    user_id = st.session_state.get('user_id')
    if not user_id:
        st.warning("Please login first.")
        return

    fiat_balance = get_fiat_balance(user_id)
    portfolio = get_portfolio(user_id)

    if st.button("Reset Portfolio"):
        success, msg = reset_portfolio(user_id)
        if success:
            st.success(msg)
            portfolio = {}  # Clear displayed data after reset
        else:
            st.error(msg)

    st.write(f"Fiat Balance: ${fiat_balance:.2f}")

    if not portfolio:
        st.info("Your portfolio is empty.")
        return

    st.subheader("Cryptocurrency Holdings")
    total_value = fiat_balance
    for symbol, amount in portfolio.items():
        price = get_price(symbol)
        value = (price * amount) if price else 0
        total_value += value
        st.write(f"{symbol}: {amount:.6f} (~${value:.2f})")

    st.write(f"Total Portfolio Value (including fiat): ${total_value:.2f}")
