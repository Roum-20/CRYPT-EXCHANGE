import streamlit as st
from services.transactions import buy_crypto

def main():
    st.header("Buy Cryptocurrency")
    user_id = st.session_state.get('user_id')
    if not user_id:
        st.warning("Please login first.")
        return

    # Extended popular cryptocurrencies list recognized by CoinGecko
    coins = [
        'bitcoin', 'bitcoin-cash', 'wrapped-bitcoin', 'bitcoin-sv', 'ethereum',
        'cardano', 'ripple', 'solana', 'polkadot', 'dogecoin', 'litecoin',
        'chainlink', 'binancecoin', 'stellar', 'vechain', 'uniswap',
        'theta-token', 'filecoin', 'tron', 'monero', 'eos', 'tezos', 'cosmos',
        'shiba-inu', 'avalanche-2', 'algorand', 'aave', 'fantom', 'terra-luna',
        'crypto-com-chain', 'elrond-erd-2', 'flow', 'the-graph', 'klay-token'
        # Add more coins as needed
    ]

    symbol = st.selectbox("Crypto Symbol", coins)  # Dropdown selectbox

    amount = st.number_input("Amount to Buy", min_value=0.0, format="%.6f")

    if st.button("Buy"):
        if symbol and amount > 0:
            success, msg = buy_crypto(user_id, symbol, amount)
            if success:
                st.success(msg)
            else:
                st.error(msg)
        else:
            st.error("Enter valid symbol and amount.")
