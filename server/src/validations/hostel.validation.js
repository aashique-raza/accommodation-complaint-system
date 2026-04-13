import mongoose from "mongoose";
import ApiError from "../utils/apiError.js";
import {HTTP_STATUS} from "../utils/httpStatus.js";

const allowedHostelTypes = ["boys", "girls", "mixed", "staff", "other"];

const isValidString = (value) => typeof value === "string";

const isNonNegativeInteger = (value) =>
  Number.isInteger(value) && value >= 0;

export const validateCreateHostel = (body) => {
  const {
    name,
    code,
    type,
    address,
    totalBlocks,
    totalFloors,
    totalRooms,
    wardenName,
    wardenContact,
    isActive,
  } = body;

  if (!isValidString(name) || name.trim().length < 2 || name.trim().length > 100) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Hostel name must be between 2 and 100 characters"
    );
  }

  if (!isValidString(code) || code.trim().length < 2 || code.trim().length > 20) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Hostel code must be between 2 and 20 characters"
    );
  }

  if (type !== undefined && !allowedHostelTypes.includes(type)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid hostel type");
  }

  if (
    address !== undefined &&
    (!isValidString(address) || address.trim().length > 300)
  ) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Address cannot exceed 300 characters"
    );
  }

  if (totalBlocks !== undefined && !isNonNegativeInteger(totalBlocks)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Total blocks must be a non-negative integer"
    );
  }

  if (totalFloors !== undefined && !isNonNegativeInteger(totalFloors)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Total floors must be a non-negative integer"
    );
  }

  if (totalRooms !== undefined && !isNonNegativeInteger(totalRooms)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Total rooms must be a non-negative integer"
    );
  }

  if (
    wardenName !== undefined &&
    (!isValidString(wardenName) || wardenName.trim().length > 100)
  ) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Warden name cannot exceed 100 characters"
    );
  }

  if (
    wardenContact !== undefined &&
    (!isValidString(wardenContact) || wardenContact.trim().length > 20)
  ) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Warden contact cannot exceed 20 characters"
    );
  }

  if (isActive !== undefined && typeof isActive !== "boolean") {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "isActive must be a boolean value"
    );
  }

  return {
    name: name.trim(),
    code: code.trim().toUpperCase(),
    type,
    address: address?.trim(),
    totalBlocks,
    totalFloors,
    totalRooms,
    wardenName: wardenName?.trim(),
    wardenContact: wardenContact?.trim(),
    isActive,
  };
};

export const validateUpdateHostel = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Request body must be a valid object"
    );
  }

  const allowedFields = [
    "name",
    "code",
    "type",
    "address",
    "totalBlocks",
    "totalFloors",
    "totalRooms",
    "wardenName",
    "wardenContact",
    "isActive",
  ];

  const receivedFields = Object.keys(body);

  if (receivedFields.length === 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "At least one field is required to update"
    );
  }

  for (const field of receivedFields) {
    if (!allowedFields.includes(field)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Invalid field: ${field}`
      );
    }
  }

  const sanitizedData = {};

  if (body.name !== undefined) {
    if (
      typeof body.name !== "string" ||
      body.name.trim().length < 2 ||
      body.name.trim().length > 100
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Hostel name must be between 2 and 100 characters"
      );
    }
    sanitizedData.name = body.name.trim();
  }

  if (body.code !== undefined) {
    if (
      typeof body.code !== "string" ||
      body.code.trim().length < 2 ||
      body.code.trim().length > 20
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Hostel code must be between 2 and 20 characters"
      );
    }
    sanitizedData.code = body.code.trim().toUpperCase();
  }

  if (body.type !== undefined) {
    const allowedHostelTypes = ["boys", "girls", "mixed", "staff", "other"];

    if (!allowedHostelTypes.includes(body.type)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid hostel type");
    }
    sanitizedData.type = body.type;
  }

  if (body.address !== undefined) {
    if (
      typeof body.address !== "string" ||
      body.address.trim().length > 300
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Address cannot exceed 300 characters"
      );
    }
    sanitizedData.address = body.address.trim();
  }

  if (body.totalBlocks !== undefined) {
    if (!Number.isInteger(body.totalBlocks) || body.totalBlocks < 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Total blocks must be a non-negative integer"
      );
    }
    sanitizedData.totalBlocks = body.totalBlocks;
  }

  if (body.totalFloors !== undefined) {
    if (!Number.isInteger(body.totalFloors) || body.totalFloors < 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Total floors must be a non-negative integer"
      );
    }
    sanitizedData.totalFloors = body.totalFloors;
  }

  if (body.totalRooms !== undefined) {
    if (!Number.isInteger(body.totalRooms) || body.totalRooms < 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Total rooms must be a non-negative integer"
      );
    }
    sanitizedData.totalRooms = body.totalRooms;
  }

  if (body.wardenName !== undefined) {
    if (
      typeof body.wardenName !== "string" ||
      body.wardenName.trim().length > 100
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Warden name cannot exceed 100 characters"
      );
    }
    sanitizedData.wardenName = body.wardenName.trim();
  }

  if (body.wardenContact !== undefined) {
    if (
      typeof body.wardenContact !== "string" ||
      body.wardenContact.trim().length > 20
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Warden contact cannot exceed 20 characters"
      );
    }
    sanitizedData.wardenContact = body.wardenContact.trim();
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "isActive must be a boolean value"
      );
    }
    sanitizedData.isActive = body.isActive;
  }

  return sanitizedData;
};

export const validateHostelId = (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid hostel id");
  }

  return id;
};