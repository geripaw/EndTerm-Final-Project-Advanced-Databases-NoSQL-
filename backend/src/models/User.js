const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    customerId: { type: Number, index: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    country: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);