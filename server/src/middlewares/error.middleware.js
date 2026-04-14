import ApiError from "../utils/apiError.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    error = new ApiError(
      error.statusCode || 500,
      error.message || "Internal server error",
    );
  }

  if (err.name === "CastError") {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue || {})[0];
    error = new ApiError(409, `${duplicateField} already exists`, err.keyValue);
  }

  if (err.name === "ValidationError") {
    const validationErrors = Object.values(err.errors).map(
      (item) => item.message,
    );

    error = new ApiError(400, "Validation failed", validationErrors);
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
    errors: error.errors || null,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
