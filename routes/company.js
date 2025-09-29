const express = require("express");
const router = express.Router();
const companyController = require("../controllers/super-admin/company");
const {superAdminAuthToken, companyAuthToken} = require("../middlewares/authenticator");
const upload = require("../utils/upload");
const { signInCompany, verifyCompany, companySlugInfo } = require("../controllers/company-admin/company-auth");

router.post("/login" , signInCompany)
router.get("/verify-company", companyAuthToken, verifyCompany);
router.get("/slug-info/:slug",companySlugInfo)

router.get("/company-info/:companyId",companyController.companyInfoVisit)

router.post("/create",superAdminAuthToken, upload.single("logo"), companyController.createCompany);
router.put("/update/:id",superAdminAuthToken, upload.single("logo"), companyController.updateCompany);
router.delete("/delete/:id", superAdminAuthToken, companyController.deleteCompany);
router.get("/getall",superAdminAuthToken , companyController.getAllCompany)

router.patch("/status/:companyId", superAdminAuthToken , companyController.updateStatus)

router.get("/dashboard/company",superAdminAuthToken, companyController.getDashboardCompany);

router.put("/profile/update/:id",companyAuthToken, upload.single("logo"), companyController.updateCompanyProfile);

router.put("/change-password/:id", companyAuthToken, companyController.UpdateCompanyPassword);


module.exports = router;
