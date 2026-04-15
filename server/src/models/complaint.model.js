import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Complaint title is required"],
      trim: true,
      minlength: [3, "Complaint title must be at least 3 characters"],
      maxlength: [100, "Complaint title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Complaint description is required"],
      trim: true,
      minlength: [10, "Complaint description must be at least 10 characters"],
      maxlength: [1000, "Complaint description cannot exceed 1000 characters"],
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },

    status: {
      type: String,
      enum: {
        values: ["pending", "in_progress", "resolved", "rejected"],
        message:
          "Status must be one of: pending, in_progress, resolved, rejected",
      },
      default: "pending",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "CreatedBy user is required"],
    },

    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: [true, "Hostel is required"],
    },

    roomNumber: {
      type: String,
      trim: true,
      maxlength: [20, "Room number cannot exceed 20 characters"],
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

complaintSchema.index({ createdBy: 1, createdAt: -1 });
complaintSchema.index({ hostel: 1, createdAt: -1 });
complaintSchema.index({ category: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
