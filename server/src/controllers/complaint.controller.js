import Complaint from "../models/complaint.model.js";
import Category from "../models/category.model.js";
import Hostel from "../models/hostel.model.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";

export const createComplaint = asyncHandler(async (req, res) => {
  const { title, description, category, hostel, roomNumber } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, "Complaint title is required");
  }

  if (!description || !description.trim()) {
    throw new ApiError(400, "Complaint description is required");
  }

  if (!category) {
    throw new ApiError(400, "Category is required");
  }

  if (!hostel) {
    throw new ApiError(400, "Hostel is required");
  }

  const existingCategory = await Category.findById(category);

  if (!existingCategory) {
    throw new ApiError(404, "Category not found");
  }

  if (!existingCategory.isActive) {
    throw new ApiError(400, "Selected category is inactive");
  }

  const existingHostel = await Hostel.findById(hostel);

  if (!existingHostel) {
    throw new ApiError(404, "Hostel not found");
  }

  const complaint = await Complaint.create({
    title: title.trim(),
    description: description.trim(),
    category,
    hostel,
    roomNumber: roomNumber?.trim() || "",
    createdBy: req.user._id,
    status: "pending",
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    data: complaint,
    message: "Complaint created successfully",
  });
});
