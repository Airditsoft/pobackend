
const { userSchema } = require("../validation/validator");
const logger = require("../logger/logger");

const User = require("../models/user");
const Department = require("../models/department");
const Role = require("../models/role");


const userRegister = async (req, res) => {
  const { error } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map((detail) =>
      detail.message.replace(/['"]/g, "")
    );
    return res.status(400).json({ errors: errorMessages });
  }

  const { name, email, phonenumber, level } = req.body;

  try {
 
 
    const existingUser= await User.findOne({
      email: { $regex: new RegExp(email, "i") },
    });
 
    
    console.log("Looking for user with email:", existingUser);

    if (existingUser) {
      logger.error("User already registered.");
      return res.status(401).json({ message: "User Already Registered" });
    }

    const existingLevel = await User.findOne({ level: level });
    if (existingLevel) {
      return res.status(404).json({ message: "Level already Present" });
    }

    await User.create({
      name,
      email,
      phonenumber,
      level,
    });
    return res.status(201).json({ message: "User Successfully Registered" });
  } catch (error) {
    logger.error("Error creating user:", error);
    res.status(500).json({ message: error.message });
  }
};


const getuserProfile = async (req, res) => { 
  const { email } = req.authInfo;

  try {
    // Use `populate` to join Role and Department collections
    const user = await User.findOne({ email })
      .populate({ path: "department.depId", select: "type" }) // Populate Department
      .populate({ path: "role", select: "value" }); // Populate Role

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userProfile = {
      name: user.name,
      email: user.email,
      department: user.department.depId.type, // Access populated department type
      role: user.role.value, // Access populated role value
      level: user.department.level, // Level within the department
    };

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: error.message });
  }
};





module.exports = { userRegister, getuserProfile };
