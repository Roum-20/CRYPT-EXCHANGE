const express = require('express');
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const exchangeService = require('../services/exchange');

const router = express.Router();

// Get user's crypto holdings (from local tracking)
router.get('/holdings', requireAuth, (req, res) => {
  try {
    const holdings = db.prepare('SELECT * FROM crypto_holdings WHERE user_id = ? ORDER BY quantity * avg_buy_price DESC').all(req.session.userId);
    res.json({ holdings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch holdings.' });
  }
});

// Get portfolio summary — combines local data with live exchange balance
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const holdings = db.prepare('SELECT * FROM crypto_holdings WHERE user_id = ?').all(req.session.userId);
    const txnCount = db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE user_id = ?').get(req.session.userId);

    // Try to get real exchange balance
    let exchangeBalance = null;
    let exchangeConnected = false;
    try {
      exchangeBalance = await exchangeService.getBalance(req.session.userId);
      if (exchangeBalance) exchangeConnected = true;
    } catch (e) { /* exchange not connected or error */ }

    // Get USDT balance from exchange as "fiat" equivalent
    let fiatBalance = 0;
    if (exchangeBalance && exchangeBalance['USDT']) {
      fiatBalance = exchangeBalance['USDT'].free || 0;
    } else {
      // Fallback to local wallet
      const wallet = db.prepare('SELECT balance FROM fiat_wallets WHERE user_id = ?').get(req.session.userId);
      fiatBalance = wallet ? wallet.balance : 0;
    }

    res.json({
      holdings,
      fiatBalance,
      totalTransactions: txnCount.cnt,
      exchangeConnected,
      exchangeBalance
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch portfolio summary.' });
  }
});

// Sync holdings from exchange — pull real balances
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const balance = await exchangeService.getBalance(req.session.userId);
    if (!balance) {
      return res.status(400).json({ error: 'Exchange not connected.' });
    }

    // Reverse map: symbol → coinId
    const symbolToCoinId = {};
    for (const [coinId, sym] of Object.entries(exchangeService.COIN_SYMBOL_MAP)) {
      symbolToCoinId[sym] = coinId;
    }

    let synced = 0;
    for (const [currency, amounts] of Object.entries(balance)) {
      if (currency === 'USDT' || currency === 'USD') continue; // skip stables
      if (amounts.total <= 0) continue;

      const coinId = symbolToCoinId[currency];
      if (!coinId) continue; // unsupported coin

      const existing = db.prepare('SELECT * FROM crypto_holdings WHERE user_id = ? AND coin_id = ?')
        .get(req.session.userId, coinId);

      if (existing) {
        db.prepare('UPDATE crypto_holdings SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(amounts.total, existing.id);
      } else {
        // We don't know avg_buy_price from exchange, set to 0
        const coinName = currency; // Simple fallback
        db.prepare('INSERT INTO crypto_holdings (user_id, coin_id, coin_name, coin_symbol, quantity, avg_buy_price) VALUES (?, ?, ?, ?, ?, ?)')
          .run(req.session.userId, coinId, coinName, currency, amounts.total, 0);
      }
      synced++;
    }

    // Remove local holdings that have zero balance on exchange
    const localHoldings = db.prepare('SELECT * FROM crypto_holdings WHERE user_id = ?').all(req.session.userId);
    for (const h of localHoldings) {
      const sym = exchangeService.COIN_SYMBOL_MAP[h.coin_id];
      if (sym && (!balance[sym] || balance[sym].total <= 0)) {
        db.prepare('DELETE FROM crypto_holdings WHERE id = ?').run(h.id);
      }
    }

    res.json({ success: true, synced });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Watchlist
router.get('/watchlist', requireAuth, (req, res) => {
  try {
    const list = db.prepare('SELECT coin_id FROM watchlist WHERE user_id = ?').all(req.session.userId);
    res.json({ watchlist: list.map(w => w.coin_id) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch watchlist.' });
  }
});

router.post('/watchlist', requireAuth, (req, res) => {
  try {
    const { coinId } = req.body;
    const existing = db.prepare('SELECT id FROM watchlist WHERE user_id = ? AND coin_id = ?').get(req.session.userId, coinId);
    if (existing) {
      db.prepare('DELETE FROM watchlist WHERE id = ?').run(existing.id);
      return res.json({ added: false });
    }
    db.prepare('INSERT INTO watchlist (user_id, coin_id) VALUES (?, ?)').run(req.session.userId, coinId);
    res.json({ added: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update watchlist.' });
  }
});

module.exports = router;
