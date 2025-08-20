import streamlit as st
from db import initialize_database
from ui import (
    auth_ui, bank_ui, portfolio_ui,
    transactions_ui, sell_ui,
    live_prices_ui, recommendation_ui
)

def rerun_app():
    try:
        st.experimental_rerun()
    except AttributeError:
        try:
            st.rerun()
        except AttributeError:
            st.warning("Unable to rerun app automatically. Please refresh the page manually.")

def main():
    initialize_database()
    st.title("CRYPT EXCHANGE")
    
    

    if 'user_id' not in st.session_state:
        auth_ui.main()
    else:
        menu = st.sidebar.selectbox(
            "Navigate",
            ["Bank", "Portfolio", "Trade", "Live Prices", "Recommendations", "Logout"]
        )
        if menu == "Bank":
            bank_ui.main()
        elif menu == "Portfolio":
            portfolio_ui.main()
        elif menu == "Trade":
            trade_action = st.sidebar.selectbox("Trade Options", ["Buy", "Sell"])
            if trade_action == "Buy":
                transactions_ui.main()
            else:
                sell_ui.main()
        elif menu == "Live Prices":
            live_prices_ui.main()
        elif menu == "Recommendations":
            recommendation_ui.main()
        elif menu == "Logout":
            st.session_state.pop('user_id')
            rerun_app()

if __name__ == "__main__":
    main()
