import mongoose from "mongoose";

const hostelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hostel name is required"],
      trim: true,
      minlength: [2, "Hostel name must be at least 2 characters"],
      maxlength: [100, "Hostel name cannot exceed 100 characters"],
    },

    code: {
      type: String,
      required: [true, "Hostel code is required"],
      trim: true,
      uppercase: true,
      unique: true,
      minlength: [2, "Hostel code must be at least 2 characters"],
      maxlength: [20, "Hostel code cannot exceed 20 characters"],
    },

    type: {
      type: String,
      enum: ["boys", "girls", "mixed", "staff", "other"],
      default: "other",
    },

    address: {
      type: String,
      trim: true,
      maxlength: [300, "Address cannot exceed 300 characters"],
    },

    totalBlocks: {
      type: Number,
      min: [0, "Total blocks cannot be negative"],
      default: 0,
    },

    totalFloors: {
      type: Number,
      min: [0, "Total floors cannot be negative"],
      default: 0,
    },

    totalRooms: {
      type: Number,
      min: [0, "Total rooms cannot be negative"],
      default: 0,
    },

    wardenName: {
      type: String,
      trim: true,
      maxlength: [100, "Warden name cannot exceed 100 characters"],
    },

    wardenContact: {
      type: String,
      trim: true,
      maxlength: [20, "Warden contact cannot exceed 20 characters"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
  }
);

// Indexes
hostelSchema.index({ name: 1 });
hostelSchema.index({ code: 1 }, { unique: true });
hostelSchema.index({ isActive: 1 });

const Hostel = mongoose.model("Hostel", hostelSchema);

export default Hostel;