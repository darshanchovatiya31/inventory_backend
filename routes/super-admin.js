const express = require("express");
const router = express.Router();

//Controllers
let authCtrl = require("./../controllers/super-admin/authentication");
const { superAdminAuthToken } = require("../middlewares/authenticator");

// localhost:3000/super-admin/signIn
router.post("/signIn", authCtrl.signIn);

// localhost:3000/super-admin/signUp
// router.post("/signUp", authCtrl.signUp);

router.get("/verify-token", superAdminAuthToken, authCtrl.verifyToken);

router.put("/update-profile/:adminid", superAdminAuthToken,authCtrl.updateProfile);

module.exports = router;
