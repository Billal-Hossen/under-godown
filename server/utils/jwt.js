const jwt = require("jsonwebtoken");

function generateToken(payload, secret, expiresIn = process.env.JWT_ACCESS_EXPIRES || '15m') {
  return jwt.sign(payload, secret, { expiresIn});
}

function parseDuration(str) {
  // very small parser for '15m' | '30d' | '12h'
  const m = /^(\d+)([mhd])$/.exec(str);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  if (unit === 'm') return n * 60 * 1000;
  if (unit === 'h') return n * 60 * 60 * 1000;
  if (unit === 'd') return n * 24 * 60 * 60 * 1000;
  return 0;
}

module.exports = {generateToken, parseDuration}; ;