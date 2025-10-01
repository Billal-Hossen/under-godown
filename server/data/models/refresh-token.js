const mongoose = require('mongoose');
const { schemaOptions } = require('./_utils');

/**
 * RefreshToken:
 * - Store a hash of the token (tokenHash) instead of raw token
 * - Optional TTL on expiresAt
 * - Support soft revocation via revokedAt
 */
const RefreshTokenSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash:  { type: String, required: true, unique: true }, // hash(token)
    issuedAt:   { type: Date, default: () => new Date() },
    expiresAt:  { type: Date, required: true, index: true },
    revokedAt:  { type: Date, default: null },

    ip:         { type: String, default: '' },
    userAgent:  { type: String, default: '' },
    meta:       { type: Object, default: {} },
  },
  { ...schemaOptions, collection: 'refresh_tokens' }
);

// Optional: automatically delete after expiration
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshTokenModel = mongoose.model('RefreshToken', RefreshTokenSchema);
module.exports = { RefreshTokenModel, RefreshTokenSchema };
