// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // console.log('No token provided'); 
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }
    
     // Log the token to ensure it's being passed correctly
    //  console.log('Token received:', token);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Log decoded token to ensure it contains the user ID
    // console.log('Decoded token:', decoded);
    
    // Add user data to request
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};