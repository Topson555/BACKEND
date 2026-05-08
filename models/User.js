// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please add a full name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email address'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email address',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false, // Prevents password from leaking in API queries by default
  },
  role: {
    type: String,
    enum: ['agent', 'admin', 'customer'],
    default: 'agent',
  },
  isVerified: {
    type: Boolean,
    default: false, // User starts unverified until they click the link
  },
  verificationToken: {
    type: String,   // Stores the unique random hex string sent to their email
    select: false,  // Hidden by default for extra security
  }
}, {
  timestamps: true // Automatically creates createdAt and updatedAt fields
});

// Middleware: Encrypt password using bcrypt before saving
// FIXED: Removed 'next' to prevent TypeError in async middleware
UserSchema.pre('save', async function () {
  // Only hash the password if it's being created or modified
  if (!this.isModified('password')) {
    return; // Just return instead of calling next()
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Custom Method: Match entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

