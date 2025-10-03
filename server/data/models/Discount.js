const mongoose = require("mongoose");

const DiscountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g., "Summer Sale", "Flash Deal"

    type: { 
      type: String, 
      enum: ["PERCENTAGE", "FIXED"], 
      required: true 
    },

    value: { type: Number, required: true }, 
    // if type = PERCENTAGE → 20 = 20% off
    // if type = FIXED → 200 = 200 currency units off

    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },

    isActive: { type: Boolean, default: true },

    // Optional coupon code (only required if discount is coupon-based)
    couponCode: { type: String, trim: true, default: null },  

    // Scopes
    productIds:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  },
  { timestamps: true }
);

// Index for coupon lookup
DiscountSchema.index({ couponCode: 1 }, { unique: true, sparse: true });
DiscountSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model("Discount", DiscountSchema);
