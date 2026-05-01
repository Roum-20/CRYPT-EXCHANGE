const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db/database');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const tradeRoutes = require('./routes/trade');
const marketRoutes = require('./routes/market');
const portfolioRoutes = require('./routes/portfolio');
const exchangeRoutes = require('./routes/exchange');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'crypt-exchange-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/exchange', exchangeRoutes);

// Serve SPA
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
db.initialize();

app.listen(PORT, () => {
  console.log(`\n🚀 Crypt-Exchange is running at http://localhost:${PORT}`);
  console.log(`💱 Real Trading Mode — Connect your exchange API keys to trade\n`);
});
