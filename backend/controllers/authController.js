const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  generateToken: generateVerificationToken,
  generateResetToken,
  hashToken,
} = require('../utils/verificationToken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/sendEmail');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const buildVerificationLink = (rawToken) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  return `${clientUrl}/verify-email/${rawToken}`;
};

const buildResetLink = (rawToken) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  return `${clientUrl}/reset-password/${rawToken}`;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verification = generateVerificationToken();

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationTokenHash: verification.hash,
      verificationTokenExpires: verification.expires,
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid user data' });
    }

    try {
      await sendVerificationEmail(user.email, buildVerificationLink(verification.raw));
    } catch (mailErr) {
      console.error('Failed to send verification email:', mailErr.message);
    }

    res.status(201).json({
      message: 'Account created. Please check your email to verify your address.',
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Email not verified. Please check your inbox for the verification link.',
        needsVerification: true,
        email: user.email,
      });
    }

    user.lastLogin = Date.now();
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify email via token from registration link
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ message: 'Verification token is required' });
  }

  try {
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      verificationTokenHash: tokenHash,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    user.isVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpires = undefined;
    user.lastLogin = Date.now();
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resend the verification email
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerification = async (req, res) => {
  const { email } = req.body;
  // Generic response to avoid email enumeration
  const genericResponse = {
    message: 'If that email belongs to an unverified account, a new link has been sent.',
  };

  if (!email) {
    return res.status(200).json(genericResponse);
  }

  try {
    const user = await User.findOne({ email });
    if (!user || user.isVerified) {
      return res.status(200).json(genericResponse);
    }

    const verification = generateVerificationToken();
    user.verificationTokenHash = verification.hash;
    user.verificationTokenExpires = verification.expires;
    await user.save();

    try {
      await sendVerificationEmail(user.email, buildVerificationLink(verification.raw));
    } catch (mailErr) {
      console.error('Failed to resend verification email:', mailErr.message);
    }

    res.status(200).json(genericResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request a password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  // Generic response to avoid email enumeration
  const genericResponse = {
    message: 'If that email belongs to an account, a reset link has been sent.',
  };

  if (!email) {
    return res.status(200).json(genericResponse);
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const reset = generateResetToken();
    user.resetTokenHash = reset.hash;
    user.resetTokenExpires = reset.expires;
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, buildResetLink(reset.raw));
    } catch (mailErr) {
      console.error('Failed to send password reset email:', mailErr.message);
    }

    res.status(200).json(genericResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password using a token from email
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Reset token is required' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res
      .status(400)
      .json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    // A successful reset implies the user controls the email
    if (!user.isVerified) {
      user.isVerified = true;
      user.verificationTokenHash = undefined;
      user.verificationTokenExpires = undefined;
    }
    user.lastLogin = Date.now();
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
