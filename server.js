// server.js
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
const connectDB = require('./config/db');


// Connect to database
connectDB();

const app = express();

// ==========================================
// 1. GLOBAL MIDDLEWARES (Must come first!)
// ==========================================

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://192.168.239.56:3000'
  ],
  credentials: true
}));

// Body parser middleware - makes req.body readable BEFORE routes handle it!
app.use(express.json());


// ==========================================
// 2. ROUTES (Must come after middlewares!)
// ==========================================

// Basic status route
app.get('/', (req, res) => {
  res.send('Support Central API is running...');
});

// Mount auth routes
app.use('/api/auth', authRoutes);


// ==========================================
// 3. START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});