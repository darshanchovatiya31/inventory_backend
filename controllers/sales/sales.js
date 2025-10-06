const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Sales = require("../../models/sales");
const Inventory = require("../../models/inventory");
const response = require("../../utils/response");

// Get all sales for a company with filtering and pagination
exports.getCompanySales = asyncHandler(async (req, res) => {
  const companyId = req.user._id;
  let query = { companyId };

  // Filtering options
  if (req.query.paymentMethod) query.paymentMethod = req.query.paymentMethod;
  if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;
  if (req.query.status) query.status = req.query.status;
  if (req.query.customerName) query.customerName = { $regex: req.query.customerName, $options: 'i' };
  if (req.query.paymentReceivedBy) query.paymentReceivedBy = { $regex: req.query.paymentReceivedBy, $options: 'i' };
  
  // Date range filtering
  if (req.query.startDate && req.query.endDate) {
    query.saleDate = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  }

  // Amount range filtering
  if (req.query.minAmount) query.totalAmount = { $gte: Number(req.query.minAmount) };
  if (req.query.maxAmount) query.totalAmount = { ...query.totalAmount, $lte: Number(req.query.maxAmount) };

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const sales = await Sales.find(query)
    .populate('inventoryId', 'name sku price image')
    .sort({ saleDate: -1 })
    .skip(skip)
    .limit(limit);

  const totalSales = await Sales.countDocuments(query);

  return response.success("Sales fetched successfully", {
    sales,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalSales / limit),
      totalSales,
      hasNext: page < Math.ceil(totalSales / limit),
      hasPrev: page > 1
    }
  }, res);
});

// Get sales dashboard statistics
exports.getSalesDashboard = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  if (companyId !== req.user._id.toString()) return response.forbidden("Unauthorized", res);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));

  // Total sales count
  const totalSales = await Sales.countDocuments({ companyId, status: 'active' });
  
  // Monthly sales count
  const monthlySales = await Sales.countDocuments({ 
    companyId, 
    status: 'active',
    saleDate: { $gte: startOfMonth, $lte: endOfMonth } 
  });

  // Weekly sales count
  const weeklySales = await Sales.countDocuments({ 
    companyId, 
    status: 'active',
    saleDate: { $gte: startOfWeek, $lte: endOfWeek } 
  });

  // Total revenue
  const totalRevenue = await Sales.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId), status: 'active' } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
  ]);

  // Monthly revenue
  const monthlyRevenue = await Sales.aggregate([
    { 
      $match: { 
        companyId: new mongoose.Types.ObjectId(companyId), 
        status: 'active',
        saleDate: { $gte: startOfMonth, $lte: endOfMonth }
      } 
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
  ]);

  // Payment method breakdown
  const paymentBreakdown = await Sales.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId), status: 'active' } },
    { $group: { _id: "$paymentMethod", count: { $sum: 1 }, total: { $sum: "$totalAmount" } } }
  ]);

  // Top selling products
  const topProducts = await Sales.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId), status: 'active' } },
    { 
      $group: { 
        _id: "$inventoryId", 
        totalSold: { $sum: "$quantitySold" },
        totalRevenue: { $sum: "$totalAmount" }
      } 
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'inventories',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' }
  ]);

  res.status(200).json({
    status: true,
    message: "Sales dashboard stats fetched",
    data: {
      totalSales,
      monthlySales,
      weeklySales,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      paymentBreakdown,
      topProducts
    }
  });
});

// Create a new sale
exports.createSale = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  if (companyId !== req.user._id.toString()) return response.forbidden("Unauthorized", res);

  const { 
    inventoryId, 
    customerName, 
    customerEmail, 
    customerPhone, 
    quantitySold, 
    unitPrice, 
    paymentMethod, 
    paymentStatus,
    transactionId,
    notes,
    paymentReceivedBy
  } = req.body;

  if (!inventoryId || !customerName || !quantitySold || !unitPrice || !paymentMethod) {
    return response.badRequest("Required fields missing", res);
  }

  // Check if inventory item exists and has enough stock
  const inventoryItem = await Inventory.findOne({ _id: inventoryId, companyId });
  if (!inventoryItem) {
    return response.notFound("Inventory item not found", res);
  }

  if (inventoryItem.quantity < quantitySold) {
    return response.badRequest("Insufficient stock available", res);
  }

  const totalAmount = quantitySold * unitPrice;

  const newSale = await Sales.create({
    companyId,
    inventoryId,
    customerName,
    customerEmail,
    customerPhone,
    quantitySold: Number(quantitySold),
    unitPrice: Number(unitPrice),
    totalAmount,
    paymentMethod,
    paymentStatus: paymentStatus || 'completed',
    transactionId,
    notes,
    paymentReceivedBy,
    saleDate: req.body.saleDate || new Date()
  });

  // Update inventory quantity
  inventoryItem.quantity -= Number(quantitySold);
  inventoryItem.status = inventoryItem.quantity > 10 ? 'in_stock' : inventoryItem.quantity > 0 ? 'low_stock' : 'out_of_stock';
  await inventoryItem.save();

  // Populate the response with inventory details
  const populatedSale = await Sales.findById(newSale._id).populate('inventoryId', 'name sku price image');

  return response.success("Sale created successfully", populatedSale, res);
});

// Update a sale
exports.updateSale = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  const companyId = req.user._id;

  const sale = await Sales.findOne({ _id: saleId, companyId });
  if (!sale) {
    return response.notFound("Sale not found", res);
  }

  const { 
    customerName, 
    customerEmail, 
    customerPhone, 
    quantitySold, 
    unitPrice, 
    paymentMethod, 
    paymentStatus,
    transactionId,
    notes,
    paymentReceivedBy,
    status
  } = req.body;

  // If quantity is being changed, we need to adjust inventory
  if (quantitySold !== undefined && quantitySold !== sale.quantitySold) {
    const inventoryItem = await Inventory.findById(sale.inventoryId);
    if (!inventoryItem) {
      return response.notFound("Inventory item not found", res);
    }

    const quantityDifference = Number(quantitySold) - sale.quantitySold;
    
    if (inventoryItem.quantity + quantityDifference < 0) {
      return response.badRequest("Insufficient stock for this update", res);
    }

    inventoryItem.quantity += quantityDifference;
    inventoryItem.status = inventoryItem.quantity > 10 ? 'in_stock' : inventoryItem.quantity > 0 ? 'low_stock' : 'out_of_stock';
    await inventoryItem.save();
  }

  // Update sale fields
  if (customerName) sale.customerName = customerName;
  if (customerEmail) sale.customerEmail = customerEmail;
  if (customerPhone) sale.customerPhone = customerPhone;
  if (quantitySold !== undefined) sale.quantitySold = Number(quantitySold);
  if (unitPrice !== undefined) sale.unitPrice = Number(unitPrice);
  if (paymentMethod) sale.paymentMethod = paymentMethod;
  if (paymentStatus) sale.paymentStatus = paymentStatus;
  if (transactionId) sale.transactionId = transactionId;
  if (notes) sale.notes = notes;
  if (paymentReceivedBy) sale.paymentReceivedBy = paymentReceivedBy;
  if (status) sale.status = status;

  // Recalculate total amount
  sale.totalAmount = sale.quantitySold * sale.unitPrice;

  await sale.save();

  const updatedSale = await Sales.findById(sale._id).populate('inventoryId', 'name sku price image');
  return response.success("Sale updated successfully", updatedSale, res);
});

// Delete a sale (soft delete by changing status)
exports.deleteSale = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  const companyId = req.user._id;

  const sale = await Sales.findOne({ _id: saleId, companyId });
  if (!sale) {
    return response.notFound("Sale not found", res);
  }

  // Restore inventory quantity
  const inventoryItem = await Inventory.findById(sale.inventoryId);
  if (inventoryItem) {
    inventoryItem.quantity += sale.quantitySold;
    inventoryItem.status = inventoryItem.quantity > 10 ? 'in_stock' : inventoryItem.quantity > 0 ? 'low_stock' : 'out_of_stock';
    await inventoryItem.save();
  }

  // Soft delete by changing status
  sale.status = 'cancelled';
  await sale.save();

  return response.success("Sale cancelled successfully", null, res);
});

// Get sale details
exports.getSaleDetails = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  const companyId = req.user._id;

  const sale = await Sales.findOne({ _id: saleId, companyId })
    .populate('inventoryId', 'name sku price image description category');

  if (!sale) {
    return response.notFound("Sale not found", res);
  }

  return response.success("Sale details fetched", sale, res);
});

// Get sales report with date range
exports.getSalesReport = asyncHandler(async (req, res) => {
  const companyId = req.user._id;
  const { startDate, endDate, format = 'detailed' } = req.query;

  if (!startDate || !endDate) {
    return response.badRequest("Start date and end date are required", res);
  }

  const matchQuery = {
    companyId: new mongoose.Types.ObjectId(companyId),
    status: 'active',
    saleDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (format === 'summary') {
    // Summary report
    const summary = await Sales.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          totalQuantitySold: { $sum: "$quantitySold" },
          averageSaleValue: { $avg: "$totalAmount" }
        }
      }
    ]);

    const paymentMethodBreakdown = await Sales.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          total: { $sum: "$totalAmount" }
        }
      }
    ]);

    return response.success("Sales report generated", {
      summary: summary[0] || { totalSales: 0, totalRevenue: 0, totalQuantitySold: 0, averageSaleValue: 0 },
      paymentMethodBreakdown
    }, res);
  } else {
    // Detailed report
    const sales = await Sales.find(matchQuery)
      .populate('inventoryId', 'name sku')
      .sort({ saleDate: -1 });

    return response.success("Sales report generated", sales, res);
  }
});
