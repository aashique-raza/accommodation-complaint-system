import Complaint from "../models/complaint.model.js";
import ComplainActivity from "../models/complainActivity.model.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";

const complaintPopulateOptions = [
  { path: "category", select: "name code -_id" },
  { path: "hostel", select: "name -_id" },
  { path: "createdBy", select: "fullName email role" },
];
export const getComplaintHistory = asyncHandler(async (req, res) => {
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

  const history = await ComplainActivity.find({ complaint: id })
    .select("-__v -updatedAt -complaint")
    .populate({
      path: "performedBy",
      select: "fullName email role",
    })
    .sort({ createdAt: 1 });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    data: {
      complaint,
      history,
    },
    message: "Complaint history fetched successfully",
  });
});
