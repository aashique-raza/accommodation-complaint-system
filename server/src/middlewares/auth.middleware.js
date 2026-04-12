import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";

// import ApiError from "../utils/apiError.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Access token is missing");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Access token expired");
    }

    throw new ApiError(401, "Invalid access token");
  }

  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  if (user.accountStatus !== "active") {
    throw new ApiError(403, "Your account is not active");
  }

  req.user = user;
  next();
});

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized access"),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          HTTP_STATUS.FORBIDDEN,
          "You are not allowed to access this resource",
        ),
      );
    }

    next();
  };
};
