const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 1. Configure Nodemailer - STABLE CLOUD CONFIG
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, 
  auth: {
    user: "okewaleemmanuel211@gmail.com",
    pass: process.env.EMAIL_PASS, 
  },
  family: 4, // Forces IPv4 to stop ENETUNREACH errors
  connectionTimeout: 60000, 
  greetingTimeout: 60000,
  socketTimeout: 60000,
  tls: {
    servername: 'smtp.gmail.com',
    rejectUnauthorized: false
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user & Send Verification Email
exports.signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    console.log("--- SIGNUP ATTEMPT ---");
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      fullName,
      email,
      password,
      verificationToken,
      isVerified: false,
    });

    if (user) {
      const host = process.env.BASE_URL || 'http://localhost:5000';
      const verificationUrl = `${host}/api/auth/verify-email?token=${verificationToken}`;

      const mailOptions = {
        from: `"Support Central" <okewaleemmanuel211@gmail.com>`,
        to: user.email,
        subject: 'Verify your Support Central Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #111827; text-align: center;">Welcome to Support Central!</h2>
            <p>Hi ${fullName},</p>
            <p>Please click the button below to verify your email address.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #2563eb; color: #fff; padding: 14px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="color: #9ca3af; font-size: 11px;">Link: ${verificationUrl}</p>
          </div>
        `,
      };

      // 🔥 FIRE AND FORGET: No 'await' so frontend stays fast
      transporter.sendMail(mailOptions).catch(err => {
        console.error("❌ Background Email Error:", err);
      });
      
      console.log(`✅ Success: Signup processed for ${user.email}`); 
      res.status(201).json({ success: true, message: 'Account created! Please check your email.' });
    }
  } catch (error) {
    console.error("❌ Signup Error Details:", error);
    res.status(500).json({ 
        message: "Signup failed on server.", 
        error: error.message 
    });
  }
};

// ... keep verifyEmail and login as they are ...