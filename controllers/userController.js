const User = require('../models/userModel');

// Create User
const createUser = async (req, res) => {
        const { name, email, password } = req.body;
    
        if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
        }
    
        try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use" });
        }
    
        const newUser = new User({ name, email, password });
        await newUser.save();
    
        res.status(201).json({ message: "User created successfully", user: newUser });
        } catch (error) {
        res.status(500).json({ message: "Server error", error });
        }
    };
  
// Login
  const loginUser = async (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
  
    try {
      const user = await User.findOne({ email });
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
  
      res.status(200).json({ message: "Login successful", user });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  };
  
  module.exports = { createUser, loginUser };