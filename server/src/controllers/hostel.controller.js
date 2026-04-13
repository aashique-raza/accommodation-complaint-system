import {
  createHostelService,
  getAllHostelsService,
  getHostelByIdService,
  updateHostelService,
  deleteHostelService,
} from "../services/hostel.service.js";
import {
  validateCreateHostel,
  validateUpdateHostel,
  validateHostelId,
} from "../validations/hostel.validation.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";

export const createHostel = asyncHandler(async (req, res) => {
  const validatedData = validateCreateHostel(req.body);

  const hostel = await createHostelService(validatedData, req.user._id);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    data: hostel,
    message: "Hostel created successfully",
  });
});

export const getAllHostels = asyncHandler(async (req, res) => {
  const hostels = await getAllHostelsService();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: hostels,
    message: "Hostels fetched successfully",
  });
});

export const getHostelById = asyncHandler(async (req, res) => {
  const hostelId = validateHostelId(req.params.id);

  const hostel = await getHostelByIdService(hostelId);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: hostel,
    message: "Hostel fetched successfully",
  });
});

export const updateHostel = asyncHandler(async (req, res) => {
  const hostelId = validateHostelId(req.params.id);
  const validatedData = validateUpdateHostel(req.body);

  const updatedHostel = await updateHostelService(
    hostelId,
    validatedData,
    req.user._id,
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: updatedHostel,
    message: "Hostel updated successfully",
  });
});

export const deleteHostel = asyncHandler(async (req, res) => {
  const hostelId = validateHostelId(req.params.id);

  await deleteHostelService(hostelId);

  return sendSuccess(res, { 
    statusCode: HTTP_STATUS.OK,
    message: "Hostel deleted successfully",
  });
});
