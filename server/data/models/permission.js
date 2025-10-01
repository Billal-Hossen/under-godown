const mongoose = require('mongoose');
const { schemaOptions } = require('./_utils');

const PermissionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    parentTitle: { type: String, trim: true, default: null }, // optional taxonomy
    slug: { type: String, required: true, trim: true, lowercase: true },
  },
  { ...schemaOptions, collection: 'permissions' }
);

// Indexes
PermissionSchema.index({ title: 1 }, { unique: true });
PermissionSchema.index({ slug: 1 }, { unique: true });

const PermissionModel = mongoose.model('Permission', PermissionSchema);
module.exports = { PermissionModel, PermissionSchema };
