import mongoose from "mongoose";

const ACTIVITY_TYPES = [
  "created",
  "status_changed",
  "assigned",
  "reassigned",
];

const COMPLAINT_STATUSES = ["pending", "in_progress", "resolved", "rejected"];

const complaintActivitySchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },

    actionType: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: true,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    oldStatus: {
      type: String,
      enum: COMPLAINT_STATUSES,
    },

    newStatus: {
      type: String,
      enum: COMPLAINT_STATUSES,
    },

    oldAssignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    newAssignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note cannot exceed 500 characters"],
    },
  },
  { timestamps: true },
);

complaintActivitySchema.index({ complaint: 1, createdAt: 1 });

const ComplaintActivity = mongoose.model(
  "ComplaintActivity",
  complaintActivitySchema,
);

export default ComplaintActivity;