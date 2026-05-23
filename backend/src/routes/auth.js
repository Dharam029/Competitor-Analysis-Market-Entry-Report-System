const express = require('express');
const { get } = require('../db');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (user.password_hash !== password) return res.status(401).json({ error: 'Incorrect password' });
  const token = generateToken(user);
  res.json({ token, user: { user_id: user.user_id, username: user.username, email: user.email, role: user.role } });
});

router.get('/session', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
