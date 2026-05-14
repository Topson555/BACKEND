const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const dns = require('dns');

// ✅ Force IPv4 DNS resolution — fixes ENETUNREACH on Render
dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 45000,
  greetingTimeout: 45000,
  socketTimeout: 45000,
  tls: {
    servername: 'smtp.gmail.com',
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP config broken at startup:", error.message);
  } else {
    console.log("✅ SMTP transporter is ready");
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user & Send Verificat