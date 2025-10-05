const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "inventory", required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String },
    customerPhone: { type: String },
    quantitySold: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentMethod: { 
      type: String, 
      enum: ["cash", "online", "card", "upi", "cheque"], 
      required: true 
    },
    paymentStatus: { 
      type: String, 
      enum: ["pending", "completed", "failed"], 
      default: "completed" 
    },
    transactionId: { type: String }, // For online payments
    saleDate: { type: Date, default: Date.now },
    notes: { type: String },
    soldBy: { type: String }, // Employee name who made the sale
    status: { type: String, enum: ["active", "cancelled", "refunded"], default: "active" }
  },
  { timestamps: true }
);

// Index for better query performance
salesSchema.index({ companyId: 1, saleDate: -1 });
salesSchema.index({ companyId: 1, customerName: 1 });
salesSchema.index({ companyId: 1, paymentMethod: 1 });

module.exports = mongoose.model("Sales", salesSchema);
