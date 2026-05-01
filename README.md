# 💱 Crypt-Exchange

A full-stack cryptocurrency trading platform built with **Node.js**, **Express**, and **SQLite**. Connect your real exchange API keys and trade live on Binance, Coinbase, Kraken, KuCoin, and Bybit — all from one unified dashboard.

---

## 🚀 Features

- 🔐 **User Authentication** — Secure registration & login with bcrypt password hashing
- 📊 **Live Market Data** — Real-time crypto prices via CoinGecko API
- 💼 **Portfolio Tracking** — Track your crypto holdings and P&L
- 💸 **Fiat Wallet** — Deposit & withdraw INR with bank account management
- 🔗 **Multi-Exchange Integration** — Connect API keys for live trading via [ccxt](https://github.com/ccxt/ccxt)
- 📈 **Live Trading** — Place real market buy/sell orders on connected exchanges
- 👁️ **Watchlist** — Monitor your favourite coins
- 📋 **Transaction History** — Full audit trail of all trades and transfers

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js |
| **Framework** | Express.js v5 |
| **Database** | SQLite via `better-sqlite3` |
| **Authentication** | `express-session` + `bcryptjs` |
| **Exchange API** | `ccxt` (unified crypto exchange library) |
| **Frontend** | Vanilla HTML, CSS, JavaScript |

---

## 📦 Supported Exchanges

| Exchange | Testnet Support |
|---|---|
| Binance | ✅ |
| Coinbase | ✅ |
| Kraken | ✅ |
| KuCoin | ✅ |
| Bybit | ✅ |

---

## ⚡ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/Roum-20/CRYPT-EXCHANGE.git
cd CRYPT-EXCHANGE

# Install dependencies
npm install

# Start the server
npm start
```

The app will be running at **http://localhost:3000**

> On Windows, you can also double-click **`start.bat`** to launch the server.

---

## 🗂️ Project Structure

```
CRYPT-EXCHANGE/
├── db/
│   └── database.js          # SQLite schema & initialization
├── middleware/
│   └── auth.js              # Session authentication middleware
├── public/
│   ├── index.html           # Single Page Application entry
│   ├── css/style.css        # Global styles
│   └── js/app.js            # Frontend logic
├── routes/
│   ├── auth.js              # Register / Login / Logout
│   ├── wallet.js            # Deposit, Withdraw, Bank accounts
│   ├── trade.js             # Buy / Sell orders
│   ├── market.js            # Live market data
│   ├── portfolio.js         # Holdings & P&L
│   └── exchange.js          # Exchange API key management
├── services/
│   └── exchange.js          # ccxt integration & order execution
├── server.js                # Express app entry point
├── package.json
└── start.bat                # Windows quick-start script
```

---

## 🔑 Connecting Your Exchange

1. **Register** an account on the platform
2. Go to **Settings → Exchange API**
3. Select your exchange (Binance, Kraken, etc.)
4. Enter your **API Key** and **API Secret**
5. Optionally enable **Testnet mode** for paper trading
6. Click **Connect** — your live balance will sync instantly

> ⚠️ Never share your API keys. Use **read + trade** permissions only; never enable withdrawal permissions on your API key.

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/wallet/balance` | Get fiat balance |
| `POST` | `/api/wallet/deposit` | Deposit funds |
| `POST` | `/api/wallet/withdraw` | Withdraw funds |
| `GET` | `/api/wallet/transactions` | Transaction history |
| `GET` | `/api/market` | Live market prices |
| `POST` | `/api/trade/buy` | Place market buy order |
| `POST` | `/api/trade/sell` | Place market sell order |
| `GET` | `/api/portfolio` | User portfolio & holdings |
| `POST` | `/api/exchange/keys` | Save exchange API keys |
| `GET` | `/api/exchange/balance` | Fetch live exchange balance |

---

## 🚀 Deployment

### Railway (Recommended)

1. Fork this repository
2. Go to [railway.app](https://railway.app) and sign in with GitHub
3. Click **New Project → Deploy from GitHub repo**
4. Select this repository — Railway auto-detects Node.js
5. Click **Generate Domain** for your public URL

### Environment Variables (for production)

```env
SESSION_SECRET=your-strong-random-secret
PORT=3000
```

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

<p align="center">Built with ❤️ using Node.js & ccxt</p>
