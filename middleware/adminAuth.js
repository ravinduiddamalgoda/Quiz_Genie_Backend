// middleware/adminAuth.js
const User = require('../models/userModel');

module.exports = async (req, res, next) => {
  try {
    // Get user from database (we already have user.id from auth middleware)
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is an admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied, admin privileges required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};