const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 12);
    const result = db.prepare('INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)').run(username, email, passwordHash, fullName);

    // Create fiat wallet for user
    db.prepare('INSERT INTO fiat_wallets (user_id, balance) VALUES (?, 0)').run(result.lastInsertRowid);

    req.session.userId = result.lastInsertRowid;
    req.session.username = username;

    res.json({
      success: true,
      user: { id: result.lastInsertRowid, username, email, fullName }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, fullName: user.full_name }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check session
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, full_name, created_at FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({
    user: { id: user.id, username: user.username, email: user.email, fullName: user.full_name, createdAt: user.created_at }
  });
});

module.exports = router;
