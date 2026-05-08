const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 1. Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to generate JWT
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
    console.log("BASE_URL found in .env:", process.env.BASE_URL);

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
      const host = process.env.BASE_URL || 'http://192.168.239.56:5000';
      const verificationUrl = `${host}/api/auth/verify-email?token=${verificationToken}`;

      const mailOptions = {
        from: `"Support Central" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Verify your Support Central Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #111827; text-align: center;">Welcome to Support Central!</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hi ${fullName},</p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Please click the button below to verify your email address.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #000; color: #fff; padding: 14px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 16px; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">Link: <a href="${verificationUrl}">${verificationUrl}</a></p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.status(201).json({ success: true, message: 'Account created! Please check your email.' });
    }
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify email token
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const frontendLoginUrl = 'http://192.168.239.56:3000/login';

    if (!token) return res.status(400).send('<h1>Error: Missing token</h1>');

    const user = await User.findOne({ verificationToken: token }).select('+verificationToken');

    if (!user) {
      return res.status(400).send(`
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h1 style="color: #ef4444;">Verification Link Invalid</h1>
          <p>This token has expired or already been used.</p>
          <a href="${frontendLoginUrl}" style="color: #2563eb; text-decoration: none; font-weight: bold;">Go to Login</a>
        </div>
      `);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #10b981;">Email Verified Successfully!</h1>
        <p>Redirecting you to the login page...</p>
        <script>
          setTimeout(() => {
            window.location.href = '${frontendLoginUrl}';
          }, 3000);
        </script>
      </div>
    `);
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).send('<h1>Server error during verification.</h1>');
  }
};

// @desc    Authenticate user & get token (Login)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email address to log in.' });
    }

    res.json({
      success: true,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};