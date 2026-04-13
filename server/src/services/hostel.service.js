import Hostel from "../models/hostel.model.js";
import ApiError from "../utils/apiError.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";

export const createHostelService = async (hostelData, userId) => {
  const existingHostel = await Hostel.findOne({ code: hostelData.code });

  if (existingHostel) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "Hostel with this code already exists",
    );
  }

  const hostel = await Hostel.create({
    ...hostelData,
    createdBy: userId,
    updatedBy: userId,
  });

  return hostel;
};

export const getAllHostelsService = async () => {
  const hostels = await Hostel.find(
    { isActive: true },
    { _id: 1, name: 1, code: 1 },
  ).sort({ name: 1 });

  return hostels;
};
export const getHostelByIdService = async (hostelId) => {
  const hostel = await Hostel.findById(hostelId)
    .populate("createdBy", "fullName email")
    .populate("updatedBy", "fullName email");

  if (!hostel) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Hostel not found");
  }

  return hostel;
};

export const updateHostelService = async (hostelId, updateData, userId) => {
  const existingHostel = await Hostel.findById(hostelId);

  if (!existingHostel) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Hostel not found");
  }

  if (updateData.code) {
    const duplicateHostel = await Hostel.findOne({
      code: updateData.code,
      _id: { $ne: hostelId },
    });

    if (duplicateHostel) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Hostel with this code already exists",
      );
    }
  }

  const updatedHostel = await Hostel.findByIdAndUpdate(
    hostelId,
    {
      ...updateData,
      updatedBy: userId,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  return updatedHostel;
};

export const deleteHostelService = async (hostelId) => {
  const existingHostel = await Hostel.findById(hostelId);

  if (!existingHostel) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Hostel not found");
  }

  await Hostel.findByIdAndDelete(hostelId);

  return null;
};
