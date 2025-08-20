import requests

def get_price(symbol):
    url = 'https://api.coingecko.com/api/v3/simple/price'
    params = {
        'ids': symbol.lower(),
        'vs_currencies': 'usd'
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()  # Raise HTTP errors if any
        data = response.json()
        if symbol.lower() in data and 'usd' in data[symbol.lower()]:
            return data[symbol.lower()]['usd']
        else:
            print(f"Price data not found for symbol: {symbol}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"HTTP Request error while fetching price for {symbol}: {e}")
        return None
    except ValueError as e:
        print(f"JSON decode error for symbol {symbol}: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error fetching price for {symbol}: {e}")
        return None
