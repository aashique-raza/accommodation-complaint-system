import mongoose from "mongoose";
import bcrypt from "bcryptjs";
// import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    phone: {
      type: String,
      trim: true,
      default: null,
      maxlength: [20, "Phone number cannot exceed 20 characters"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: ["student", "staff", "admin", "super_admin"],
      default: "student",
    },

    accountStatus: {
      type: String,
      enum: ["pending", "active", "suspended", "blocked"],
      default: "active",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    profile: {
      enrollmentNo: {
        type: String,
        trim: true,
        default: null,
      },

      employeeId: {
        type: String,
        trim: true,
        default: null,
      },

      department: {
        type: String,
        trim: true,
        default: null,
      },

      course: {
        type: String,
        trim: true,
        default: null,
      },

      year: {
        type: Number,
        min: [1, "Year cannot be less than 1"],
        max: [10, "Year cannot be more than 10"],
        default: null,
      },

      avatar: {
        type: String,
        trim: true,
        default: null,
      },
    },

    accommodation: {
      accommodationType: {
        type: String,
        enum: ["hostel", "pg", "rental"],
        default: "hostel",
      },

      hostelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hostel",
        default: null,
      },

      block: {
        type: String,
        trim: true,
        default: null,
      },

      floor: {
        type: String,
        trim: true,
        default: null,
      },

      roomNumber: {
        type: String,
        trim: true,
        default: null,
      },
    },

    assignment: {
      assignedHostelIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hostel",
        },
      ],

      assignedCategories: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    authMeta: {
      passwordChangedAt: {
        type: Date,
        default: null,
      },

      lastLoginAt: {
        type: Date,
        default: null,
      },

      passwordResetToken: {
        type: String,
        default: null,
        select: false,
      },

      passwordResetExpires: {
        type: Date,
        default: null,
        select: false,
      },

      refreshToken: {
        type: String,
        default: null,
        select: false,
      },

      refreshTokenExpiresAt: {
        type: Date,
        default: null,
        select: false,
      },
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
  },
);

// --------------------
// Indexes
// --------------------
// userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ "accommodation.hostelId": 1 });
userSchema.index({ "profile.enrollmentNo": 1 });
userSchema.index({ "profile.employeeId": 1 });

// --------------------
// Hash password before save
// --------------------
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  if (!this.isNew) {
    this.authMeta.passwordChangedAt = new Date();
  }
});

// --------------------
// Compare password method
// --------------------
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// --------------------
// Remove sensitive fields in JSON response
// --------------------
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();

  delete userObject.password;

  if (userObject.authMeta) {
    delete userObject.authMeta.passwordResetToken;
    delete userObject.authMeta.passwordResetExpires;
  }

  return userObject;
};

const User = mongoose.model("User", userSchema);

export default User;
