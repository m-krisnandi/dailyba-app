const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dailyba_ultra_secure_jwt_secret_key_2026';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'dailyba.db');

// Initialize SQLite Database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    reset_code TEXT,
    reset_expires_at INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    synced_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '15mb' }));

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Session expired or invalid token' });
    }
    req.user = decoded;
    next();
  });
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Dailyba Sync Server',
    serverTime: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 1. Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, cleanEmail, passwordHash, (name || '').trim(), now, now);

    const token = jwt.sign(
      { id: userId, email: cleanEmail, name: (name || '').trim() },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Account created successfully',
      user: { id: userId, email: cleanEmail, name: (name || '').trim() },
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// 2. Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// 3. Forgot Password (Request 6-digit reset code)
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    // Generate secure 6-digit numeric OTP code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    db.prepare(`
      UPDATE users SET reset_code = ?, reset_expires_at = ?, updated_at = ?
      WHERE id = ?
    `).run(resetCode, expiresAt, new Date().toISOString(), user.id);

    console.log(`[PASSWORD RESET] Generated 6-digit reset code for ${cleanEmail}: ${resetCode}`);

    res.json({
      success: true,
      message: 'Verification code generated. Please enter the 6-digit code to set a new password.',
      // Provided in response for seamless local testing & verification
      resetCode: resetCode
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error processing request' });
  }
});

// 4. Reset Password (Verify code and update password)
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, verification code, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (!user.reset_code || user.reset_code !== cleanCode) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    if (!user.reset_expires_at || user.reset_expires_at < Date.now()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE users
      SET password_hash = ?, reset_code = NULL, reset_expires_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(newHash, now, user.id);

    res.json({
      success: true,
      message: 'Password successfully updated! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
});

// 5. Cloud Sync - Download (GET /api/sync)
app.get('/api/sync', authenticateToken, (req, res) => {
  try {
    const record = db.prepare('SELECT data_json, version, synced_at FROM user_data WHERE user_id = ?').get(req.user.id);
    if (!record || !record.data_json) {
      return res.json({
        success: true,
        hasData: false,
        data: null,
        message: 'No cloud backup found for this account yet'
      });
    }

    const parsedData = JSON.parse(record.data_json);
    res.json({
      success: true,
      hasData: true,
      data: parsedData,
      version: record.version,
      syncedAt: record.synced_at
    });
  } catch (err) {
    console.error('Fetch sync error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve cloud backup' });
  }
});

// 6. Cloud Sync - Upload (POST /api/sync)
app.post('/api/sync', authenticateToken, (req, res) => {
  try {
    const { state } = req.body;
    if (!state) {
      return res.status(400).json({ success: false, message: 'State payload is required' });
    }

    const dataJson = JSON.stringify(state);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO user_data (user_id, data_json, synced_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        data_json = excluded.data_json,
        version = user_data.version + 1,
        synced_at = excluded.synced_at
    `).run(req.user.id, dataJson, now);

    res.json({
      success: true,
      message: 'Cloud backup synced successfully',
      syncedAt: now
    });
  } catch (err) {
    console.error('Save sync error:', err);
    res.status(500).json({ success: false, message: 'Failed to save cloud backup' });
  }
});

app.listen(PORT, () => {
  console.log(`[Dailyba API Server] Running on http://localhost:${PORT}`);
  console.log(`[Dailyba API Server] Database: ${DB_PATH}`);
});
