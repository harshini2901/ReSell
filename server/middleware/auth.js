const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware — verifies the Bearer JWT in the Authorization header.
 * On success, attaches `req.user` (the Mongoose User document).
 * On failure, responds with 401.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorised — no token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Not authorised — user not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorised — invalid or expired token' });
  }
};

module.exports = { protect };
