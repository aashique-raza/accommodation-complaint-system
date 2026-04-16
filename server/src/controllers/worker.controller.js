import mongoose from "mongoose";
import User from "../models/user.model.js";
import Hostel from "../models/hostel.model.js";
import Category from "../models/category.model.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const createWorker = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, profile, assignment } = req.body;

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

  if (!assignment?.designation || !assignment.designation.trim()) {
    validationErrors["assignment.designation"] = "Designation is required";
  }

  if (
    !Array.isArray(assignment?.categoriesHandled) ||
    assignment.categoriesHandled.length === 0
  ) {
    validationErrors["assignment.categoriesHandled"] =
      "At least one category is required";
  }

  if (
    !Array.isArray(assignment?.assignedHostelIds) ||
    assignment.assignedHostelIds.length === 0
  ) {
    validationErrors["assignment.assignedHostelIds"] =
      "At least one assigned hostel is required";
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

  const categoryIds = Array.isArray(assignment?.categoriesHandled)
    ? [...new Set(assignment.categoriesHandled.filter(Boolean))]
    : [];

  const hostelIds = Array.isArray(assignment?.assignedHostelIds)
    ? [...new Set(assignment.assignedHostelIds.filter(Boolean))]
    : [];

  for (const categoryId of categoryIds) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      validationErrors["assignment.categoriesHandled"] =
        "One or more category IDs are invalid";
      break;
    }
  }

  for (const hostelId of hostelIds) {
    if (!mongoose.Types.ObjectId.isValid(hostelId)) {
      validationErrors["assignment.assignedHostelIds"] =
        "One or more hostel IDs are invalid";
      break;
    }
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

  if (profile?.employeeId?.trim()) {
    const existingEmployeeId = await User.findOne({
      "profile.employeeId": profile.employeeId.trim(),
    });

    if (existingEmployeeId) {
      throw new ApiError(409, "Validation failed", {
        "profile.employeeId": "Employee ID already exists",
      });
    }
  }

  const [categories, hostels] = await Promise.all([
    Category.find({ _id: { $in: categoryIds } }).select("_id isActive"),
    Hostel.find({ _id: { $in: hostelIds } }).select("_id isActive"),
  ]);

  if (categories.length !== categoryIds.length) {
    throw new ApiError(404, "Validation failed", {
      "assignment.categoriesHandled": "One or more categories not found",
    });
  }

  const inactiveCategory = categories.find((category) => !category.isActive);
  if (inactiveCategory) {
    throw new ApiError(400, "Validation failed", {
      "assignment.categoriesHandled": "One or more categories are inactive",
    });
  }

  if (hostels.length !== hostelIds.length) {
    throw new ApiError(404, "Validation failed", {
      "assignment.assignedHostelIds": "One or more hostels not found",
    });
  }

  const inactiveHostel = hostels.find((hostel) => !hostel.isActive);
  if (inactiveHostel) {
    throw new ApiError(400, "Validation failed", {
      "assignment.assignedHostelIds": "One or more hostels are inactive",
    });
  }

  const worker = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || null,
    password,
    role: "worker",
    accountStatus: "active",
    isEmailVerified: false,
    profile: {
      enrollmentNo: null,
      employeeId: profile?.employeeId?.trim() || null,
      department: profile?.department?.trim() || null,
      course: null,
      year: null,
      avatar: null,
    },
    accommodation: {
      accommodationType: "hostel",
      hostelId: null,
      block: null,
      floor: null,
      roomNumber: null,
    },
    assignment: {
      assignedHostelIds: hostelIds,
      designation: assignment.designation.trim(),
      categoriesHandled: categoryIds,
      isAvailable:
        typeof assignment?.isAvailable === "boolean"
          ? assignment.isAvailable
          : true,
      lastAssignedAt: null,
    },
    createdBy: req.user?._id || null,
    updatedBy: req.user?._id || null,
  });

  const createdWorker = await User.findById(worker._id)
    .select(
      "-password -authMeta.passwordResetToken -authMeta.passwordResetExpires -authMeta.refreshToken -authMeta.refreshTokenExpiresAt",
    )
    .populate("assignment.categoriesHandled", "name slug")
    .populate("assignment.assignedHostelIds", "name code");

  return sendSuccess(res, {
    statusCode: 201,
    message: "Worker created successfully",
    data: {
      worker: createdWorker,
    },
  });
});

export const getAllWorkers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    category,
    hostel,
    isAvailable,
  } = req.query;

  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (currentPage - 1) * perPage;

  const query = {
    role: "worker",
  };

  if (search.trim()) {
    query.$or = [
      { fullName: { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } },
      { "profile.employeeId": { $regex: search.trim(), $options: "i" } },
      { "assignment.designation": { $regex: search.trim(), $options: "i" } },
    ];
  }

  if (category && mongoose.Types.ObjectId.isValid(category)) {
    query["assignment.categoriesHandled"] = category;
  }

  if (hostel && mongoose.Types.ObjectId.isValid(hostel)) {
    query["assignment.assignedHostelIds"] = hostel;
  }

  if (isAvailable !== undefined) {
    if (isAvailable === "true") {
      query["assignment.isAvailable"] = true;
    } else if (isAvailable === "false") {
      query["assignment.isAvailable"] = false;
    }
  }

  const [workers, totalWorkers] = await Promise.all([
    User.find(query)
      .select(
        "-password -authMeta.passwordResetToken -authMeta.passwordResetExpires -authMeta.refreshToken -authMeta.refreshTokenExpiresAt",
      )
      .populate("assignment.categoriesHandled", "name slug")
      .populate("assignment.assignedHostelIds", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage),
    User.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalWorkers / perPage);

  return sendSuccess(res, {
    statusCode: 200,
    message: "Workers data fetched successfully",
    data: {
      workers,
      pagination: {
        page: currentPage,
        limit: perPage,
        totalItems: totalWorkers,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    },
  });
});

export const getMyWorkerProfile = asyncHandler(async (req, res) => {
  const worker = await User.findById(req.user._id)
    .populate("assignment.categoriesHandled", "name slug")
    .populate("assignment.assignedHostelIds", "name code");

  if (!worker) {
    throw new ApiError(404, "Worker not found");
  }

  if (worker.role !== "worker") {
    throw new ApiError(403, "Only workers can access this profile");
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: "Worker profile fetched successfully",
    data: {
      worker,
    },
  });
});

export const getWorkerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid worker id");
  }

  const worker = await User.findById(id)
    .populate("assignment.categoriesHandled", "name slug")
    .populate("assignment.assignedHostelIds", "name code");

  if (!worker) {
    throw new ApiError(404, "Worker not found");
  }

  if (worker.role !== "worker") {
    throw new ApiError(404, "Worker not found");
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: "Worker profile fetched successfully",
    data: {
      worker,
    },
  });
});

export const updateMyWorkerProfile = asyncHandler(async (req, res) => {
  const {
    fullName,
    phone,
    profile,
    role,
    assignment,
    accountStatus,
    accommodation,
  } = req.body;

  const validationErrors = {};

  // Forbidden fields for self update
  if (role !== undefined) {
    validationErrors.role = "You are not allowed to update role";
  }

  if (assignment !== undefined) {
    validationErrors.assignment =
      "You are not allowed to update assignment details";
  }

  if (accountStatus !== undefined) {
    validationErrors.accountStatus =
      "You are not allowed to update account status";
  }

  if (accommodation !== undefined) {
    validationErrors.accommodation =
      "You are not allowed to update accommodation details";
  }

  if (profile?.employeeId !== undefined) {
    validationErrors["profile.employeeId"] =
      "You are not allowed to update employeeId";
  }

  if (profile?.department !== undefined) {
    validationErrors["profile.department"] =
      "You are not allowed to update department";
  }

  if (profile?.enrollmentNo !== undefined) {
    validationErrors["profile.enrollmentNo"] =
      "You are not allowed to update enrollment number";
  }

  if (profile?.course !== undefined) {
    validationErrors["profile.course"] = "You are not allowed to update course";
  }

  if (profile?.year !== undefined) {
    validationErrors["profile.year"] = "You are not allowed to update year";
  }

  // Allowed validations
  if (fullName !== undefined) {
    if (!fullName || !fullName.trim()) {
      validationErrors.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      validationErrors.fullName = "Full name must be at least 2 characters";
    } else if (fullName.trim().length > 100) {
      validationErrors.fullName = "Full name cannot exceed 100 characters";
    }
  }

  if (phone !== undefined && phone !== null && phone.trim().length > 20) {
    validationErrors.phone = "Phone number cannot exceed 20 characters";
  }

  if (
    profile?.avatar !== undefined &&
    profile?.avatar !== null &&
    typeof profile.avatar !== "string"
  ) {
    validationErrors["profile.avatar"] = "Avatar must be a string or null";
  }

  if (Object.keys(validationErrors).length > 0) {
    throw new ApiError(400, "Validation failed", validationErrors);
  }

  const worker = await User.findById(req.user._id);

  if (!worker) {
    throw new ApiError(404, "Worker not found");
  }

  if (worker.role !== "worker") {
    throw new ApiError(403, "Only workers can update this profile");
  }

  if (fullName !== undefined) {
    worker.fullName = fullName.trim();
  }

  if (phone !== undefined) {
    worker.phone = phone?.trim() || null;
  }

  if (profile?.avatar !== undefined) {
    worker.profile.avatar = profile.avatar?.trim() || null;
  }

  worker.updatedBy = req.user._id;

  await worker.save();

  const updatedWorker = await User.findById(worker._id)
    .populate("assignment.categoriesHandled", "name slug")
    .populate("assignment.assignedHostelIds", "name code");

  return sendSuccess(res, {
    statusCode: 200,
    message: "Worker profile updated successfully",
    data: {
      worker: updatedWorker,
    },
  });
});

export const updateWorker = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    fullName,
    phone,
    profile,
    assignment,
    accountStatus,
    role,
    email,
    password,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid worker id");
  }

  const validationErrors = {};

  // Restricted fields even for admin in this API--
  if (role !== undefined) {
    validationErrors.role = "Role cannot be updated";
  }

  if (email !== undefined) {
    validationErrors.email = "Email cannot be updated from this API";
  }

  if (password !== undefined) {
    validationErrors.password = "Password cannot be updated from this API";
  }

  if (fullName !== undefined) {
    if (!fullName || !fullName.trim()) {
      validationErrors.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      validationErrors.fullName = "Full name must be at least 2 characters";
    } else if (fullName.trim().length > 100) {
      validationErrors.fullName = "Full name cannot exceed 100 characters";
    }
  }

  if (phone !== undefined && phone !== null && phone.trim().length > 20) {
    validationErrors.phone = "Phone number cannot exceed 20 characters";
  }

  if (profile?.employeeId !== undefined && profile.employeeId !== null) {
    if (typeof profile.employeeId !== "string" || !profile.employeeId.trim()) {
      validationErrors["profile.employeeId"] =
        "Employee ID must be a valid string";
    }
  }

  if (profile?.department !== undefined && profile.department !== null) {
    if (typeof profile.department !== "string") {
      validationErrors["profile.department"] =
        "Department must be a valid string";
    }
  }

  if (assignment?.designation !== undefined) {
    if (
      assignment.designation !== null &&
      (typeof assignment.designation !== "string" ||
        !assignment.designation.trim())
    ) {
      validationErrors["assignment.designation"] = "Designation is required";
    }
  }

  let categoryIds = null;
  if (assignment?.categoriesHandled !== undefined) {
    if (
      !Array.isArray(assignment.categoriesHandled) ||
      assignment.categoriesHandled.length === 0
    ) {
      validationErrors["assignment.categoriesHandled"] =
        "At least one category is required";
    } else {
      categoryIds = [...new Set(assignment.categoriesHandled.filter(Boolean))];

      for (const categoryId of categoryIds) {
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
          validationErrors["assignment.categoriesHandled"] =
            "One or more category IDs are invalid";
          break;
        }
      }
    }
  }

  let hostelIds = null;
  if (assignment?.assignedHostelIds !== undefined) {
    if (
      !Array.isArray(assignment.assignedHostelIds) ||
      assignment.assignedHostelIds.length === 0
    ) {
      validationErrors["assignment.assignedHostelIds"] =
        "At least one assigned hostel is required";
    } else {
      hostelIds = [...new Set(assignment.assignedHostelIds.filter(Boolean))];

      for (const hostelId of hostelIds) {
        if (!mongoose.Types.ObjectId.isValid(hostelId)) {
          validationErrors["assignment.assignedHostelIds"] =
            "One or more hostel IDs are invalid";
          break;
        }
      }
    }
  }

  if (assignment?.isAvailable !== undefined) {
    if (typeof assignment.isAvailable !== "boolean") {
      validationErrors["assignment.isAvailable"] =
        "isAvailable must be true or false";
    }
  }

  if (accountStatus !== undefined) {
    if (
      !["pending", "active", "suspended", "blocked"].includes(accountStatus)
    ) {
      validationErrors.accountStatus =
        "Account status must be pending, active, suspended, or blocked";
    }
  }

  if (Object.keys(validationErrors).length > 0) {
    throw new ApiError(400, "Validation failed", validationErrors);
  }

  const worker = await User.findById(id);

  if (!worker || worker.role !== "worker") {
    throw new ApiError(404, "Worker not found");
  }

  if (profile?.employeeId?.trim()) {
    const existingEmployeeId = await User.findOne({
      _id: { $ne: id },
      "profile.employeeId": profile.employeeId.trim(),
    });

    if (existingEmployeeId) {
      throw new ApiError(409, "Validation failed", {
        "profile.employeeId": "Employee ID already exists",
      });
    }
  }

  if (categoryIds) {
    const categories = await Category.find({
      _id: { $in: categoryIds },
    }).select("_id isActive");

    if (categories.length !== categoryIds.length) {
      throw new ApiError(404, "Validation failed", {
        "assignment.categoriesHandled": "One or more categories not found",
      });
    }

    const inactiveCategory = categories.find((category) => !category.isActive);
    if (inactiveCategory) {
      throw new ApiError(400, "Validation failed", {
        "assignment.categoriesHandled": "One or more categories are inactive",
      });
    }
  }

  if (hostelIds) {
    const hostels = await Hostel.find({
      _id: { $in: hostelIds },
    }).select("_id isActive");

    if (hostels.length !== hostelIds.length) {
      throw new ApiError(404, "Validation failed", {
        "assignment.assignedHostelIds": "One or more hostels not found",
      });
    }

    const inactiveHostel = hostels.find((hostel) => !hostel.isActive);
    if (inactiveHostel) {
      throw new ApiError(400, "Validation failed", {
        "assignment.assignedHostelIds": "One or more hostels are inactive",
      });
    }
  }

  if (fullName !== undefined) {
    worker.fullName = fullName.trim();
  }

  if (phone !== undefined) {
    worker.phone = phone?.trim() || null;
  }

  if (profile?.employeeId !== undefined) {
    worker.profile.employeeId = profile.employeeId?.trim() || null;
  }

  if (profile?.department !== undefined) {
    worker.profile.department = profile.department?.trim() || null;
  }

  if (assignment?.designation !== undefined) {
    worker.assignment.designation = assignment.designation?.trim() || null;
  }

  if (categoryIds) {
    worker.assignment.categoriesHandled = categoryIds;
  }

  if (hostelIds) {
    worker.assignment.assignedHostelIds = hostelIds;
  }

  if (assignment?.isAvailable !== undefined) {
    worker.assignment.isAvailable = assignment.isAvailable;
  }

  if (accountStatus !== undefined) {
    worker.accountStatus = accountStatus;
  }

  worker.updatedBy = req.user._id;

  await worker.save();

  const updatedWorker = await User.findById(worker._id)
    .populate("assignment.categoriesHandled", "name slug")
    .populate("assignment.assignedHostelIds", "name code");

  return sendSuccess(res, {
    statusCode: 200,
    message: "Worker updated successfully",
    data: {
      worker: updatedWorker,
    },
  });
});
