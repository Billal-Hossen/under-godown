const mongoose = require('mongoose');
const { schemaOptions } = require('./_utils');

const RoleSchema = new mongoose.Schema(
  {
    isPredefined: { type: Boolean, default: false },
    roleName:     { type: String, required: true, trim: true, maxlength: 100 },

    // many-to-many
    permissionIds: [{ type: mongoose.Types.ObjectId, ref: 'Permission', default: [] }],
    menuIds:       [{ type: mongoose.Types.ObjectId, ref: 'Menu', default: [] }],
  },
  { ...schemaOptions, collection: 'roles' }
);

RoleSchema.index({ roleName: 1 }, { unique: true });

const RoleModel = mongoose.model('Role', RoleSchema);
module.exports = { RoleModel, RoleSchema };
