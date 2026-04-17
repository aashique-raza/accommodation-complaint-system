import Complaint from "../models/complaint.model.js";
import Category from "../models/category.model.js";
import Hostel from "../models/hostel.model.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";
import ComplaintActivity from "../models/complainActivity.model.js";
import mongoose from "mongoose";
import User from "../models/user.model.js";
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
  { path: "updatedBy", select: "fullName email role" },
  {
    path: "assignedTo",
    select:
      "fullName email phone role profile.employeeId assignment.designation",
  },
  {
    path: "assignedBy",
    select: "fullName email role",
  },
];

const ALLOWED_STATUS_TRANSITIONS = {
  pending: ["in_progress"],
  in_progress: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
};

const ALLOWED_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "title",
  "status",
  "roomNumber",
];

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

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
  await ComplaintActivity.create({
    complaint: complaint._id,
    actionType: "created",
    performedBy: req.user._id,
    note: "Complaint submitted",
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
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = req.query.search?.trim() || "";
  const sortBy = req.query.sortBy?.trim() || "createdAt";
  const sortOrder = req.query.sortOrder?.trim().toLowerCase() || "desc";

  if (page < 1) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Page must be greater than or equal to 1",
    );
  }

  if (limit < 1 || limit > 100) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Limit must be between 1 and 100",
    );
  }

  if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid sortBy field");
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid sortOrder value");
  }

  const skip = (page - 1) * limit;
  const filter = { createdBy: req.user._id };

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
      { roomNumber: { $regex: safeSearch, $options: "i" } },
    ];
  }

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const [complaints, totalDocuments] = await Promise.all([
    Complaint.find(filter)
      .populate(complaintPopulateOptions)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalDocuments / limit);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: {
      complaints,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalDocuments,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search,
        sortBy,
        sortOrder,
      },
    },
    message: "My complaints fetched successfully",
  });
});
export const getComplaintById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid complaint id");
  }

  let complaintQuery;

  if (req.user.role === "admin" || req.user.role === "super_admin") {
    complaintQuery = Complaint.findById(id);
  } else if (req.user.role === "worker") {
    complaintQuery = Complaint.findOne({
      _id: id,
      assignedTo: req.user._id,
    });
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
  const { status, category, hostel, assignedTo } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = req.query.search?.trim() || "";
  const sortBy = req.query.sortBy?.trim() || "createdAt";
  const sortOrder = req.query.sortOrder?.trim().toLowerCase() || "desc";

  if (page < 1) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Page must be greater than or equal to 1",
    );
  }

  if (limit < 1 || limit > 100) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Limit must be between 1 and 100",
    );
  }

  if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid sortBy field");
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid sortOrder value");
  }

  const filter = {};

  if (status) {
    const normalizedStatus = status.trim().toLowerCase();

    if (!ALLOWED_COMPLAINT_STATUSES.includes(normalizedStatus)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid complaint status");
    }

    filter.status = normalizedStatus;
  }
  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (category) {
    filter.category = category;
  }

  if (hostel) {
    filter.hostel = hostel;
  }

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
      { roomNumber: { $regex: safeSearch, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const [complaints, totalDocuments] = await Promise.all([
    Complaint.find(filter)
      .populate(complaintPopulateOptions)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalDocuments / limit);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: {
      complaints,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalDocuments,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        status: status || "",
        category: category || "",
        hostel: hostel || "",
        search,
        sortBy,
        sortOrder,
        assignedTo: assignedTo || "",
      },
    },
    message: "Complaints fetched successfully",
  });
});

export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

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

  const currentStatus = complaint.status;

  if (currentStatus === normalizedStatus) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Complaint is already ${normalizedStatus}`,
    );
  }

  const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowedNextStatuses.includes(normalizedStatus)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Status cannot be changed from ${currentStatus} to ${normalizedStatus}`,
    );
  }

  complaint.status = normalizedStatus;
  complaint.updatedBy = req.user._id;

  if (normalizedStatus === "resolved") {
    complaint.resolvedAt = new Date();
  }

  await complaint.save();

  await ComplaintActivity.create({
    complaint: complaint._id,
    actionType: "status_changed",
    performedBy: req.user._id,
    oldStatus: currentStatus,
    newStatus: normalizedStatus,
    note: note?.trim(),
  });

  const updatedComplaint = await Complaint.findById(complaint._id).populate(
    complaintPopulateOptions,
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: updatedComplaint,
    message: "Complaint status updated successfully",
  });
});

export const assignComplaint = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { workerId, note } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid complaint id");
  }

  if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Valid workerId is required");
  }

  const complaint = await Complaint.findById(id);

  if (!complaint) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Complaint not found");
  }

  if (["resolved", "rejected"].includes(complaint.status)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Cannot assign a complaint that is already ${complaint.status}`,
    );
  }

  const worker = await User.findById(workerId);

  if (!worker || worker.role !== "worker") {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Worker not found");
  }

  if (worker.accountStatus !== "active") {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Worker account is not active");
  }

  if (!worker.assignment?.isAvailable) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Worker is currently unavailable",
    );
  }

  const handlesHostel = worker.assignment?.assignedHostelIds?.some(
    (hostelId) => hostelId.toString() === complaint.hostel.toString(),
  );

  if (!handlesHostel) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Worker is not assigned to this hostel",
    );
  }

  const handlesCategory = worker.assignment?.categoriesHandled?.some(
    (categoryId) => categoryId.toString() === complaint.category.toString(),
  );

  if (!handlesCategory) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Worker does not handle this complaint category",
    );
  }

  const previousAssignedTo = complaint.assignedTo
    ? complaint.assignedTo.toString()
    : null;

  if (previousAssignedTo === workerId) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Complaint is already assigned to this worker",
    );
  }

  const actionType = complaint.assignedTo ? "reassigned" : "assigned";

  complaint.assignedTo = worker._id;
  complaint.assignedBy = req.user._id;
  complaint.assignedAt = new Date();
  complaint.updatedBy = req.user._id;

  await complaint.save();

  worker.assignment.lastAssignedAt = new Date();
  worker.updatedBy = req.user._id;
  await worker.save();

  await ComplaintActivity.create({
    complaint: complaint._id,
    actionType,
    performedBy: req.user._id,
    oldAssignedTo: previousAssignedTo,
    newAssignedTo: worker._id,
    note: note?.trim() || "",
  });

  const updatedComplaint = await Complaint.findById(complaint._id).populate(
    complaintPopulateOptions,
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: updatedComplaint,
    message:
      actionType === "assigned"
        ? "Complaint assigned successfully"
        : "Complaint reassigned successfully",
  });
});

export const getMyAssignedComplaints = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = req.query.search?.trim() || "";
  const sortBy = req.query.sortBy?.trim() || "createdAt";
  const sortOrder = req.query.sortOrder?.trim().toLowerCase() || "desc";

  if (page < 1) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Page must be greater than or equal to 1",
    );
  }

  if (limit < 1 || limit > 100) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Limit must be between 1 and 100",
    );
  }

  if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid sortBy field");
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid sortOrder value");
  }

  const filter = {
    assignedTo: req.user._id,
  };

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
      { roomNumber: { $regex: safeSearch, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const [complaints, totalDocuments] = await Promise.all([
    Complaint.find(filter)
      .populate(complaintPopulateOptions)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalDocuments / limit);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: {
      complaints,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalDocuments,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search,
        sortBy,
        sortOrder,
      },
    },
    message: "Assigned complaintss fetched successfully",
  });
});
