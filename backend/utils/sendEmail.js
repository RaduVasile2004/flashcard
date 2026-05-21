const nodemailer = require('nodemailer');

let cachedTransport;

const getTransport = () => {
  if (cachedTransport) return cachedTransport;

  if (process.env.EMAIL_HOST) {
    cachedTransport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: process.env.EMAIL_USER
        ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        : undefined,
    });
  } else {
    // Dev fallback: don't actually send; serialize the message to JSON
    cachedTransport = nodemailer.createTransport({ jsonTransport: true });
  }

  return cachedTransport;
};

const sendVerificationEmail = async (to, link) => {
  const from = process.env.EMAIL_FROM || 'noreply@flashcards.local';
  const transport = getTransport();

  const info = await transport.sendMail({
    from,
    to,
    subject: 'Confirm your email',
    text: `Welcome! Please confirm your email by opening this link:\n\n${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Welcome! Please confirm your email by clicking the link below:</p>
           <p><a href="${link}">${link}</a></p>
           <p>This link expires in 24 hours.</p>`,
  });

  if (!process.env.EMAIL_HOST) {
    // Dev visibility: print the link to the backend terminal
    console.log('[dev] Verification email for', to);
    console.log('[dev] Verification link:', link);
  }

  return info;
};

const sendPasswordResetEmail = async (to, link) => {
  const from = process.env.EMAIL_FROM || 'noreply@flashcards.local';
  const transport = getTransport();

  const info = await transport.sendMail({
    from,
    to,
    subject: 'Reset your password',
    text: `We received a request to reset your password. Open this link to choose a new one:\n\n${link}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email.`,
    html: `<p>We received a request to reset your password.</p>
           <p>Click the link below to choose a new one:</p>
           <p><a href="${link}">${link}</a></p>
           <p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>`,
  });

  if (!process.env.EMAIL_HOST) {
    console.log('[dev] Password reset email for', to);
    console.log('[dev] Password reset link:', link);
  }

  return info;
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
