// Common helpers for all schemas
const defaultJsonTransform = (_, ret) => {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
};

exports.schemaOptions = {
  timestamps: true,
  toJSON: { virtuals: true, transform: defaultJsonTransform },
  toObject: { virtuals: true, transform: defaultJsonTransform },
};
