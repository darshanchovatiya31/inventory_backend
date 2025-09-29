const jwt = require("jsonwebtoken");
const response = require("../utils/response");
const models = require("../models/zindex");

exports.superAdminAuthToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return response.unauthorized(res);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await models.superAdmin.findById(decoded.id).lean();

    if (!admin) {
      return response.unauthorized(res);
    }

    req.token = decoded;
    req.user = admin;
    next();
  } catch (err) {
    
    console.error("Auth error:", err.message);
    return response.forbidden("Invalid or expired token", res);
  }
};


exports.companyAuthToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return response.unauthorized(res);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const company = await models.company.findById(decoded.id).lean();
    if (!company) return response.unauthorized(res);
    if (!company.isActive) {
      return response.forbidden("Your account is not activated yet!", res);
    }

    req.token = decoded;
    req.user = company;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return response.forbidden("Invalid or expired token", res);
  }
};


