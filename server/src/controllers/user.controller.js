import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Hostel from "../models/hostel.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import hashToken from "../utils/hashToken.js";
import { getRefreshTokenCookieOptions } from "../utils/cookieOptions.js";
import buildUserResponse from "../utils/buildUserResponse.js";

const REFRESH_COOKIE_NAME =
  process.env.COOKIE_REFRESH_TOKEN_NAME || "refreshToken";

export const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, profile, accommodation } = req.body;

  const validationErrors = {};

  if (!fullName || !fullName.trim()) {
    validationErrors.fullName = "Full name is required";
  } else if (fullName.trim().length < 2) {
    validationErrors.fullName = "Full name must be at least 2 characters";
  } else if (fullName.trim().length > 100) {
    validationErrors.fullName = "Full name cannot exceed 100 characters";
  }

  if (!email || !email.trim()) {
    validationErrors.email = "Email is required";
  } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    validationErrors.email = "Please enter a valid email address";
  }

  if (phone && phone.trim().length > 20) {
    validationErrors.phone = "Phone number cannot exceed 20 characters";
  }

  if (!password) {
    validationErrors.password = "Password is required";
  } else if (password.length < 6) {
    validationErrors.password = "Password must be at least 6 characters";
  } else if (password.length > 30) {
    validationErrors.password = "Password cannot exceed 30 characters";
  }

  if (profile?.year !== undefined && profile?.year !== null) {
    if (
      typeof profile.year !== "number" ||
      profile.year < 1 ||
      profile.year > 10
    ) {
      validationErrors["profile.year"] =
        "Year must be a number between 1 and 10";
    }
  }

  const hostelId = accommodation?.hostelId || null;

  if (
    accommodation?.accommodationType &&
    !["hostel", "pg", "rental"].includes(accommodation.accommodationType)
  ) {
    validationErrors["accommodation.accommodationType"] =
      "Accommodation type must be hostel, pg, or rental";
  }

  if (hostelId && !mongoose.Types.ObjectId.isValid(hostelId)) {
    validationErrors["accommodation.hostelId"] = "Invalid hostelId";
  }

  if (Object.keys(validationErrors).length > 0) {
    throw new ApiError(400, "Validation failed", validationErrors);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, "Validation failed", {
      email: "User already exists with this email",
    });
  }

  if (hostelId) {
    const hostelExists = await Hostel.findById(hostelId);

    if (!hostelExists) {
      throw new ApiError(404, "Validation failed", {
        "accommodation.hostelId": "Hostel not found",
      });
    }

    if (!hostelExists.isActive) {
      throw new ApiError(400, "Validation failed", {
        "accommodation.hostelId": "Selected hostel is inactive",
      });
    }
  }

  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || null,
    password,
    role: "student", // force public signup to student only
    accountStatus: "active",
    isEmailVerified: false,
    profile: {
      enrollmentNo: profile?.enrollmentNo?.trim() || null,
      employeeId: null,
      department: profile?.department?.trim() || null,
      course: profile?.course?.trim() || null,
      year: profile?.year ?? null,
      avatar: null,
    },
    accommodation: {
      accommodationType: accommodation?.accommodationType || "hostel",
      hostelId,
      block: accommodation?.block?.trim() || null,
      floor: accommodation?.floor?.trim() || null,
      roomNumber: accommodation?.roomNumber?.trim() || null,
    },
    assignment: {
      assignedHostelIds: [],
      designation: null,
      categoriesHandled: [],
      isAvailable: true,
      lastAssignedAt: null,
    },
    createdBy: null,
    updatedBy: null,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: "User registered successfully. Please login to continue.",
    data: {
      user,
    },
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const validationErrors = {};

  if (!email || !email.trim()) {
    validationErrors.email = "Email is required";
  } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    validationErrors.email = "Please enter a valid email address";
  }

  if (!password) {
    validationErrors.password = "Password is required";
  }

  if (Object.keys(validationErrors).length > 0) {
    throw new ApiError(400, "Validation failed", validationErrors);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password +authMeta.refreshToken +authMeta.refreshTokenExpiresAt",
  );

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.accountStatus !== "active") {
    throw new ApiError(403, "Your account is not active");
  }

  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    throw new ApiError(401, "Invalid email or password");
  }

  const payload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const decodedRefreshToken = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET,
  );

  if (!user.authMeta) {
    user.authMeta = {};
  }

  user.authMeta.lastLoginAt = new Date();
  user.authMeta.refreshToken = hashToken(refreshToken);
  user.authMeta.refreshTokenExpiresAt = new Date(
    decodedRefreshToken.exp * 1000,
  );

  await user.save({ validateBeforeSave: false });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshTokenCookieOptions());

  const userResponse = await User.findById(user._id).populate(
    "accommodation.hostelId",
    "name code type",
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: "Login successful",
    data: {
      accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is missing");
  }

  let decoded;

  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.userId).select(
    "+authMeta.refreshToken +authMeta.refreshTokenExpiresAt",
  );

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  if (user.accountStatus !== "active") {
    throw new ApiError(403, "Your account is not active");
  }

  if (!user.authMeta?.refreshToken) {
    throw new ApiError(401, "Refresh session not found");
  }

  if (
    user.authMeta.refreshTokenExpiresAt &&
    user.authMeta.refreshTokenExpiresAt.getTime() < Date.now()
  ) {
    user.authMeta.refreshToken = null;
    user.authMeta.refreshTokenExpiresAt = null;
    await user.save({ validateBeforeSave: false });

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshTokenCookieOptions());

    throw new ApiError(401, "Refresh token expired. Please login again");
  }

  const hashedIncomingToken = hashToken(incomingRefreshToken);

  if (hashedIncomingToken !== user.authMeta.refreshToken) {
    user.authMeta.refreshToken = null;
    user.authMeta.refreshTokenExpiresAt = null;
    await user.save({ validateBeforeSave: false });

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshTokenCookieOptions());

    throw new ApiError(401, "Refresh token mismatch. Please login again");
  }

  const newPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const newAccessToken = generateAccessToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);

  const decodedNewRefreshToken = jwt.verify(
    newRefreshToken,
    process.env.JWT_REFRESH_SECRET,
  );

  user.authMeta.refreshToken = hashToken(newRefreshToken);
  user.authMeta.refreshTokenExpiresAt = new Date(
    decodedNewRefreshToken.exp * 1000,
  );

  await user.save({ validateBeforeSave: false });

  res.cookie(
    REFRESH_COOKIE_NAME,
    newRefreshToken,
    getRefreshTokenCookieOptions(),
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: "Access token refreshed successfully",
    data: {
      accessToken: newAccessToken,
    },
  });
});

export const logoutUser = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (incomingRefreshToken) {
    try {
      const decoded = jwt.verify(
        incomingRefreshToken,
        process.env.JWT_REFRESH_SECRET,
      );

      const user = await User.findById(decoded.userId).select(
        "+authMeta.refreshToken +authMeta.refreshTokenExpiresAt",
      );

      if (user) {
        user.authMeta.refreshToken = null;
        user.authMeta.refreshTokenExpiresAt = null;
        await user.save({ validateBeforeSave: false });
      }
    } catch (error) {
      // cookie invalid/expired ho to bhi logout response dena hai
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME, getRefreshTokenCookieOptions());

  return sendSuccess(res, {
    statusCode: 200,
    message: "Logged out successfully",
  });
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "accommodation.hostelId",
    "name code type address",
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: "Profile fetched successfully",
    data: buildUserResponse(user),
  });
});
