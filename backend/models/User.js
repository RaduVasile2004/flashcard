const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  streak: {
    type: Number,
    default: 0,
  },
  lastLogin: {
    type: Date,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationTokenHash: {
    type: String,
  },
  verificationTokenExpires: {
    type: Date,
  },
  resetTokenHash: {
    type: String,
  },
  resetTokenExpires: {
    type: Date,
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
