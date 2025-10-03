const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    image:       { type: String, trim: true },

    categoryId:  { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    brand:     { type: String, trim: true },
    salePrice:   { type: Number, default: 0 },

    price:       { type: Number, required: true },
    totalStock:  { type: Number, default: 0 },

    averageReview: { type: Number, default: 0 },

    // Reference to discount (if any)
    discountId: { type: mongoose.Schema.Types.ObjectId, ref: "Discount", default: null }
  },
  { timestamps: true }
);

ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ brandId: 1 });
ProductSchema.index({ price: 1 });

module.exports = mongoose.model("Product", ProductSchema);
