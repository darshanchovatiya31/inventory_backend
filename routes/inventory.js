// Update routes/inventory.js
const express = require('express');
const { createInventory, getCompanyInventory, getDashboardInventory, getInventoryInfo, adjustInventory, updateInventory, deleteInventory, createStockAdjustment, getStockHistory } = require('../controllers/inventory/inventory');
const { companyAuthToken } = require('../middlewares/authenticator');
const inventoryUpload = require('../utils/inventoryUpload');
const router = express.Router();

router.post("/create/:companyId", companyAuthToken, inventoryUpload.single('image'), createInventory);
router.post("/adjust/:companyId", companyAuthToken, adjustInventory); // Keep existing, but we might deprecate or integrate
router.post("/adjustment", companyAuthToken, createStockAdjustment); // New route for adjustments
router.get("/history/:inventoryId", companyAuthToken, getStockHistory); // New route for history
router.put("/update/:inventoryId", companyAuthToken, inventoryUpload.single('image'), updateInventory);
router.delete("/delete/:inventoryId", companyAuthToken, deleteInventory);
router.get('/company-inventory', companyAuthToken, getCompanyInventory);
router.get('/dashboard/inventory/:companyId', companyAuthToken, getDashboardInventory);
router.get("/info", getInventoryInfo);

module.exports = router;