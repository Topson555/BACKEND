const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const tls = require('tls');
const nodemailer = require('nodemailer');

let transporterPromise = null;

const createTlsConnection = (host, port) =>
  new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host,
        port,
        family: 4,
        servername: host,
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      () => {
        if (socket.authorized === false && socket.authorizationError) {
          console.warn(`⚠️ TLS authorization warning for ${host}:${port}:`, socket.authorizationError);
        }
        resolve(socket);
      }
    );

    socket.once('error', reject);
    socket.setTimeout(30000, () => {
      socket.destroy();
      reject(new Error('SMTP TLS connection timeout'));
    });
  });

const createTransporter = async () => {
  const smtpHost = 'smtp.gmail.com';
  const auth = {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  };

  if (!auth.user || !auth.pass) {
    throw new Error('Missing EMAIL_USER or EMAIL_PASS environment variables');
  }

  try {
    const connection = await createTlsConnection(smtpHost, 465);
    const transporter = nodemailer.createTransport({
      connection,
      auth,
      name: smtpHost,
      tls: {
        servername: smtpHost,
        rejectUnauthorized: false,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 300000,
    });

    await transporter.verify();
    console.log('✅ Email transporter is ready on port 465 via IPv4');
    return transporter;
  } catch (error) {
    console.warn('⚠️ Failed to initialize SMTPS IPv4 transporter on port 465:', error.message);
  }

  const fallbackOptions = {
    host: smtpHost,
    port: 587,
    secure: false,
    family: 4,
    auth,
    tls: {
      servername: smtpHost,
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 300000,
  };

  try {
    const transporter = nodemailer.createTransport(fallbackOptions);
    await transporter.verify();
    console.log('✅ Email transporter is ready on port 587 via IPv4');
    return transporter;
  } catch (error) {
    console.warn('⚠️ Email transporter verify failed on port 587:', error.message);
    throw error;
  }
};

transporterPromise = createTransporter();

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
            <p style="color: #9ca3af; font-size: 11px;">Link: ${verificationUrl}</p>
          </div>
        `,
      };

      const transporter = await transporterPromise;
      if (!transporter) {
        throw new Error('Email transporter is not available. Please check the email configuration.');
      }

      await transporter.sendMail(mailOptions);
      console.log(`✅ Success: Verification email sent to ${user.email}`);
      res.status(201).json({ success: true, message: 'Account created! Please check your email.' });
    }
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({ message: "Email service failed.", error: error.message });
  }
};

// @desc    Verify email token
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const frontendLoginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/auth';

    if (!token) return res.status(400).send('<h1>Error: Missing token</h1>');

    const user = await User.findOne({ verificationToken: token }).select('+verificationToken');

    if (!user) {
      return res.status(400).send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
          <h1 style="color: #ef4444;">Verification Link Invalid</h1>
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
        <p>Redirecting to login...</p>
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