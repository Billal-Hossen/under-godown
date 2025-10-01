const mongoose = require('mongoose');
const { schemaOptions } = require('./_utils');

// Simple enums as string sets
const USER_TYPES   = ['USER', 'ADMIN'];
const USER_STATUS  = ['PENDING', 'ACTIVE', 'SUSPENDED'];

const UserSchema = new mongoose.Schema(
  {
    userName:   { type: String, required: true, unique: true, trim: true },
    email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
    password:   { type: String, required: true }, // store a strong hash (e.g., argon2/bcrypt)
    phone:      { type: String, unique: true, sparse: true, trim: true },

    userType:   { type: String, enum: USER_TYPES, default: 'USER' },
    isActive:   { type: Boolean, default: true },
    userStatus: { type: String, enum: USER_STATUS, default: 'PENDING' },

    role:     { type: mongoose.Types.ObjectId, ref: 'Role', default: null },

    // relations
    refreshTokenIds: [{ type: mongoose.Types.ObjectId, ref: 'RefreshToken', default: [] }],
    otpIds:          [{ type: mongoose.Types.ObjectId, ref: 'Otp', default: [] }],
  },
  { ...schemaOptions, collection: 'users' }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });

const UserModel = mongoose.model('User', UserSchema);
module.exports = { UserModel, UserSchema, USER_TYPES, USER_STATUS };
