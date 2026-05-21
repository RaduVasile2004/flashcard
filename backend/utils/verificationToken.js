const crypto = require('crypto');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

const hashToken = (raw) =>
  crypto.createHash('sha256').update(raw).digest('hex');

const buildToken = (ttlMs) => {
  const raw = crypto.randomBytes(32).toString('hex');
  return {
    raw,
    hash: hashToken(raw),
    expires: new Date(Date.now() + ttlMs),
  };
};

const generateToken = () => buildToken(TOKEN_TTL_MS);
const generateResetToken = () => buildToken(RESET_TOKEN_TTL_MS);

module.exports = { generateToken, generateResetToken, hashToken };
