import Complaint from "../models/complaint.model.js";
import Category from "../models/category.model.js";
import Hostel from "../models/hostel.model.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";

const ALLOWED_COMPLAINT_STATUSES = [
  "pending",
  "in_progress",
  "resolved",
  "rejected",
];

const complaintPopulateOptions = [
  { path: "category", select: "name code -_id" },
  { path: "hostel", select: "name -_id" },
  { path: "createdBy", select: "fullName email role" },
];

export const createComplaint = asyncHandler(async (req, res) => {
  const { title, description, category, hostel, roomNumber } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Complaint title is required");
  }

  if (!description || !description.trim()) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Complaint description is required",
    );
  }

  if (!category) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Category is required");
  }

  if (!hostel) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Hostel is required");
  }

  const existingCategory = await Category.findById(category);

  if (!existingCategory) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Category not found");
  }

  if (!existingCategory.isActive) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Selected category is inactive",
    );
  }

  const existingHostel = await Hostel.findById(hostel);

  if (!existingHostel) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Hostel not found");
  }

  const complaint = await Complaint.create({
    title: title.trim(),
    description: description.trim(),
    category,
    hostel,
    roomNumber: roomNumber?.trim(),
    createdBy: req.user._id,
    status: "pending",
  });

  const populatedComplaint = await Complaint.findById(complaint._id).populate(
    complaintPopulateOptions,
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    data: populatedComplaint,
    message: "Complaint created successfully",
  });
});

export const getMyComplaints = asyncHandler(async (req, res) => {
  const complaints = await Complaint.find({ createdBy: req.user._id })
    .populate(complaintPopulateOptions)
    .sort({ createdAt: -1 });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: complaints,
    message: "My complaints fetched successfully",
  });
});

export const getComplaintById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let complaintQuery;

  if (req.user.role === "admin" || req.user.role === "super_admin") {
    complaintQuery = Complaint.findById(id);
  } else {
    complaintQuery = Complaint.findOne({
      _id: id,
      createdBy: req.user._id,
    });
  }

  const complaint = await complaintQuery.populate(complaintPopulateOptions);

  if (!complaint) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Complaint not found");
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: complaint,
    message: "Complaint fetched successfully",
  });
});

export const getAllComplaints = asyncHandler(async (req, res) => {
  const { status, category, hostel } = req.query;

  const filter = {};

  if (status) {
    const normalizedStatus = status.trim().toLowerCase();

    if (!ALLOWED_COMPLAINT_STATUSES.includes(normalizedStatus)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid complaint status");
    }

    filter.status = normalizedStatus;
  }

  if (category) {
    filter.category = category;
  }

  if (hostel) {
    filter.hostel = hostel;
  }

  const complaints = await Complaint.find(filter)
    .populate(complaintPopulateOptions)
    .sort({ createdAt: -1 });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: complaints,
    message: "Complaints fetched successfully",
  });
});

export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !status.trim()) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Status is required");
  }

  const normalizedStatus = status.trim().toLowerCase();

  if (!ALLOWED_COMPLAINT_STATUSES.includes(normalizedStatus)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid complaint status");
  }

  const complaint = await Complaint.findById(id);

  if (!complaint) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Complaint not found");
  }

  complaint.status = normalizedStatus;
  await complaint.save();

  const updatedComplaint = await Complaint.findById(complaint._id).populate(
    complaintPopulateOptions,
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: updatedComplaint,
    message: "Complaint status updated successfully",
  });
});
