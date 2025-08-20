import streamlit as st
import requests
import pandas as pd

def fetch_top_gainers():
    url = "https://api.coingecko.com/api/v3/coins/markets"
    params = {
        'vs_currency': 'usd',
        'order': 'price_change_percentage_24h_desc',
        'per_page': 10,
        'page': 1,
        'price_change_percentage': '24h'
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data
    except Exception:
        return []

def main():
    st.header("Crypto Buy Recommendations")

    coins = fetch_top_gainers()
    if not coins:
        st.error("Failed to fetch recommendation data.")
        return

    # Build a DataFrame with relevant info
    df = pd.DataFrame(coins)[['name', 'symbol', 'current_price', 'price_change_percentage_24h']]
    df.rename(columns={
        'name': 'Name',
        'symbol': 'Symbol',
        'current_price': 'Price (USD)',
        'price_change_percentage_24h': '24h Change (%)'
    }, inplace=True)

    st.write("Top 10 cryptocurrencies by 24-hour price increase:")
    st.table(df)

    st.markdown("### Suggested coin to buy:")
    top_coin = df.iloc[0]
    st.write(f"**{top_coin['Name']} ({top_coin['Symbol'].upper()})** is up {top_coin['24h Change (%)']:.2f}% in the last 24 hours at a price of ${top_coin['Price (USD)']:.2f}.")

    st.markdown("Use this information as one of many factors before investing.")

