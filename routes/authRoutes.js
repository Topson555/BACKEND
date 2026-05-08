// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { signup, login, verifyEmail } = require('../controllers/authController');

// Map endpoints to controller logic

// 1. User Registration (Public)
router.post('/signup', signup);

// 2. Email Verification (Public - triggered when user clicks inbox link)
router.get('/verify-email', verifyEmail);

// 3. User Login (Public)
router.post('/login', login);

module.exports = router;