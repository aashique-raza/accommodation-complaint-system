import mongoose from "mongoose";

const { Schema, model } = mongoose;

const APPLICABLE_TO = ["hostel", "pg", "residential"];

function generateCodeFromName(name) {
  if (!name || typeof name !== "string") return "";

  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },

    code: {
      type: String,
      required: [true, "Category code is required"],
      trim: true,
      lowercase: true,
      unique: true,
      minlength: [2, "Category code must be at least 2 characters"],
      maxlength: [50, "Category code cannot exceed 50 characters"],
      match: [
        /^[a-z0-9_]+$/,
        "Category code can only contain lowercase letters, numbers, and underscores",
      ],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
      default: "",
    },

    applicableTo: {
      type: [String],
      required: [true, "Applicable target is required"],
      enum: {
        values: APPLICABLE_TO,
        message: "Applicable target must be hostel, pg, or residential",
      },
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one applicable target is required",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: [0, "Sort order cannot be negative"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },

  {
    timestamps: true,
    versionKey: false,
  },
);

/*
  Ensure duplicates inside applicableTo are removed.
  Example: ["hostel", "hostel"] => ["hostel"]
*/
categorySchema.pre("validate", function () {
  if (this.name && (!this.code || !this.code.trim())) {
    this.code = generateCodeFromName(this.name);
  }

  if (Array.isArray(this.applicableTo)) {
    this.applicableTo = [
      ...new Set(
        this.applicableTo.map((item) => String(item).trim().toLowerCase()),
      ),
    ];
  }
});

/*
  Useful indexes
*/
categorySchema.index({ code: 1 }, { unique: true });
categorySchema.index({ isActive: 1 });
categorySchema.index({ applicableTo: 1 });
categorySchema.index({ sortOrder: 1, createdAt: -1 });

const Category = model("Category", categorySchema);

export default Category;
