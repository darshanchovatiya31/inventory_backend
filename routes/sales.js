const express = require('express');
const { 
  getCompanySales, 
  getSalesDashboard, 
  createSale, 
  updateSale, 
  deleteSale, 
  getSaleDetails,
  getSalesReport
} = require('../controllers/sales/sales');
const { companyAuthToken } = require('../middlewares/authenticator');
const router = express.Router();

// All routes require company authentication
router.use(companyAuthToken);

// Sales CRUD operations
router.post("/create/:companyId", createSale);
router.get('/company-sales', getCompanySales);
router.get('/dashboard/sales/:companyId', getSalesDashboard);
router.get('/details/:saleId', getSaleDetails);
router.put("/update/:saleId", updateSale);
router.delete("/delete/:saleId", deleteSale);

// Reports
router.get('/report', getSalesReport);

module.exports = router;
