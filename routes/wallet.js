const express = require('express');
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get wallet balance
router.get('/balance', requireAuth, (req, res) => {
  try {
    const wallet = db.prepare('SELECT balance FROM fiat_wallets WHERE user_id = ?').get(req.session.userId);
    res.json({ balance: wallet ? wallet.balance : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch balance.' });
  }
});

// Deposit funds
router.post('/deposit', requireAuth, (req, res) => {
  try {
    const { amount } = req.body;
    const depositAmount = parseFloat(amount);

    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount.' });
    }

    if (depositAmount > 1000000) {
      return res.status(400).json({ error: 'Maximum deposit limit is ₹10,00,000.' });
    }

    db.prepare('UPDATE fiat_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(depositAmount, req.session.userId);

    // Record transaction
    db.prepare('INSERT INTO transactions (user_id, type, total_amount) VALUES (?, ?, ?)').run(req.session.userId, 'deposit', depositAmount);

    const wallet = db.prepare('SELECT balance FROM fiat_wallets WHERE user_id = ?').get(req.session.userId);
    res.json({ success: true, balance: wallet.balance });
  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ error: 'Deposit failed.' });
  }
});

// Withdraw funds
router.post('/withdraw', requireAuth, (req, res) => {
  try {
    const { amount } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount.' });
    }

    const wallet = db.prepare('SELECT balance FROM fiat_wallets WHERE user_id = ?').get(req.session.userId);
    if (wallet.balance < withdrawAmount) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    db.prepare('UPDATE fiat_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(withdrawAmount, req.session.userId);

    // Record transaction
    db.prepare('INSERT INTO transactions (user_id, type, total_amount) VALUES (?, ?, ?)').run(req.session.userId, 'withdraw', withdrawAmount);

    const updated = db.prepare('SELECT balance FROM fiat_wallets WHERE user_id = ?').get(req.session.userId);
    res.json({ success: true, balance: updated.balance });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ error: 'Withdrawal failed.' });
  }
});

// Get bank accounts
router.get('/banks', requireAuth, (req, res) => {
  try {
    const banks = db.prepare('SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY is_primary DESC').all(req.session.userId);
    res.json({ banks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bank accounts.' });
  }
});

// Add bank account
router.post('/banks', requireAuth, (req, res) => {
  try {
    const { bankName, accountNumber, ifscCode, accountHolder } = req.body;

    if (!bankName || !accountNumber || !ifscCode || !accountHolder) {
      return res.status(400).json({ error: 'All bank details are required.' });
    }

    const count = db.prepare('SELECT COUNT(*) as cnt FROM bank_accounts WHERE user_id = ?').get(req.session.userId);
    const isPrimary = count.cnt === 0 ? 1 : 0;

    db.prepare('INSERT INTO bank_accounts (user_id, bank_name, account_number, ifsc_code, account_holder, is_primary) VALUES (?, ?, ?, ?, ?, ?)').run(req.session.userId, bankName, accountNumber, ifscCode, accountHolder, isPrimary);

    res.json({ success: true });
  } catch (err) {
    console.error('Add bank error:', err);
    res.status(500).json({ error: 'Failed to add bank account.' });
  }
});

// Delete bank account
router.delete('/banks/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM bank_accounts WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bank account.' });
  }
});

// Get transaction history
router.get('/transactions', requireAuth, (req, res) => {
  try {
    const txns = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.session.userId);
    res.json({ transactions: txns });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

module.exports = router;
