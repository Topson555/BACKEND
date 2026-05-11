// server.js
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

// 1. Connect to database
connectDB();

// 2. Initialize Express
const app = express();

// ==========================================
// 3. GLOBAL MIDDLEWARES
// ==========================================

// Body parser middleware - MUST be before routes!
app.use(express.json());

// Enable CORS with expanded permissions
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://192.168.239.56:3000', // Old local IP
    'http://192.168.160.56:3000', // YOUR CURRENT LOCAL IP
    /\.vercel\.app$/,            // This allows any Vercel deployment
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================
// 4. ROUTES
// ==========================================

// Basic status route for Render "Health Check"
app.get('/', (req, res) => {
  res.send('Support Central API is running...');
});

// Mount auth routes
app.use('/api/auth', authRoutes);

// ==========================================
// 5. START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});