const express = require('express');
const { createInventory, getCompanyInventory, getDashboardInventory, getInventoryInfo, adjustInventory, updateInventory, deleteInventory } = require('../controllers/inventory/inventory');
const { companyAuthToken } = require('../middlewares/authenticator');
const inventoryUpload = require('../utils/inventoryUpload');
const router = express.Router();

router.post("/create/:companyId", companyAuthToken, inventoryUpload.single('image'), createInventory);
router.post("/adjust/:companyId", companyAuthToken, adjustInventory);
router.put("/update/:inventoryId", companyAuthToken, inventoryUpload.single('image'), updateInventory);
router.delete("/delete/:inventoryId", companyAuthToken, deleteInventory);
router.get('/company-inventory', companyAuthToken, getCompanyInventory);
router.get('/dashboard/inventory/:companyId', companyAuthToken, getDashboardInventory);
router.get("/info", getInventoryInfo);

module.exports = router;