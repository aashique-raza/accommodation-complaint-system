import Category from "../models/category.model.js";
import ApiError from "../utils/ApiError.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";

const createCategory = asyncHandler(async (req, res) => {
  const { name, code, description, applicableTo, isActive } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Category name is required");
  }

  if (!Array.isArray(applicableTo) || applicableTo.length === 0) {
    throw new ApiError(400, "At least one applicable target is required");
  }

  const existingCategoryByName = await Category.findOne({
    name: name.trim(),
  });

  if (existingCategoryByName) {
    throw new ApiError(409, "Category with this name already exists");
  }

  if (code && code.trim()) {
    const existingCategoryByCode = await Category.findOne({
      code: code.trim().toLowerCase(),
    });

    if (existingCategoryByCode) {
      throw new ApiError(409, "Category with this code already exists");
    }
  }

  const category = await Category.create({
    name: name.trim(),
    code: code?.trim()?.toLowerCase(),
    description: description?.trim() || "",
    applicableTo,
    isActive: typeof isActive === "boolean" ? isActive : true,
    createdBy: req.user._id,
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: category,
    message: "Category created successfully",
  });
});

const getAllCategories = asyncHandler(async (req, res) => {
  const { applicableTo, isActive } = req.query;

  const filter = {};

  try {
    if (applicableTo) {
      filter.applicableTo = applicableTo;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .populate("createdBy", "fullName email role");

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      data: categories,
      message: "Categories fetched successfully",
    });
  } catch (error) {
    throw new ApiError(500, "Failed to fetch categories");
  }
});

const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: category,
    message: "Category fetched successfully",
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, code, description, applicableTo, isActive } = req.body;

  const category = await Category.findById(id);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  if (name !== undefined) {
    if (!name.trim()) {
      throw new ApiError(400, "Category name cannot be empty");
    }

    const existingCategoryByName = await Category.findOne({
      name: name.trim(),
      _id: { $ne: id },
    });

    if (existingCategoryByName) {
      throw new ApiError(409, "Category with this name already exists");
    }

    category.name = name.trim();
  }

  if (code !== undefined) {
    if (code && code.trim()) {
      const normalizedCode = code.trim().toLowerCase();

      const existingCategoryByCode = await Category.findOne({
        code: normalizedCode,
        _id: { $ne: id },
      });

      if (existingCategoryByCode) {
        throw new ApiError(409, "Category with this code already exists");
      }

      category.code = normalizedCode;
    } else {
      category.code = undefined;
    }
  }

  if (description !== undefined) {
    category.description = description?.trim() || "";
  }

  if (applicableTo !== undefined) {
    if (!Array.isArray(applicableTo) || applicableTo.length === 0) {
      throw new ApiError(400, "At least one applicable target is required");
    }

    category.applicableTo = applicableTo;
  }

  if (isActive !== undefined) {
    category.isActive = isActive;
  }

  const updatedCategory = await category.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: updatedCategory,
    message: "Category updated successfully",
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  await category.deleteOne();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: "Category deleted successfully",
  });
});

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
