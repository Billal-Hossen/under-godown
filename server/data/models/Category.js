const mongoose = require("mongoose");
const CategorySchema = new mongoose.Schema(
  {
    label: { type: String, required: true, unique: true, trim: true },
    icon: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CategorySchema);
