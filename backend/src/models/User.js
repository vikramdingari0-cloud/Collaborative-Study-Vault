// ============================================
// User.js — User Schema (MongoDB Model)
// ============================================
// THIS IS THE MOST IMPORTANT MODEL IN YOUR APP.
//
// WHAT THIS DOES:
// Defines the structure of every user in your database.
//
// KEY ENGINEERING DECISIONS:
//
// 1. PASSWORD HASHING:
//    We NEVER store plain text passwords.
//    Before saving, bcrypt hashes the password.
//    Even if database is breached, passwords are safe.
//
// 2. PRE-SAVE HOOK:
//    Mongoose "pre" middleware runs BEFORE document is saved.
//    We use it to automatically hash passwords.
//    The controller doesn't need to know about hashing.
//
// 3. matchPassword METHOD:
//    Instance method that compares entered password
//    with the hashed password in database.
//    Used during login.
//
// 4. ROLES:
//    student — default role, can join workspaces
//    admin — can manage workspaces
//    university — can moderate content
//
// DATABASE INDEX:
//    email field is unique + indexed for fast lookups.
// ============================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true, // Removes whitespace from both ends
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // No duplicate emails
      lowercase: true, // Always store as lowercase
      trim: true,
      match: [
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
        "Please enter a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // NEVER return password in queries by default
    },

    role: {
      type: String,
      enum: ["student", "admin", "university"],
      default: "student",
    },

    avatar: {
      type: String,
      default: "", // Will store Cloudinary URL later
    },

    bio: {
      type: String,
      maxlength: [200, "Bio cannot exceed 200 characters"],
      default: "",
    },

    // Workspaces this user belongs to
    workspaces: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
      },
    ],

    // For guest demo login feature
    isGuest: {
      type: Boolean,
      default: false,
    },

    // Token version — increment to invalidate all existing JWTs (force logout all devices)
    tokenVersion: {
      type: Number,
      default: 0,
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },

    // Brute-force login protection
    // loginAttempts: count of consecutive failed logins
    // lockUntil: timestamp until which the account is locked
    loginAttempts: {
      type: Number,
      default: 0,
      select: false, // Never expose in API responses
    },

    lockUntil: {
      type: Date,
      select: false,
    },
  },
  {
    // Mongoose options
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// ============================================
// PRE-SAVE MIDDLEWARE — Hash password before saving
// ============================================
// This runs BEFORE every .save() call.
// We check if password was modified (avoids re-hashing on profile updates).
// bcrypt.genSalt(12) — 12 rounds of salt generation (industry standard).
// bcrypt.hash() — creates the hashed password.
// ============================================
userSchema.pre("save", async function () {
  // Only hash if password was actually changed
  if (!this.isModified("password")) {
    return;
  }

  // Generate salt (random data mixed with password before hashing)
  const salt = await bcrypt.genSalt(12);

  // Hash the password
  this.password = await bcrypt.hash(this.password, salt);
});

// ============================================
// INSTANCE METHOD — Compare entered password with stored hash
// ============================================
// Used during login:
//   const isMatch = await user.matchPassword(enteredPassword);
//
// bcrypt.compare() handles the comparison securely.
// We NEVER decrypt the hash — we hash the input and compare.
// ============================================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ isGuest: 1, createdAt: 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;
