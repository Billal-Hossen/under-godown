const mongoose = require('mongoose');
const { schemaOptions } = require('./_utils');

/**
 * OTP best practices:
 * - Store a hash of the code if security is critical (shown here as 'codeHash')
 * - TTL by 'expiresAt' with expireAfterSeconds: 0
 * - Track attempts with a small cap
 */
const OtpSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose:    { type: String, required: true, trim: true }, // e.g., 'login', '2fa', 'reset'
    channel:    { type: String, enum: ['sms', 'email', 'app'], default: 'sms' },

    codeHash:   { type: String, required: true }, // store hashed code (not plaintext)
    expiresAt:  { type: Date, required: true, index: true }, // TTL index below
    usedAt:     { type: Date, default: null },

    attempts:   { type: Number, default: 0, min: 0 },
    maxAttempts:{ type: Number, default: 5, min: 1 },

    meta:       { type: Object, default: {} }, // e.g., ip, ua
  },
  { ...schemaOptions, collection: 'otps' }
);

// Expire when expiresAt is reached
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// A user shouldn't have multiple active OTPs for same purpose & channel at once
OtpSchema.index(
  { userId: 1, purpose: 1, channel: 1, usedAt: 1 },
  { partialFilterExpression: { usedAt: null }, unique: true }
);

const OtpModel = mongoose.model('Otp', OtpSchema);
module.exports = { OtpModel, OtpSchema };
