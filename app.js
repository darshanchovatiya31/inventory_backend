const path = require("path");

const dotenv = require("dotenv");
const envPath = path.resolve(process.cwd(),`.env${process.env.NODE_ENV != null ? `.${process.env.NODE_ENV}` : ""}`);
dotenv.config({ path: envPath });
require("./config/database");

const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

require("./routes/zindex").forEach((e) => app.use(e.path, e.file));

app.use((err, req, res, next) => {
  const statusCode =res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  let result = {
    message: err.message || "Internal Server Error",
    status: statusCode,
    data: null,
  };

  //Add Stacktrace in development mode only
  if (process.env.NODE_ENV == "dev") {
    result.stack = err.stack;
  }

  res.status(statusCode).json(result);
});

module.exports = app;
