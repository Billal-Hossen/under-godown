class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something Went Wrong!",
    errors = [],
    stack = ""
  ) {
    super(message);

    this.statusCode = statusCode??500;
    this.success = false;

    // ✅ Make sure this always gets assigned correctly
    this.errors = Array.isArray(errors) ? errors : [];

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
module.exports = ApiError;
// export { ApiError } --- IGNORE ---