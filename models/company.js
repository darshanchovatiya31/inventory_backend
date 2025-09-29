const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  name: { type: String, default:"" },
  logo: { type: String },
  email: { type: String, default:""},
  password: { type: String, default:"" },
  mobile: { type: String, default:"" },
  pname: { type: String, default:"" },
  address: { type: String, default:"" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Company", companySchema);
