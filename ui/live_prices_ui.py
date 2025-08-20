import streamlit as st
import requests
import pandas as pd

def fetch_live_prices(symbols):
    url = 'https://api.coingecko.com/api/v3/simple/price'
    params = {
        'ids': ','.join(symbols),
        'vs_currencies': 'usd'
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception:
        return {}

def main():
    st.header("Live Cryptocurrency Prices")

    coins = [
        'bitcoin', 'bitcoin-cash', 'wrapped-bitcoin', 'bitcoin-sv', 'ethereum',
        'cardano', 'ripple', 'solana', 'polkadot', 'dogecoin', 'litecoin',
        'chainlink', 'binancecoin', 'stellar', 'vechain', 'uniswap',
        'theta-token', 'filecoin', 'tron', 'monero', 'eos', 'tezos', 'cosmos',
        'shiba-inu', 'avalanche-2', 'algorand', 'aave', 'fantom', 'terra-luna',
        'crypto-com-chain', 'elrond-erd-2', 'flow', 'the-graph', 'klay-token'
    ]

    prices_data = fetch_live_prices(coins)

    if not prices_data:
        st.error("Failed to fetch live prices.")
        return

    rows = []
    for coin in coins:
        price = prices_data.get(coin, {}).get('usd', None)
        rows.append({'Cryptocurrency': coin.capitalize(), 'Price (USD)': price})

    df = pd.DataFrame(rows)

    st.subheader("Price Table")
    st.table(df)

    st.subheader("Price Chart")
    df_chart = df.dropna(subset=['Price (USD)']).set_index('Cryptocurrency')
    st.bar_chart(df_chart)
