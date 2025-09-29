const response = require("./../../utils/response");
const helpers = require("./../../utils/helpers");
const { decrypt, encrypt } = require("./../../utils/encryptor");
const asyncHandler = require("express-async-handler");
const models = require("./../../models/zindex");

exports.signIn = asyncHandler(async (req, res) => {
  const { emailId, password } = req.body;
  if(!emailId || !password){
    return response.forbidden("All Fields Are Required",res)
  }
  let user = await models.superAdmin.findOne({ emailId: emailId }).lean();
  if (!user) {
    return response.success("Invalid credentials!", null, res);
  }

  let encryptedText = user.password;
  let plainText = decrypt(encryptedText);
  if (plainText != password) {
    return response.success("Invalid credentials!", null, res);
  }

  let token = helpers.generateToken({ id: String(user._id) });
  return response.success("Admin login successfully!", {token,user}, res);
});

exports.signUp = asyncHandler(async (req, res) => {
  const { emailId, password } = req.body;
  if(!emailId || !password){
    return response.forbidden("All Fields Are Required",res)
  }
  let user = await models.superAdmin.findOne({ emailId: emailId }).lean();
  if (user) {
    return response.success("Account is already exists!", null, res);
  }

  let encryptedText = encrypt(password);
  let result = await models.superAdmin.create({
    emailId,
    password: encryptedText,
  });
  let token = helpers.generateToken({ id: String(result._id) });
  return response.success("Account created successfully!", token, res);
});


exports.verifyToken = asyncHandler(async (req, res) => {
  try {
   const userId = req.token.id;
  // Find the user
  const user = await models.superAdmin.findById(userId);
  if (!user) {
    return response.success("User not found!", null, res);
  }
  return response.success("User found!", user, res);
  } catch (error) {
    return response.forbidden("Invalid or expired token", res);
  }
});


// controller.js

exports.updateProfile = asyncHandler(async (req, res) => {
  const { emailId, password } = req.body;
  const { adminid } = req.params;

  if (!emailId || !password) {
    return response.forbidden("All fields are required", res);
  }

  const user = await models.superAdmin.findById(adminid);
  if (!user) {
    return response.success("User not found!", null, res);
  }

  const updatedFields = {
    emailId,
    password: encrypt(password),
  };

  const updatedAdmin = await models.superAdmin.findByIdAndUpdate(adminid, updatedFields, { new: true });

  if (!updatedAdmin) {
    return response.success("Failed to update profile.", null, res);
  }

  return response.success("Profile updated successfully!", updatedAdmin, res);
});
