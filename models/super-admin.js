const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    emailId: { type: String, default: "" },
    password: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("super-admin", schema);
