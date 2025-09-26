const ApiError = require("../utils/ApiError");

const globalErrorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  // Fallback for unexpected errors
  console.error("Unhandled error:", err);

  return res.status(500).json({
    success: false,
    message: "Something went wrong",
    errors: [],
  });
};

module.exports = globalErrorHandler;
