const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const multer = require("multer");
const mixpanel = require('mixpanel');

const mixpanelToken = '1d3b3900e364420afd3d3f96c268d88e'
const mixpanelClient = mixpanel.init(mixpanelToken);





const router = express.Router();

const { SECRET = "secret" } = process.env;

// Signup route
router.post("/signup", async (req, res) => {
  try {
    // Hash the password before saving it to the database
    

    // Create a new user with the hashed password
    const newUser = new User({
      phone: req.body.phone,
      username: req.body.username,
      
    });

    // Save the new user to the database
    const savedUser = await newUser.save();

    // Sign a JWT token with the new user's id and username
    const token = jwt.sign(
      { id: savedUser._id, username: savedUser.username },
      SECRET
    );

    // Track the signup event in Mixpanel
    mixpanelClient.track('Signup on server received', {
      distinct_id: savedUser._id.toString(),
      phone: savedUser.phone,
      username: savedUser.username,
    });

    // Send the new user object and the token in the response
    res.json({ user: savedUser, token });
    
    
  } catch (error) {
    res.status(400).json({ error });
  }
});

// Get all users route
router.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Login route
router.post("/login", async (req, res) => {
  try {
    const { phone } = req.body;

    // Find the user with the given phone number
    const user = await User.findOne({ phone });

    // If the user doesn't exist, send an error response
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Track the login event in Mixpanel
    mixpanelClient.track("Login", {
      distinct_id: user._id.toString(),
      phone: user.phone,
      username: user.username,
    });

    // Set user properties in Mixpanel
    mixpanelClient.people.set(user._id.toString(), {
      $name: user.username,
      $phone: user.phone,
    });

    // Sign a JWT token with the user's id and username
    const token = jwt.sign({ id: user._id, username: user.phone }, SECRET);

    // Send the user object and the token in the response
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Me route (requires authorization)
router.get("/me", verifyToken, async (req, res) => {
  try {
    // Find the user with the id in the token
    const user = await User.findById(req.userId);

    // If the user doesn't exist, send an error response
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Send the user object in the response
    res.json({ user });
  } catch (error) {
    res.status(400).json({ error });
  }
});

// Middleware function to verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.userId = decoded.id;
    next();
  });
}

//configuring multer to save uploaded files in uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage })

const updateProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id; // Replace with the actual user ID from the request object
    const profilePicturePath = req.file.path;

    // Update the user's profile picture in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profile_picture: profilePicturePath },
      { new: true }
    );

    // Send a response with the updated user data
    res.status(200).json({
      message: 'Profile picture updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating the profile picture.' });
  }
};

router.put('settings', verifyToken, async (req, res) => {
  try {
    const {
      avatar,
      fullName,
      email,
      isPublic,
      isVerified,
      isAvailable,
    } = req.body;
const user = await User.findById(req.userId);

    // If the user doesn't exist, send an error response
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    //update user settings
    user.avatar = avatar || user.avatar;
    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.isPublic = isPublic || user.isPublic;
    user.isVerified = isVerified || user.isVerified;
    user.isAvailable = isAvailable || user.isAvailable;

    const updatedUser = await user.save();
    res.json({ user: updatedUser });
  } catch (error) {
    res.status(400).json({ error });
  }
});

    
  

module.exports = router;
