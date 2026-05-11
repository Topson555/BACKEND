const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 1. Configure Nodemailer transporter - UPDATED FOR RENDER
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Port 587 uses STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // Helps avoid connection issues on cloud servers
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

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
      // Use BASE_URL from Render, fallback to Local IP ONLY if not found
      const host = process.env.BASE_URL || 'http://localhost:5000';
      const verificationUrl = `${host}/api/auth/verify-email?token=${verificationToken}`;

      const mailOptions = {
        from: `"Support Central" <${process.env.EMAIL_USER}>`,
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
            <p style="color: #9ca3af; font-size: 11px;">If you didn't create an account, ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Success: Verification email sent to ${user.email}`); 
      
      res.status(201).json({ success: true, message: 'Account created! Please check your email.' });
    }
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({ message: "Email service failed. Please check backend logs." });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    
    // Switch to your live Vercel URL when you deploy the frontend
    const frontendLoginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/auth';

    if (!token) return res.status(400).send('<h1>Error: Missing token</h1>');

    const user = await User.findOne({ verificationToken: token }).select('+verificationToken');

    if (!user) {
      return res.status(400).send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
          <h1 style="color: #ef4444;">Verification Link Invalid</h1>
          <p>This token has expired or already been used.</p>
          <a href="${frontendLoginUrl}">Back to Login</a>
        </div>
      `);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send(`
      <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
        <h1 style="color: #10b981;">Email Verified!</h1>
        <p>Redirecting you to the login page...</p>
        <script>
          setTimeout(() => { window.location.href = '${frontendLoginUrl}'; }, 3000);
        </script>
      </div>
    `);
  } catch (error) {
    console.error("❌ Verification Error:", error);
    res.status(500).send('<h1>Server error during verification.</h1>');
  }
};

// ... login function remains same as your snippet ...