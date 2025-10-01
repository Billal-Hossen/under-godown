const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const hashString = async (raw) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(raw, salt);
};

const compareHash = (raw, hash) => bcrypt.compare(raw, hash);

const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

module.exports = { hashString, compareHash, sha256 };