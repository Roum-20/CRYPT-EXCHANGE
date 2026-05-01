const express = require('express');
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const exchange = require('../services/exchange');

const router = express.Router();

// Buy crypto — executes REAL market order on connected exchange
router.post('/buy', requireAuth, async (req, res) => {
  try {
    const { coinId, coinName, coinSymbol, quantity, pricePerUnit, amountUSD } = req.body;
    const usdAmount = parseFloat(amountUSD || (parseFloat(quantity) * parseFloat(pricePerUnit)));

    if (!coinId || !usdAmount || usdAmount <= 0) {
      return res.status(400).json({ error: 'Invalid trade parameters.' });
    }

    // Execute real order on exchange
    const result = await exchange.marketBuy(req.session.userId, coinId, usdAmount);

    // Record transaction in local DB for history tracking
    db.prepare(`INSERT INTO transactions 
      (user_id, type, coin_id, coin_symbol, quantity, price_per_unit, total_amount, order_id, exchange_name, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        req.session.userId, 'buy', coinId,
        (coinSymbol || result.symbol).toUpperCase(),
        result.quantity, result.price, result.total,
        result.orderId, result.exchange, result.status || 'filled'
      );

    // Update local holdings tracker
    const existing = db.prepare('SELECT * FROM crypto_holdings WHERE user_id = ? AND coin_id = ?')
      .get(req.session.userId, coinId);

    if (existing) {
      const newQty = existing.quantity + result.quantity;
      const newAvg = ((existing.avg_buy_price * existing.quantity) + (result.price * result.quantity)) / newQty;
      db.prepare('UPDATE crypto_holdings SET quantity = ?, avg_buy_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newQty, newAvg, existing.id);
    } else {
      db.prepare('INSERT INTO crypto_holdings (user_id, coin_id, coin_name, coin_symbol, quantity, avg_buy_price) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.session.userId, coinId, coinName || result.symbol, (coinSymbol || result.symbol).toUpperCase(), result.quantity, result.price);
    }

    res.json({
      success: true,
      order: {
        id: result.orderId,
        symbol: result.symbol,
        quantity: result.quantity,
        price: result.price,
        total: result.total,
        status: result.status
      }
    });
  } catch (err) {
    console.error('Buy error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Sell crypto — executes REAL market order on connected exchange
router.post('/sell', requireAuth, async (req, res) => {
  try {
    const { coinId, coinSymbol, quantity, pricePerUnit } = req.body;
    const qty = parseFloat(quantity);

    if (!coinId || !qty || qty <= 0) {
      return res.status(400).json({ error: 'Invalid trade parameters.' });
    }

    // Execute real order on exchange
    const result = await exchange.marketSell(req.session.userId, coinId, qty);

    // Record transaction
    db.prepare(`INSERT INTO transactions 
      (user_id, type, coin_id, coin_symbol, quantity, price_per_unit, total_amount, order_id, exchange_name, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        req.session.userId, 'sell', coinId,
        (coinSymbol || result.symbol).toUpperCase(),
        result.quantity, result.price, result.total,
        result.orderId, result.exchange, result.status || 'filled'
      );

    // Update local holdings tracker
    const holding = db.prepare('SELECT * FROM crypto_holdings WHERE user_id = ? AND coin_id = ?')
      .get(req.session.userId, coinId);

    if (holding) {
      const newQty = holding.quantity - result.quantity;
      if (newQty <= 0.00000001) {
        db.prepare('DELETE FROM crypto_holdings WHERE id = ?').run(holding.id);
      } else {
        db.prepare('UPDATE crypto_holdings SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newQty, holding.id);
      }
    }

    res.json({
      success: true,
      order: {
        id: result.orderId,
        symbol: result.symbol,
        quantity: result.quantity,
        price: result.price,
        total: result.total,
        status: result.status
      }
    });
  } catch (err) {
    console.error('Sell error:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
