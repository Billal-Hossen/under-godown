const BrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    logo: { type: String }, // optional, for brand logo
  },
  { timestamps: true }
);

module.exports = mongoose.model("Brand", BrandSchema);
