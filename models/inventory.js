const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true },
    description: { type: String },
    sku: { type: String, unique: true, required: true },
    quantity: { type: Number, default: 0, required: true },
    price: { type: Number, required: true },
    category: { type: String },
    supplier: { type: String },
    image: { type: String },
    status: { type: String, enum: ["in_stock", "low_stock", "out_of_stock"], default: "in_stock" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("inventory", schema);