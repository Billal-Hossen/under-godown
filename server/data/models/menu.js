const mongoose = require('mongoose');
const { schemaOptions } = require('./_utils');

/**
 * Tree structure (materialized path):
 * - parentId: parent menu _id
 * - ancestors: [ObjectId...] chain from root to parent
 * - depth: number (0 for root)
 *
 * Notes:
 * - Unique path for routing
 * - Unique (parentId, title) to avoid duplicate siblings
 * - Pre-save hook builds ancestors/depth efficiently
 */
const MenuSchema = new mongoose.Schema(
  {
    title:      { type: String, required: true, trim: true },
    description:{ type: String, trim: true, default: '' },
    path:       { type: String, required: true, trim: true }, // e.g., /admin/users
    icon:       { type: String, trim: true, default: '' },
    isActive:   { type: Boolean, default: true },
    order:      { type: Number, default: 0 },

    parentId:   { type: mongoose.Types.ObjectId, ref: 'Menu', default: null },
    ancestors:  { type: [mongoose.Types.ObjectId], default: [] },
    depth:      { type: Number, default: 0 },
  },
  { ...schemaOptions, collection: 'menus' }
);

// Indexes
MenuSchema.index({ path: 1 }, { unique: true });
MenuSchema.index({ parentId: 1, title: 1 }, { unique: true }); // unique among siblings
MenuSchema.index({ parentId: 1, order: 1 });                    // fast sibling sorting

// Virtual children (handy for population in trees)
MenuSchema.virtual('children', {
  ref: 'Menu',
  localField: '_id',
  foreignField: 'parentId',
  justOne: false,
});

// Build ancestors & depth automatically
MenuSchema.pre('save', async function () {
  if (!this.isModified('parentId')) return;

  if (!this.parentId) {
    this.ancestors = [];
    this.depth = 0;
    return;
  }

  const Parent = this.constructor;
  const parent = await Parent.findById(this.parentId).select('_id ancestors').lean();
  if (!parent) {
    // In case of dangling parentId, reset to root
    this.parentId = null;
    this.ancestors = [];
    this.depth = 0;
    return;
  }
  this.ancestors = [...(parent.ancestors || []), parent._id];
  this.depth = this.ancestors.length;
});

const MenuModel = mongoose.model('Menu', MenuSchema);
module.exports = { MenuModel, MenuSchema };
