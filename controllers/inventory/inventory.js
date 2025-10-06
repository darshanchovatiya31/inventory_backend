const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Company = require("../../models/company");
const response = require("../../utils/response");
const stockAdjustment = require("../../models/stockAdjustment");
const Inventory = require("../../models/zindex").inventory;

exports.getCompanyInventory = asyncHandler(async (req, res) => {
  const companyId = req.user._id;
  let query = { companyId };

  if (req.query.category) query.category = req.query.category;
  if (req.query.status) query.status = req.query.status;
  if (req.query.search) query.name = { $regex: req.query.search, $options: 'i' };
  if (req.query.minQuantity) query.quantity = { $gte: Number(req.query.minQuantity) };
  if (req.query.maxQuantity) query.quantity = { ...query.quantity, $lte: Number(req.query.maxQuantity) };
  if (req.query.fromDate) query.createdAt = { $gte: new Date(req.query.fromDate) };
  if (req.query.toDate) query.createdAt = { ...query.createdAt || {}, $lte: new Date(req.query.toDate) };

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const skip = (page - 1) * limit;

  const inventories = await Inventory.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  return response.success("Inventories fetched successfully", inventories, res);
});

exports.getDashboardInventory = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  if (companyId !== req.user._id.toString()) return response.forbidden("Unauthorized", res);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let query = { companyId: new mongoose.Types.ObjectId(companyId) };

  if (req.query.category) query.category = req.query.category;
  if (req.query.status) query.status = req.query.status;
  if (req.query.search) query.name = { $regex: req.query.search, $options: 'i' };
  if (req.query.minQuantity) query.quantity = { $gte: Number(req.query.minQuantity) };
  if (req.query.maxQuantity) query.quantity = { ...query.quantity || {}, $lte: Number(req.query.maxQuantity) };

  let periodStart, periodEnd;
  if (req.query.fromDate) {
    periodStart = new Date(req.query.fromDate);
    periodEnd = new Date(req.query.toDate || now);
    query.createdAt = { $gte: periodStart, $lte: periodEnd };
  } else {
    periodStart = startOfMonth;
    periodEnd = endOfMonth;
  }

  const totalItems = await Inventory.countDocuments(query);

  const monthlyItems = await Inventory.countDocuments({ ...query, createdAt: { $gte: periodStart, $lte: periodEnd } });

  const totalValueAgg = await Inventory.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: { $multiply: ["$quantity", "$price"] } } } }
  ]);
  const totalValue = totalValueAgg[0]?.total || 0;

  const lowStockQuery = { ...query, quantity: { $lt: 10 } };
  const lowStock = await Inventory.countDocuments(lowStockQuery);

  res.status(200).json({
    status: true,
    message: "Inventory stats fetched",
    data: {
      totalItems,
      monthlyItems,
      totalValue,
      lowStock
    }
  });
});

exports.createInventory = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  if (companyId !== req.user._id.toString()) return response.forbidden("Unauthorized", res);

  const { name, description, sku, quantity, price, category, supplier } = req.body;
  if (!name || !sku || !quantity || !price) {
    return response.badRequest("Required fields missing", res);
  }

  let image = null;
  if (req.file) {
    image = req.file.path;
  }

  const newInventory = await Inventory.create({
    companyId,
    name,
    description,
    sku,
    quantity: Number(quantity),
    price: Number(price),
    category,
    supplier,
    image,
    status: Number(quantity) > 10 ? 'in_stock' : Number(quantity) > 0 ? 'low_stock' : 'out_of_stock'
  });

  return response.success("Inventory item created successfully", newInventory, res);
});

exports.adjustInventory = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  if (companyId !== req.user._id.toString()) return response.forbidden("Unauthorized", res);

  const { sku, adjustment } = req.body;
  if (!sku || adjustment === undefined) {
    return response.badRequest("SKU and adjustment are required", res);
  }

  const inventoryItem = await Inventory.findOne({ companyId, sku });
  if (!inventoryItem) {
    return response.notFound("Inventory item not found", res);
  }

  const newQuantity = inventoryItem.quantity + Number(adjustment);
  inventoryItem.quantity = newQuantity < 0 ? 0 : newQuantity;
  inventoryItem.status = inventoryItem.quantity > 10 ? 'in_stock' : inventoryItem.quantity > 0 ? 'low_stock' : 'out_of_stock';
  await inventoryItem.save();

  return response.success("Inventory quantity adjusted successfully", inventoryItem, res);
});

exports.updateInventory = asyncHandler(async (req, res) => {
  const { inventoryId } = req.params;
  const companyId = req.user._id;

  const inventoryItem = await Inventory.findOne({ _id: inventoryId, companyId });
  if (!inventoryItem) {
    return response.notFound("Inventory item not found", res);
  }

  const { name, description, sku, quantity, price, category, supplier } = req.body;

  if (name) inventoryItem.name = name;
  if (description) inventoryItem.description = description;
  if (sku) inventoryItem.sku = sku;
  if (quantity !== undefined) {
    inventoryItem.quantity = Number(quantity);
    inventoryItem.status = inventoryItem.quantity > 10 ? 'in_stock' : inventoryItem.quantity > 0 ? 'low_stock' : 'out_of_stock';
  }
  if (price !== undefined) inventoryItem.price = Number(price);
  if (category) inventoryItem.category = category;
  if (supplier) inventoryItem.supplier = supplier;
  if (req.file) {
    // Optionally delete old image if exists
    if (inventoryItem.image && fs.existsSync(inventoryItem.image)) {
      fs.unlinkSync(inventoryItem.image);
    }
    inventoryItem.image = req.file.path;
  }

  await inventoryItem.save();
  return response.success("Inventory item updated successfully", inventoryItem, res);
});

exports.deleteInventory = asyncHandler(async (req, res) => {
  const { inventoryId } = req.params;
  const companyId = req.user._id;

  const inventoryItem = await Inventory.findOne({ _id: inventoryId, companyId });
  if (!inventoryItem) {
    return response.notFound("Inventory item not found", res);
  }

  // Optionally delete image if exists
  if (inventoryItem.image && fs.existsSync(inventoryItem.image)) {
    fs.unlinkSync(inventoryItem.image);
  }

  await inventoryItem.deleteOne();
  return response.success("Inventory item deleted successfully", null, res);
});

exports.getInventoryInfo = asyncHandler(async (req, res) => {
  const { companyId, sku } = req.query;
  if (!companyId || !sku) {
    return response.badRequest("Missing required fields", res);
  }

  const inventoryDetails = await Inventory.findOne({ companyId, sku });

  if (!inventoryDetails) {
    return response.notFound("No inventory item found", null, res);
  }

  return response.success("Inventory data fetched", inventoryDetails, res);
});



exports.createStockAdjustment = asyncHandler(async (req, res) => {
  const companyId = req.user._id.toString();
  const { inventoryId, type, quantity, price, supplier, notes } = req.body;

  if (!inventoryId || !type || !quantity || !price) {
    return response.badRequest("Required fields missing", res);
  }

  const inventoryItem = await Inventory.findOne({ _id: inventoryId, companyId });
  if (!inventoryItem) {
    return response.notFound("Inventory item not found", res);
  }

  const adjustmentQuantity = Number(quantity);
  let newQuantity;
  if (type === "add") {
    newQuantity = inventoryItem.quantity + adjustmentQuantity;
  } else if (type === "subtract") {
    newQuantity = inventoryItem.quantity - adjustmentQuantity;
    if (newQuantity < 0) newQuantity = 0; // Prevent negative
  } else {
    return response.badRequest("Invalid type", res);
  }

  inventoryItem.quantity = newQuantity;
  inventoryItem.status = newQuantity > 10 ? 'in_stock' : newQuantity > 0 ? 'low_stock' : 'out_of_stock';
  await inventoryItem.save();

  const newAdjustment = await stockAdjustment.create({
    inventoryId,
    type,
    quantity: adjustmentQuantity,
    price: Number(price),
    supplier,
    notes,
  });

  return response.success("Stock adjusted successfully", newAdjustment, res);
});

// New function for getting stock history
exports.getStockHistory = asyncHandler(async (req, res) => {
  const companyId = req.user._id.toString();
  const { inventoryId } = req.params;

  const inventoryItem = await Inventory.findOne({ _id: inventoryId, companyId });
  if (!inventoryItem) {
    return response.notFound("Inventory item not found", res);
  }

  const history = await stockAdjustment.find({ inventoryId }).sort({ createdAt: -1 });

  return response.success("Stock history fetched successfully", history, res);
});