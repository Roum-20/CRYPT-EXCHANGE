const express = require('express');
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const exchange = require('../services/exchange');

const router = express.Router();

// Get current exchange config (without exposing secrets)
router.get('/config', requireAuth, (req, res) => {
  try {
    const keys = db.prepare('SELECT id, exchange_name, api_key, is_testnet, created_at FROM exchange_keys WHERE user_id = ?').get(req.session.userId);
    if (!keys) {
      return res.json({ connected: false, exchanges: Object.entries(exchange.SUPPORTED_EXCHANGES).map(([id, e]) => ({ id, name: e.name })) });
    }
    res.json({
      connected: true,
      exchange: keys.exchange_name,
      exchangeName: exchange.SUPPORTED_EXCHANGES[keys.exchange_name]?.name || keys.exchange_name,
      apiKeyPreview: keys.api_key.slice(0, 6) + '••••••' + keys.api_key.slice(-4),
      isTestnet: !!keys.is_testnet,
      connectedAt: keys.created_at,
      exchanges: Object.entries(exchange.SUPPORTED_EXCHANGES).map(([id, e]) => ({ id, name: e.name }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exchange config.' });
  }
});

// Save/update exchange API keys
router.post('/connect', requireAuth, async (req, res) => {
  try {
    const { exchangeName, apiKey, apiSecret, isTestnet } = req.body;

    if (!exchangeName || !apiKey || !apiSecret) {
      return res.status(400).json({ error: 'Exchange, API key, and API secret are required.' });
    }

    if (!exchange.SUPPORTED_EXCHANGES[exchangeName]) {
      return res.status(400).json({ error: 'Unsupported exchange.' });
    }

    // Test the connection first
    try {
      await exchange.testConnection(exchangeName, apiKey, apiSecret, !!isTestnet);
    } catch (err) {
      return res.status(400).json({ error: `Connection failed: ${err.message}. Please check your API keys.` });
    }

    // Save keys
    const existing = db.prepare('SELECT id FROM exchange_keys WHERE user_id = ?').get(req.session.userId);
    if (existing) {
      db.prepare('UPDATE exchange_keys SET exchange_name = ?, api_key = ?, api_secret = ?, is_testnet = ?, created_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .run(exchangeName, apiKey, apiSecret, isTestnet ? 1 : 0, req.session.userId);
    } else {
      db.prepare('INSERT INTO exchange_keys (user_id, exchange_name, api_key, api_secret, is_testnet) VALUES (?, ?, ?, ?, ?)')
        .run(req.session.userId, exchangeName, apiKey, apiSecret, isTestnet ? 1 : 0);
    }

    // Clear cached exchange instance
    exchange.clearExchangeCache(req.session.userId);

    res.json({ success: true, message: 'Exchange connected successfully!' });
  } catch (err) {
    console.error('Exchange connect error:', err);
    res.status(500).json({ error: 'Failed to connect exchange.' });
  }
});

// Disconnect exchange
router.post('/disconnect', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM exchange_keys WHERE user_id = ?').run(req.session.userId);
    exchange.clearExchangeCache(req.session.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect exchange.' });
  }
});

// Get real exchange balance
router.get('/balance', requireAuth, async (req, res) => {
  try {
    const balance = await exchange.getBalance(req.session.userId);
    if (!balance) {
      return res.json({ connected: false, assets: {} });
    }
    res.json({ connected: true, assets: balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
