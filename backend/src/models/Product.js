const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    stockCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);