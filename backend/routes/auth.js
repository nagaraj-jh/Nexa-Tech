
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_HOURS = 12;

// Validate email format
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validate password
const isValidPassword = (password) => {
  return (
    typeof password === 'string' &&
    Buffer.byteLength(password, 'utf8') <= 72 &&
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/.test(password)
  );
};

// ============================
// REGISTER
// ============================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required.'
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        message: 'Name must contain between 2 and 100 characters.'
      });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.'
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          'Password must have at least 10 characters, an uppercase letter, a lowercase letter, a digit and a special character.'
      });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'This email is already registered. Please sign in.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [cleanName, cleanEmail, passwordHash]
    );

    return res.status(201).json({
      message: 'Account created successfully. Please sign in.',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Registration error:', error.message);

    if (error.code === '23505') {
      return res.status(409).json({
        message: 'This email is already registered.'
      });
    }

    return res.status(500).json({
      message: 'Registration failed. Please try again.'
    });
  }
});

// ============================
// LOGIN
// ============================
router.post('/login', async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.'
      });
    }

    await client.query('BEGIN');
    transactionStarted = true;

    const result = await client.query(
      `SELECT id, name, email, password_hash,
              failed_login_attempts, locked_until
       FROM users
       WHERE LOWER(email) = $1
       FOR UPDATE`,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    const user = result.rows[0];

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(423).json({
        message: 'Account locked. Please try again after 12 hours.'
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;

      await client.query(
        `UPDATE users
         SET failed_login_attempts = $1,
             locked_until = CASE
               WHEN $2 THEN NOW() + INTERVAL '12 hours'
               ELSE NULL
             END
         WHERE id = $3`,
        [attempts, shouldLock, user.id]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(401).json({
        message: shouldLock
          ? 'Too many failed attempts. Account locked for 12 hours.'
          : `Invalid email or password. ${MAX_LOGIN_ATTEMPTS - attempts} attempts remaining.`
      });
    }

    await client.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL
       WHERE id = $1`,
      [user.id]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is missing from backend environment.');
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('Login error:', error.message);

    return res.status(500).json({
      message: 'Login failed. Please try again.'
    });

  } finally {
    client.release();
  }
});

module.exports = router;
