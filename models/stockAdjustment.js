const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "inventory", required: true },
    type: { type: String, enum: ["add", "subtract"], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // Price per unit at the time of adjustment
    supplier: { type: String }, // Supplier name, optional for subtract
    notes: { type: String }, // Optional notes or reason
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockAdjustment", schema);